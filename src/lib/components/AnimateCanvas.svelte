<script lang="ts">
	import { onMount } from 'svelte';
	import { updateAnimation } from '$lib/utils/canvasUtils';
	import { setupCanvas } from '$lib/studio/utils';
	import * as THREE from 'three';

	export let widthDelta, animationSource;
	let canvas: HTMLCanvasElement,
		scene: THREE.Scene,
		camera: THREE.Camera,
		renderer: THREE.WebGLRenderer;

	$: animationSource && scene && updateAnimation(scene, camera, renderer, animationSource);

	onMount(() => {
		scene = new THREE.Scene();
		[camera, renderer] = setupCanvas(canvas, 300);
		renderer.setPixelRatio(window.devicePixelRatio);
	});
</script>

<div class="flex justify-center items-center grow bg-base-100" style="width: 0">
	<canvas bind:this={canvas} style="border: 1.5px solid black" />
</div>
