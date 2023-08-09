import * as THREE from 'three';
import { Tool } from '$lib/tools/Tool';
import * as Geometry from '$lib/studio/geometry';
import { PointCursor } from '$lib/tools/PointCursor';
import type { LayeredScene } from '$lib/LayeredScene';
import type { CursorTool } from '$lib/tools/Tool';

class LineTool extends Tool implements CursorTool {
	cursor: PointCursor;
	nearestCoordinate: THREE.Vector2;
	startPoint: Geometry.Point;
	line: Geometry.Line | null;
	distanceToPoint: THREE.Vector3;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		super(scene, camera, renderer);
		this.cursor = new PointCursor(scene, camera, renderer);
		this.nearestCoordinate = new THREE.Vector2();
		this.startPoint = new Geometry.Point(new THREE.Vector2());
		this.line = null;
		this.distanceToPoint = new THREE.Vector3();
	}

	mouseMove(clientCoordinates: THREE.Vector2) {
		this.cursor.mouseMove(clientCoordinates);

		if (this.line !== null) {
			const lineCenter = new THREE.Vector3()
				.addVectors(this.startPoint.position, this.cursor.position)
				.divideScalar(2);
			this.line.position.copy(lineCenter);

			const start = new THREE.Vector3().subVectors(this.startPoint.position, lineCenter);
			const end = new THREE.Vector3().subVectors(this.cursor.position, lineCenter);
			this.line.stroke.geometry.setPoints([start, end]);
		}
	}

	mouseDown() {
		if (this.line === null) {
			this.startPoint.position.copy(this.cursor.position);
			this.line = new Geometry.Line(this.startPoint.position, this.startPoint.position);
			this.scene.mainLayer.add(this.line, this.startPoint);
		} else {
			this.scene.mainLayer.remove(this.startPoint);
			this.line = null;
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

export { LineTool };
