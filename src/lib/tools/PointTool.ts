import { Tool } from '$lib/tools/Tool';
import { PointCursor } from '$lib/tools/PointCursor';
import * as Geometry from '$lib/studio/geometry';
import type { CursorTool } from '$lib/tools/Tool';

class PointTool extends Tool implements CursorTool {
	constructor(scene, camera, renderer) {
		super(scene, camera, renderer);
		this.cursor = new PointCursor(scene, camera, renderer);
	}

	mouseMove(clientCoordinates) {
		this.cursor.mouseMove(clientCoordinates);
	}

	mouseDown() {
		this.scene.mainLayer.add(new Geometry.Point(this.cursor.position));
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

export { PointTool };
