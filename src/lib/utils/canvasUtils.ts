import * as THREE from 'three';
import { PIXELS_TO_COORDS } from '$lib/studio/constants';
import type { LayeredScene } from '$lib/LayeredScene';
import { SketchReader } from '$lib/SketchReader';
import * as Geometry from '$lib/studio/geometry';
import * as Animation from '$lib/studio/animation';
import { getFrameAttributes } from '$lib/studio/utils';
import { bundleModule } from '$lib/utils/bundle';

type RenderData = {
	renderLoop: (arg0: number) => void;
	animations: [Animation];
};

const getFrame = (aspectRatio = 16 / 9, height = 450) => {
	const frameConfig = getFrameAttributes(aspectRatio, height);
	const h = frameConfig.coordinateHeight;
	const w = frameConfig.coordinateWidth;

	return new Geometry.Rectangle(w, h, {
		strokeWidth: 3 * PIXELS_TO_COORDS,
		fill: false
	});
};

const getGrid = (canvasWidth, canvasHeight, frameConfig) => {
	let grid = new THREE.Group();

	const horizontalLine = (y, config) =>
		new Geometry.Line(
			new THREE.Vector3((-canvasWidth / 2) * PIXELS_TO_COORDS, y, 0),
			new THREE.Vector3((canvasWidth / 2) * PIXELS_TO_COORDS, y, 0),
			config
		);

	const verticalLine = (x, config) =>
		new Geometry.Line(
			new THREE.Vector3(x, (-canvasHeight / 2) * PIXELS_TO_COORDS, 0),
			new THREE.Vector3(x, (canvasHeight / 2) * PIXELS_TO_COORDS, 0),
			config
		);

	const addHorizontalLines = (spacing, config) => {
		let y = Math.floor(((canvasHeight / 2) * PIXELS_TO_COORDS) / spacing);
		for (let i = y; i >= -y; i -= spacing) {
			grid.add(horizontalLine(i, config));
		}
	};

	const addVerticalLines = (spacing, config) => {
		let x = Math.floor(((canvasWidth / 2) * PIXELS_TO_COORDS) / spacing);
		for (let i = x; i >= -x; i -= spacing) {
			grid.add(verticalLine(i, config));
		}
	};

	const gridlineColor = new THREE.Color('dimgray');
	const thickConfig = {
		color: gridlineColor,
		strokeWidth: 0.8 * PIXELS_TO_COORDS
	};
	const thinConfig = {
		color: gridlineColor,
		strokeWidth: 0.3 * PIXELS_TO_COORDS
	};

	addHorizontalLines(1, thickConfig);
	addHorizontalLines(1 / 5, thinConfig);

	addVerticalLines(1, thickConfig);
	addVerticalLines(1 / 5, thinConfig);

	return grid;
};

const handleAnimations = (animations, currentAnimationIndex, deltaTime) => {
	if (currentAnimationIndex >= animations.length) {
		return currentAnimationIndex;
	}

	let currentAnimation = animations[currentAnimationIndex];
	currentAnimation.update(deltaTime);
	if (!currentAnimation.finished) {
		return currentAnimationIndex;
	}

	currentAnimationIndex += 1;
	if (currentAnimationIndex >= animations.length) {
		return currentAnimationIndex;
	}

	let nextAnimation = animations[currentAnimationIndex];
	nextAnimation.update(currentAnimation.excessTime);
	return currentAnimationIndex;
};

const clientToNdcCoordinates = (clientCoordinates, renderer, output) => {
	output.set(
		(clientCoordinates.x / renderer.domElement.scrollWidth) * 2 - 1,
		-(clientCoordinates.y / renderer.domElement.scrollHeight) * 2 + 1,
		0
	);
};

const unprojectVector = new THREE.Vector3();
const ndcToSceneCoordinates = (pointer, camera, output) => {
	unprojectVector.set(pointer.x, pointer.y, 0);
	unprojectVector.unproject(camera);
	output.set(unprojectVector.x, unprojectVector.y);
};

const clientToSceneCoordinates = (
	clientCoordinates,
	renderer,
	camera,
	output = new THREE.Vector3()
) => {
	clientToNdcCoordinates(clientCoordinates, renderer, output);
	ndcToSceneCoordinates(output, camera, output);
};

const getNearestCoordinate = (coordinate, output, resolution = 0.2) => {
	output.set(
		Math.round(coordinate.x / resolution) * resolution,
		Math.round(coordinate.y / resolution) * resolution
	);
};

const compileAnimationSource = async (
	scene: LayeredScene,
	camera: THREE.Camera,
	renderer: THREE.Renderer,
	source: string
): Promise<RenderData> => {
	scene.mainLayer.clear();
	try {
		const unpack = (module) => {
			if ('default' in module) {
				for (let [key, value] of Object.entries(module.default)) {
					globalThis[key] = value;
				}
			} else {
				for (let [key, value] of Object.entries(module)) {
					globalThis[key] = value;
				}
			}
		};

		return await new Function(
			'THREE',
			'scene',
			'camera',
			'renderer',
			'unpack',
			'SketchReader',
			'Geometry',
			'Animation',
			`return (async () => {
				${source}

				return {
					renderLoop: typeof render !== 'undefined' ? render : null,
					animations: typeof animations !== 'undefined' ? animations : null,
				};
			})();`
		)(THREE, scene.mainLayer, camera, renderer, unpack, SketchReader, Geometry, Animation);
	} catch (err) {
		console.error('Encountered error: ', err);
		throw Error('Error executing user script');
	}
};

const updateRenderData = (startTime: number, previousCallTime: number, time: number) => {
	let deltaTime, elapsedTime;

	if (previousCallTime === null) {
		startTime = time;
		deltaTime = 0;
		elapsedTime = 0;
		previousCallTime = time;
	} else {
		deltaTime = time - previousCallTime;
		elapsedTime = time - startTime;
		previousCallTime = time;
	}

	return [startTime, deltaTime, elapsedTime, previousCallTime];
};

const playAnimation = (
	scene: THREE.Scene,
	camera: THREE.Camera,
	renderer: THREE.WebGLRenderer,
	userScene
) => {
	let previousCallTime: number | null = null;
	let startTime: number | null = null;
	let currentAnimationIndex = 0;
	let deltaTime = 0;
	let elapsedTime = 0;

	renderer.setAnimationLoop((time) => {
		[startTime, deltaTime, elapsedTime, previousCallTime] = updateRenderData(
			startTime,
			previousCallTime,
			time
		);

		try {
			userScene.render(elapsedTime, deltaTime);
			currentAnimationIndex = handleAnimations(
				userScene.animations,
				currentAnimationIndex,
				deltaTime
			);
		} catch (err) {
			console.error('Error executing user animation: ', err);
			renderer.setAnimationLoop(null);
		}

		renderer.render(scene, camera);
	});
};

const updateAnimation = async (
	scene: THREE.Scene,
	camera: THREE.Camera,
	renderer: THREE.WebGLRenderer,
	source: string
) => {
	const userModule = await bundleModule(source);
	const userScene = new userModule.default(scene, camera, renderer);
	userScene.reset();
	renderer.setAnimationLoop((time) => {
		userScene.tick(time);
		renderer.render(scene, camera);
	});
	// playAnimation(scene, camera, renderer, userScene);
};

export {
	updateRenderData,
	compileAnimationSource,
	playAnimation,
	updateAnimation,
	getFrameAttributes,
	getFrame,
	getGrid,
	handleAnimations,
	clientToNdcCoordinates,
	getNearestCoordinate,
	clientToSceneCoordinates,
	ndcToSceneCoordinates
};
