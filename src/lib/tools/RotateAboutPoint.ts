import { Tool } from '$lib/tools/Tool';
import { PointCursor } from '$lib/tools/PointCursor';
import * as Geometry from '$lib/studio/geometry';
import type { CursorTool } from '$lib/tools/Tool';
import {
	clientToSceneCoordinates,
	clientToNdcCoordinates,
	getNearestCoordinate
} from '$lib/utils/canvasUtils';
import * as THREE from 'three';
import type { LayeredScene } from '$lib/LayeredScene';

class RotateAboutPointTool extends Tool {
	normalizedDeviceCoordinates: THREE.Vector2;
	raycaster: THREE.Raycaster;
	selectedShape: Geometry.Shape | null;
	cursor: THREE.Group | null;
	dragging: boolean;
	sceneCoordinates: THREE.Vector3;
	startTheta: number | null;
	rotationGroup: THREE.Group;
	selectedPoint: Geometry.Point | null;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		super(scene, camera, renderer);
		this.raycaster = new THREE.Raycaster();
		this.raycaster.params.Line.threshold = 0.1;
		this.normalizedDeviceCoordinates = new THREE.Vector2();
		this.selectedShape = null;
		this.cursor = null;
		this.dragging = false;
		this.sceneCoordinates = new THREE.Vector3();
		this.startTheta = null;
		this.rotationGroup = new THREE.Group();
		this.selectedPoint = null;
	}

	setSelectedObject(selectedShape: Geometry.Shape | null) {
		this.selectedShape = selectedShape;
	}

	getCursor(point: Geometry.Point) {
		if (this.selectedShape === null) {
			throw Error("Can't rotate about point while selectedShape === null");
		}
		const pointToShape = new THREE.Vector3().subVectors(
			this.selectedShape.position,
			point.position
		);
		const lineDist = pointToShape.length();
		const endPosition = new THREE.Vector3().copy(point.position);
		endPosition.x += lineDist;

		const cursor = new THREE.Group();
		cursor.add(
			new Geometry.Point(point.position, {
				strokeColor: new THREE.Color(0x0000ff),
				fillColor: new THREE.Color(0x0000ff)
			})
		);
		cursor.add(
			new Geometry.Point(endPosition, {
				strokeColor: new THREE.Color(0x0000ff),
				fillColor: new THREE.Color(0x0000ff)
			})
		);
		cursor.add(
			new Geometry.Line(point.position, endPosition, {
				strokeColor: new THREE.Color(0x0000ff)
			})
		);

		cursor.position.copy(point.position);
		const shift = new THREE.Vector3().copy(cursor.position).multiplyScalar(-1);
		for (const child of cursor.children) {
			child.position.add(shift);
		}
		this.startTheta = Math.atan2(pointToShape.y, pointToShape.x);
		cursor.rotation.z = this.startTheta;

		return cursor;
	}

	mouseDown(clientCoordinates: THREE.Vector2): boolean {
		if (this.cursor === null && this.selectedShape !== null) {
			clientToNdcCoordinates(clientCoordinates, this.renderer, this.normalizedDeviceCoordinates);
			this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
			const intersects = this.raycaster.intersectObjects(this.scene.mainLayer.children);
			for (const intersect of intersects) {
				if (intersect.object.parent === null) {
					throw Error('Intersected a mesh has no parent');
				}
				const shape = intersect.object.parent;
				if (shape instanceof Geometry.Point) {
					this.selectedPoint = shape;
					break;
				}
			}
			if (this.selectedPoint === null) {
				return true;
			}

			this.cursor = this.getCursor(this.selectedPoint);
			this.scene.frontLayer.add(this.cursor);

			if (this.selectedShape.parent === null) {
				throw Error('this.selectedShape has no parent');
			}
			return false;
		} else {
			clientToNdcCoordinates(clientCoordinates, this.renderer, this.normalizedDeviceCoordinates);
			this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
			const intersects = this.raycaster.intersectObjects(this.scene.frontLayer.children);
			for (const intersect of intersects) {
				if (intersect.object.parent && intersect.object.parent.parent === this.cursor) {
					const pointToShape = new THREE.Vector3().subVectors(
						this.selectedShape.position,
						this.selectedPoint.position
					);
					this.startTheta = Math.atan2(pointToShape.y, pointToShape.x);

					const parent = this.selectedShape.parent;
					this.rotationGroup.position.copy(this.selectedPoint.position);
					this.selectedShape.position.add(
						new THREE.Vector3().copy(this.selectedPoint.position).multiplyScalar(-1)
					);
					this.rotationGroup.add(this.selectedShape);
					parent.add(this.rotationGroup);

					this.dragging = true;
					return false;
				}
			}
			return true;
		}
	}

	quit() {
		if (this.cursor !== null) {
			this.scene.frontLayer.remove(this.cursor);
			this.cursor.traverse((child) => {
				if (child instanceof THREE.BufferGeometry || child instanceof THREE.Material) {
					child.dispose();
				}
			});
			this.selectedShape = null;
			this.selectedPoint = null;
			this.cursor = null;
		}
	}

	mouseUp() {
		if (this.rotationGroup.children.length > 0) {
			this.rotationGroup.parent.add(this.selectedShape);
			this.rotationGroup.parent.remove(this.rotationGroup);
			this.selectedShape.applyMatrix4(this.rotationGroup.matrix);
			this.rotationGroup.position.set(0, 0, 0);
			this.rotationGroup.rotation.z = 0;
		}
		this.dragging = false;
	}

	mouseMove(clientCoordinates: THREE.Vector2) {
		if (this.dragging && this.cursor !== null) {
			clientToSceneCoordinates(
				clientCoordinates,
				this.renderer,
				this.camera,
				this.sceneCoordinates
			);
			const p = this.sceneCoordinates.sub(this.cursor.position);
			const theta = Math.atan2(p.y, p.x);
			this.cursor.rotation.z = theta;
			this.rotationGroup.rotation.z = theta - this.startTheta;
		}
	}

	mouseEnter() {
		this.scene.frontLayer.add(this.cursor);
	}

	mouseLeave() {
		this.scene.frontLayer.remove(this.cursor);
	}

	keyDown(event: KeyboardEvent) {
		this.cursor.keyDown(event);
	}

	keyUp(event: KeyboardEvent) {
		this.cursor.keyUp(event);
	}
}

export { RotateAboutPointTool };
