import type * as THREE from 'three';
import type { LayeredScene } from '$lib/LayeredScene';
import type { PointCursor } from '$lib/tools/PointCursor';

class Tool {
	scene: LayeredScene;
	camera: THREE.Camera;
	renderer: THREE.WebGLRenderer;

	constructor(scene: LayeredScene, camera: THREE.Camera, renderer: THREE.WebGLRenderer) {
		this.scene = scene;
		this.camera = camera;
		this.renderer = renderer;
	}
}

interface CursorTool {
	cursor: PointCursor;
}

export { Tool };
export type { CursorTool };
