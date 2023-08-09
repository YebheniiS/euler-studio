<script lang="ts">
	import * as THREE from 'three';
	import DrawCanvas from '$lib/components/DrawCanvas.svelte';
	import type * as Geometry from '$lib/studio/geometry';
	import { Tool } from '$lib/utils/enum';
	import ToolTab from '$lib/components/ToolTab.svelte';
	import SceneGraph from '$lib/components/SceneGraph.svelte';
	import Gallery from '$lib/components/Gallery.svelte';
	import type { User } from 'firebase/auth';
	import { LayeredScene } from '$lib/LayeredScene';

	export let user: User;

	let sketchTitle = 'Untitled sketch';
	let titleInput: HTMLInputElement;
	let menuWidthDelta: number;
	$: menuWidthDelta = currentMenuWidthDelta + initialMenuWidthDelta;

	let initialMenuWidthDelta = 0,
		currentMenuWidthDelta = 0;
	let dragging = false,
		startX;
	const handleMouseDown = (event) => {
		dragging = true;
		startX = event.clientX;
	};

	const handleMouseMove = (event) => {
		if (!dragging) return;
		currentMenuWidthDelta = event.clientX - startX;
	};

	const handleMouseUp = (event) => {
		dragging = false;
		initialMenuWidthDelta += currentMenuWidthDelta;
		currentMenuWidthDelta = 0;
	};

	let scene = new LayeredScene();

	let selectedTool = Tool.Select;
	let drawCanvas;

	let selectedObject: Geometry.Shape | null = null;
	$: if (![Tool.Select, Tool.RotateAboutPoint].includes(selectedTool)) {
		selectedObject = null;
	}

	const updateTransform = (transform) => {
		let { position, rotation, scale } = transform;
		if (position === undefined && rotation === undefined && scale === undefined) {
			return;
		}
		if (position !== undefined) {
			selectedObject.position.set(...position);
		}
		if (rotation !== undefined) {
			selectedObject.rotation.z = rotation;
		}
		if (scale !== undefined) {
			selectedObject.scale.x = scale;
			selectedObject.scale.y = scale;
		}
		selectedObject = selectedObject;
		drawCanvas.updateSelectCursor();
	};

	const addAndSelect = (object) => {
		scene.mainLayer.add(object);
		handleObjectSelect(object);
		scene.mainLayer.children = scene.mainLayer.children;
	};

	export const getSelectedObject = () => {
		return selectedObject;
	};

	export const handleObjectSelect = (object) => {
		selectedTool = Tool.Select;
		selectedObject = object;
	};

	const deleteSelectedObject = () => {
		if (selectedObject === null) {
			return;
		}
		scene.mainLayer.remove(selectedObject);
		selectedObject.traverse((child) => {
			if (child instanceof THREE.BufferGeometry || child instanceof THREE.Material) {
				child.dispose();
			}
		});
		selectedObject = null;
		scene.mainLayer.children = scene.mainLayer.children;
	};

	const copySelectedObject = () => {
		const copy = selectedObject.clone();
		copy.position.set(0, 0, 0);
		copy.rotation.set(0, 0, 0);
		addAndSelect(copy);
	};

	const updateAttributes = (attributes) => {
		const newObject = new selectedObject.constructor(...attributes, {
			fill: selectedObject.fillVisible
		});

		THREE.Object3D.prototype.copy.call(newObject, selectedObject, false);
		selectedObject.copy(newObject);

		drawCanvas.updateSelectCursor();
		selectedObject = selectedObject;
	};

	let pointOnCurveDistance: number | null = null;
	let pointOnCurveTotalDistance: number | null = null;
	const updatePointOnCurvePanelData = (data: { distance: number; totalDistance: number }) => {
		pointOnCurveDistance = data.distance;
		pointOnCurveTotalDistance = data.totalDistance;
	};
	const updatePointOnCurveCanvasData = (data: { distance: number }) => {
		drawCanvas.updatePointOnCurve(data.distance);
	};

	type Tab = 'Tools' | 'Scene' | 'Gallery';
	let selectedTab: Tab = 'Tools';

	let updateChildrenOrder = (source: number, destination: number) => {
		let children = scene.mainLayer.children;
		source = children.length - source - 1;
		destination = children.length - destination - 1;

		let temp = children[destination];
		children[destination] = children[source];
		children[source] = temp;

		scene.mainLayer.children = scene.mainLayer.children;
	};
</script>

<div class="flex h-full" on:mousemove={handleMouseMove} on:mouseup={handleMouseUp}>
	<div class="pl-2" style="flex-basis: {350 + menuWidthDelta}px">
		<div class="mb-2 mt-3">
			<input
				value={sketchTitle}
				bind:this={titleInput}
				on:blur={() => {
					let newTitle = titleInput.value;
					if (newTitle.length > 0) {
						sketchTitle = newTitle;
					} else {
						titleInput.value = sketchTitle;
					}
				}}
				on:keypress={(e) => {
					if (e.key === 'Enter') {
						titleInput.blur();
					}
				}}
				class="normal-case text-xl text-center"
			/>
		</div>
		<div class="tabs flex justify-center mb-5">
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="tab tab-bordered"
				class:tab-active={selectedTab === 'Tools'}
				on:click={() => {
					selectedTab = 'Tools';
				}}
			>
				Tools
			</div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="tab tab-bordered"
				class:tab-active={selectedTab === 'Scene'}
				on:click={() => {
					selectedTab = 'Scene';
				}}
			>
				Scene
			</div>
			<!-- svelte-ignore a11y-click-events-have-key-events -->
			<div
				class="tab tab-bordered"
				class:tab-active={selectedTab === 'Gallery'}
				on:click={() => {
					selectedTab = 'Gallery';
				}}
			>
				Gallery
			</div>
		</div>
		{#if selectedTab === 'Tools'}
			<ToolTab
				{selectedTool}
				{selectedObject}
				{pointOnCurveDistance}
				{pointOnCurveTotalDistance}
				on:setSelectedTool={(e) => {
					selectedTool = e.detail;
				}}
				on:addAndSelect={(e) => {
					addAndSelect(e.detail);
				}}
				on:deleteSelectedObject={deleteSelectedObject}
				on:copySelectedObject={copySelectedObject}
				on:updateAttributes={(e) => updateAttributes(e.detail.attributes)}
				on:updateTransform={(e) => updateTransform(e.detail)}
				on:setSnapConfig={(e) => drawCanvas.setSnapConfig(e.detail)}
				on:updatePointOnCurveCanvasData={(e) => updatePointOnCurveCanvasData(e.detail)}
				on:confirmPointOnCurveCanvas={() => drawCanvas.confirmPointOnCurve()}
			/>
		{:else if selectedTab === 'Scene'}
			<SceneGraph
				children={scene.mainLayer.children}
				on:selectShape={(e) => handleObjectSelect(e.detail)}
				on:updateChildrenOrder={(e) => updateChildrenOrder(e.detail.source, e.detail.destination)}
			/>
		{:else if selectedTab === 'Gallery'}
			<Gallery
				{user}
				{scene}
				{sketchTitle}
				on:selectShape={(e) => handleObjectSelect(e.detail)}
				on:setTitle={(e) => {
					sketchTitle = e.detail;
				}}
			/>
		{/if}
	</div>
	<div
		on:mousedown={handleMouseDown}
		style="
      width: 10px;
      background-color: #bbbbbb;
    "
		class="mx-2"
	/>
	<DrawCanvas
		bind:this={drawCanvas}
		on:objectSelect={(event) => handleObjectSelect(event.detail.object)}
		on:updateTransform={(event) => updateTransform(event.detail)}
		on:updatePointOnCurvePanel={(event) => updatePointOnCurvePanelData(event.detail)}
		on:deleteSelectedObject={deleteSelectedObject}
		on:setSelectedTool={(e) => {
			selectedTool = e.detail;
		}}
		{scene}
		{selectedObject}
		{selectedTool}
		widthDelta={-menuWidthDelta}
	/>
</div>
