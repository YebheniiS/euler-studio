import * as THREE from 'three';
import { Tool } from '$lib/tools/Tool';
import * as Geometry from '$lib/studio/geometry';
import { PointCursor } from '$lib/tools/PointCursor';
import type { LayeredScene } from '$lib/LayeredScene';
import type { CursorTool } from '$lib/tools/Tool';

class PolygonTool extends Tool implements CursorTool {
	cursor: PointCursor;
	currentPoints: Array<Geometry.Point>;
	polygon: Geometry.Polygon | null;
	addIndex: number | null;
	line: Geometry.Line | null;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		super(scene, camera, renderer);
		this.cursor = new PointCursor(scene, camera, renderer);
		this.currentPoints = [];
		this.polygon = null;
		this.addIndex = null;
		this.line = null;
	}

	mouseDown() {
		const finished =
			this.currentPoints.length !== 0 &&
			this.currentPoints[0].position.x === this.cursor.position.x &&
			this.currentPoints[0].position.y === this.cursor.position.y;

		if (this.addIndex === -1) {
			this.addIndex = this.scene.mainLayer.children.length;
		}
		if (!finished) {
			const newPoint = new Geometry.Point(this.cursor.position);
			newPoint.position.z = 0.1;
			this.scene.mainLayer.add(newPoint);
			this.currentPoints.push(newPoint);
		} else {
			for (const point of this.currentPoints) {
				this.scene.mainLayer.remove(point);
			}
			this.currentPoints = [];
			this.polygon = null;
			this.addIndex = -1;
			this.line = null;
		}
	}

	mouseMove(clientCoordinates: THREE.Vector2) {
		this.cursor.mouseMove(clientCoordinates);

		const mousePosition = new THREE.Vector3(this.cursor.position.x, this.cursor.position.y, 0);
		if (this.line !== null) {
			this.scene.mainLayer.remove(this.line);
			this.line.dispose();
		}
		if (this.currentPoints.length === 1) {
			this.line = new Geometry.Line(this.currentPoints[0].position, mousePosition);
			this.scene.mainLayer.add(this.line);
		} else if (this.currentPoints.length >= 2) {
			if (this.polygon !== null) {
				this.scene.mainLayer.remove(this.polygon);
				this.polygon.dispose();
			}

			this.polygon = new Geometry.Polygon([
				...this.currentPoints.map((p) => new THREE.Vector3(p.position.x, p.position.y, 0)),
				mousePosition
			]);

			if (this.addIndex === null) {
				throw Error("PolygonTool.addIndex shouldn't be null");
			}
			this.scene.mainLayer.children.splice(this.addIndex, 0, this.polygon);
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

	quit() {
		for (const point of this.currentPoints) {
			this.scene.mainLayer.remove(point);
			point.dispose();
		}
		this.currentPoints = [];

		if (this.polygon !== null) {
			this.scene.mainLayer.remove(this.polygon);
			this.polygon.dispose();
		}
		this.polygon = null;

		if (this.line !== null) {
			this.scene.mainLayer.remove(this.line);
			this.line.dispose();
		}
		this.line = null;

		this.addIndex = -1;
	}
}

export { PolygonTool };
