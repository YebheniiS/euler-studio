<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Tool } from '$lib/utils/enum';
	import * as Geometry from '$lib/studio/geometry';
	import EditPanel from '$lib/components/EditPanel.svelte';
	import SnapConfigPanel from '$lib/components/SnapConfigPanel.svelte';
	import PointOnCurvePanel from '$lib/components/PointOnCurvePanel.svelte';
	import { Text } from '$lib/studio/text';
	import TextModal from './TextModal.svelte';
	import { TextMode } from '$lib/utils/textUtils';

	export let selectedTool: Tool;
	export let selectedObject: Geometry.Shape | null;
	export let pointOnCurveDistance: number | null;
	export let pointOnCurveTotalDistance: number | null;

	const dispatch = createEventDispatcher();

	let textMode = TextMode.math;
	let modalCheckbox: HTMLInputElement;
</script>

{#if selectedObject === null}
	<div>
		<div class="mb-2">Tools</div>
		<button
			on:click={() => dispatch('setSelectedTool', Tool.Select)}
			class="btn mb-1"
			class:btn-active={selectedTool === Tool.Select}>Select</button
		>
		<div class="my-5" />

		<div class="mb-2">Shapes</div>
		<button on:click={() => dispatch('addAndSelect', new Geometry.Square(2))} class="btn mb-1"
			>Square</button
		>
		<button on:click={() => dispatch('addAndSelect', new Geometry.Rectangle(4, 2))} class="btn mb-1"
			>Rectangle</button
		>
		<button on:click={() => dispatch('addAndSelect', new Geometry.Arc(1))} class="btn mb-1"
			>Arc</button
		>
		<button on:click={() => dispatch('addAndSelect', new Geometry.Circle(1))} class="btn mb-1"
			>Circle</button
		>
		<button
			on:click={() => dispatch('setSelectedTool', Tool.Polygon)}
			class="btn mb-1"
			class:btn-active={selectedTool === Tool.Polygon}>Polygon</button
		>
		<div class="my-5" />

		<div class="mb-2">Geometry</div>
		<button
			on:click={() => dispatch('setSelectedTool', Tool.Line)}
			class="btn mb-1"
			class:btn-active={selectedTool === Tool.Line}>Line</button
		>
		<button
			on:click={() => dispatch('setSelectedTool', Tool.Point)}
			class="btn mb-1"
			class:btn-active={selectedTool === Tool.Point}>Point</button
		>
		<button
			on:click={() => dispatch('setSelectedTool', Tool.PointOnCurve)}
			class="btn mb-1"
			class:btn-active={selectedTool === Tool.PointOnCurve}>Point on Curve</button
		>
		<button
			on:click={() => dispatch('setSelectedTool', Tool.ShapeFromCurves)}
			class="btn mb-1"
			class:btn-active={selectedTool === Tool.ShapeFromCurves}>Shape from Curves</button
		>
		<div class="my-5" />

		<div class="mb-2">Text</div>
		<label
			on:click={(e) => {
				textMode = TextMode.math;
				modalCheckbox.checked = true;
			}}
			class="btn">Math</label
		>
		<label
			on:click={(e) => {
				textMode = TextMode.text;
				modalCheckbox.checked = true;
			}}
			class="btn">Text</label
		>
	</div>
{:else}
	<div class="my-5" />
	<EditPanel
		{selectedTool}
		shape={selectedObject}
		on:delete={() => dispatch('deleteSelectedObject')}
		on:copy={() => dispatch('copySelectedObject')}
		on:updateAttributes={(e) => dispatch('updateAttributes', e.detail)}
		on:updateTransform={(e) => dispatch('updateTransform', e.detail)}
		on:setSelectedTool={(e) => dispatch('setSelectedTool', e.detail)}
	/>
	{#if [Tool.Polygon, Tool.Line, Tool.Point].includes(selectedTool)}
		<SnapConfigPanel on:updateSnapConfig={(e) => dispatch('setSnapConfig', e.detail)} />
	{:else if pointOnCurveDistance !== null && pointOnCurveTotalDistance !== null}
		<PointOnCurvePanel
			distance={pointOnCurveDistance}
			totalDistance={pointOnCurveTotalDistance}
			on:updatePointOnCurveCanvas={(e) => dispatch('updatePointOnCurveCanvasData', e.detail)}
			on:confirmPointOnCurveCanvas={() => dispatch('confirmPointOnCurveCanvas')}
		/>
	{/if}
{/if}
<input bind:this={modalCheckbox} type="checkbox" id="text-modal" class="modal-toggle" />
<TextModal {textMode} on:insertTex={(e) => dispatch('addAndSelect', new Text(e.detail))} />
