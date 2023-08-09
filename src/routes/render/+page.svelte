<script lang="ts">
	import { LayeredScene } from '$lib/LayeredScene';
	import {
		compileAnimationSource,
		updateRenderData,
		handleAnimations
	} from '$lib/utils/canvasUtils';
	import { setupCanvas } from '$lib/studio/utils';
	import { onMount } from 'svelte';
	import { EXAMPLE_1 } from '$lib/code/code';

	export let data;

	let scene: LayeredScene;
	let camera: THREE.Camera;
	let renderer: THREE.WebGLRenderer;
	let canvas: HTMLCanvasElement;
	let canvasDisplay = 'none';

	let renderData;
	let startTime: number | null = null;
	let previousCallTime: number | null = null;
	let time = 0;
	let currentAnimationIndex = 0;
	let deltaTime = 0;
	let elapsedTime = 0;

	const step = () => {
		[startTime, deltaTime, elapsedTime, previousCallTime] = updateRenderData(
			startTime,
			previousCallTime,
			time
		);
		time += 1000 / data.framerate;

		try {
			renderData.renderLoop(elapsedTime, deltaTime);
			currentAnimationIndex = handleAnimations(
				renderData.animations,
				currentAnimationIndex,
				deltaTime
			);
		} catch (err) {
			console.error('Error executing user animation: ', err);
			renderer.setAnimationLoop(null);
		}

		console.log(renderer.getContext());
		renderer.render(scene, camera);
	};

	onMount(async () => {
		scene = new LayeredScene();
		[camera, renderer] = setupCanvas(canvas, data.canvasResolution.height);
		renderer.setPixelRatio(window.devicePixelRatio);
		renderData = await compileAnimationSource(scene, camera, renderer, EXAMPLE_1);
		canvasDisplay = 'block';
	});
</script>

<svelte:window
	on:keydown={(e) => {
		if (e.key === 'Enter') {
			step();
		}
	}}
/>
<canvas bind:this={canvas} style="border: 1.5px solid black; display: {canvasDisplay}" />
