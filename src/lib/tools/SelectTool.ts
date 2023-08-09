import * as THREE from 'three';
import {
	clientToSceneCoordinates,
	clientToNdcCoordinates,
	getNearestCoordinate
} from '$lib/utils/canvasUtils';
import * as Geometry from '$lib/studio/geometry';
import * as Text from '$lib/studio/text';
import { Tool } from './Tool';

class SelectTool extends Tool {
	constructor(scene, camera, renderer) {
		super(scene, camera, renderer);
		this.selectedObject = null;
		this.cursor = null;
		this.objectClicked = false;
		this.sceneCoordinates = new THREE.Vector2();
		this.normalizedDeviceCoordinates = new THREE.Vector2();
		this.raycaster = new THREE.Raycaster();
		this.raycaster.params.Line.threshold = 0.1;
		this.dragDisplacement = new THREE.Vector2();
		this.newPosition = new THREE.Vector3();
		this.initialClickLocation = new THREE.Vector2();
		this.initialPosition = new THREE.Vector2();

		this.selectedObjectCenter = new THREE.Vector3();
		this.initialAngle = null;
		this.rotatorClicked = false;
		this.initialRotation = 0;

		this.initialDistance = null;
		this.scalerClicked = false;
	}

	#getCursor(width, height) {
		const cursor = new THREE.Group();
		cursor.add(
			new Geometry.Rectangle(width, height, {
				strokeColor: new THREE.Color(0x0000ff),
				fill: false
			})
		);

		const stemLength = 0.32;
		const stem = new Geometry.Line(
			new THREE.Vector3(0, height / 2, 0),
			new THREE.Vector3(0, height / 2 + stemLength, 0),
			{ strokeColor: new THREE.Color(0x0000ff) }
		);
		cursor.add(stem);

		const rotatorRadius = 0.11;
		const rotator = new Geometry.Circle(rotatorRadius, {
			fillColor: new THREE.Color(0x0000ff),
			fill: true,
			stroke: false
		});
		rotator.position.y += height / 2 + stemLength + rotatorRadius / 2;
		cursor.add(rotator);

		const tipHeight = (rotatorRadius * 3) / 2;
		const getTip = (x, y, rotation) => {
			const tip = new Geometry.Polygon(
				[
					new THREE.Vector3(-tipHeight, -tipHeight / 2, 0),
					new THREE.Vector3(0, tipHeight / 2, 0),
					new THREE.Vector3(tipHeight, -tipHeight / 2, 0),
					new THREE.Vector3(-tipHeight, -tipHeight / 2, 0)
				],
				{
					fillColor: new THREE.Color(0x0000ff),
					fill: true,
					stroke: false
				}
			);
			tip.position.x = x;
			tip.position.y = y;
			tip.rotation.z = rotation;
			return tip;
		};

		cursor.add(getTip(0, height / 2 + tipHeight / 2, 0));
		cursor.add(getTip(-width / 2 - tipHeight / 2, 0, Math.PI / 2));
		cursor.add(getTip(0, -height / 2 - tipHeight / 2, Math.PI));
		cursor.add(getTip(width / 2 + tipHeight / 2, 0, (3 * Math.PI) / 2));

		let diagonalArrows = new THREE.Group();
		diagonalArrows.add(getTip(-width / 2 - tipHeight / 2, height / 2 + tipHeight / 2, Math.PI / 4));
		diagonalArrows.add(
			getTip(-width / 2 - tipHeight / 2, -height / 2 - tipHeight / 2, Math.PI / 2 + Math.PI / 4)
		);
		diagonalArrows.add(
			getTip(width / 2 + tipHeight / 2, -height / 2 - tipHeight / 2, Math.PI + Math.PI / 4)
		);
		diagonalArrows.add(
			getTip(width / 2 + tipHeight / 2, height / 2 + tipHeight / 2, (3 * Math.PI) / 2 + Math.PI / 4)
		);
		cursor.add(diagonalArrows);
		cursor.diagonalArrows = diagonalArrows;

		return cursor;
	}

	#setSelectionCursor() {
		if (this.selectedObject === null) {
			return null;
		}

		const originalRotation = this.selectedObject.rotation.z;
		this.selectedObject.rotation.z = 0;

		const dimensions = this.selectedObject.getDimensions();
		this.cursor = this.#getCursor(dimensions.x + 0.4, dimensions.y + 0.4);

		this.selectedObject.rotation.z = originalRotation;

		this.cursor.position.copy(this.selectedObject.position);
		this.cursor.rotation.copy(this.selectedObject.rotation);
	}

	setSelectedObject(object) {
		this.selectedObject = object;

		if (this.cursor !== null) {
			this.scene.frontLayer.remove(this.cursor);
			this.cursor.traverse((obj) => {
				if (obj.constructor.name === 'Shape') {
					obj.dispose();
				}
			});
			this.cursor = null;
		}

		if (this.selectedObject !== null) {
			this.#setSelectionCursor();
			this.scene.frontLayer.add(this.cursor);
		}
	}

	mouseMove(clientCoordinates) {
		if (this.selectedObject !== null && this.objectClicked) {
			clientToSceneCoordinates(
				clientCoordinates,
				this.renderer,
				this.camera,
				this.sceneCoordinates
			);
			this.dragDisplacement.subVectors(this.sceneCoordinates, this.initialClickLocation);
			getNearestCoordinate(this.dragDisplacement, this.dragDisplacement, 0.1);
			this.newPosition.set(
				this.initialPosition.x + this.dragDisplacement.x,
				this.initialPosition.y + this.dragDisplacement.y,
				0
			);
			if (!this.selectedObject.position.equals(this.newPosition)) {
				return { position: this.newPosition };
			}
		} else if (this.selectedObject !== null && this.rotatorClicked) {
			clientToSceneCoordinates(
				clientCoordinates,
				this.renderer,
				this.camera,
				this.sceneCoordinates
			);
			const angle = new THREE.Vector2(
				this.sceneCoordinates.x - this.selectedObjectCenter.x,
				this.sceneCoordinates.y - this.selectedObjectCenter.y
			).angle();

			let newAngleRaw = this.initialRotation + angle - this.initialAngle;
			let newAngle;
			if (newAngleRaw === 0) {
				newAngle = 0;
			} else {
				let degrees = Math.round((newAngleRaw / Math.PI) * 180);
				if (degrees === 0) {
					newAngle = 0;
				} else {
					newAngle = (degrees * Math.PI) / 180;
				}
			}

			return { rotation: newAngle };
		} else if (this.selectedObject !== null && this.scalerClicked) {
			clientToSceneCoordinates(
				clientCoordinates,
				this.renderer,
				this.camera,
				this.sceneCoordinates
			);

			const distance = new THREE.Vector2(
				this.sceneCoordinates.x - this.selectedObjectCenter.x,
				this.sceneCoordinates.y - this.selectedObjectCenter.y
			).length();

			let rawScale = (distance / this.initialDistance) * this.initialScale;

			return { scale: Math.round(rawScale * 10) / 10 };
		}
		return {};
	}

	mouseDown(clientCoordinates) {
		clientToNdcCoordinates(clientCoordinates, this.renderer, this.normalizedDeviceCoordinates);
		this.raycaster.setFromCamera(this.normalizedDeviceCoordinates, this.camera);
		let intersects = this.raycaster.intersectObjects(this.scene.frontLayer.children);
		for (let intersect of intersects) {
			let shape = intersect.object.parent;
			if (shape.constructor.name === 'Circle' && shape.parent === this.cursor) {
				clientToSceneCoordinates(
					clientCoordinates,
					this.renderer,
					this.camera,
					this.initialClickLocation
				);
				const box = new THREE.Box3();
				box.setFromObject(this.selectedObject);
				box.getCenter(this.selectedObjectCenter);

				this.initialClickLocation.x -= this.selectedObjectCenter.x;
				this.initialClickLocation.y -= this.selectedObjectCenter.y;

				this.initialAngle = this.initialClickLocation.angle();
				this.initialRotation = this.selectedObject.rotation.z;

				this.rotatorClicked = true;
				return this.selectedObject;
			} else if (shape.parent == this.cursor?.diagonalArrows) {
				clientToSceneCoordinates(
					clientCoordinates,
					this.renderer,
					this.camera,
					this.initialClickLocation
				);
				const box = new THREE.Box3();
				box.setFromObject(this.selectedObject);
				box.getCenter(this.selectedObjectCenter);

				this.initialClickLocation.x -= this.selectedObjectCenter.x;
				this.initialClickLocation.y -= this.selectedObjectCenter.y;
				this.initialDistance = this.initialClickLocation.length();

				this.initialScale = this.selectedObject.scale.x;

				this.scalerClicked = true;
				return this.selectedObject;
			}
		}

		intersects = this.raycaster.intersectObjects(this.scene.mainLayer.children);
		if (intersects.length === 0) {
			return null;
		}

		let newlySelected = intersects[intersects.length - 1].object;
		while (!(newlySelected instanceof Geometry.Shape) && !(newlySelected instanceof Text.Text)) {
			newlySelected = newlySelected.parent;
		}

		clientToSceneCoordinates(
			clientCoordinates,
			this.renderer,
			this.camera,
			this.initialClickLocation
		);
		this.dragDisplacement.set(0, 0);
		this.initialPosition.set(newlySelected.position.x, newlySelected.position.y);

		this.objectClicked = true;
		return newlySelected;
	}

	mouseUp() {
		this.objectClicked = false;
		this.rotatorClicked = false;
		this.scalerClicked = false;
	}

	quit() {
		this.setSelectedObject(null);
	}

	keyDown(event: KeyboardEvent) {
		return event.key === 'Backspace';
	}
}

export { SelectTool };
