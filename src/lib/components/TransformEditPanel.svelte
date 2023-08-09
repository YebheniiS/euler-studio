<script lang="ts">
	import { createEventDispatcher } from 'svelte';
	import { Tool } from '$lib/utils/enum';

	export let shape;
	export let selectedTool: Tool;

	const dispatch = createEventDispatcher();

	let xInput, yInput, rotationInput, scaleInput;

	const updateTransform = () => {
		const x = xInput.valueAsNumber;
		const y = yInput.valueAsNumber;
		const rotation = rotationInput.valueAsNumber;
		const scale = scaleInput.valueAsNumber;

		if ([x, y, rotation, scale].some(isNaN)) {
			return;
		}

		dispatch('updateTransform', {
			position: [x, y, 0],
			rotation: (rotation * Math.PI) / 180,
			scale: scale
		});
	};
</script>

<div>
	<div>
		<label for="x-position">position:</label>
		<input
			bind:this={xInput}
			id="x-position"
			class="w-16 ml-2 input input-bordered"
			type="number"
			step="0.1"
			on:input={updateTransform}
			value={shape.position.x.toFixed(1)}
		/>
		<input
			bind:this={yInput}
			id="y-position"
			class="w-16 input input-bordered"
			type="number"
			step="0.1"
			on:input={updateTransform}
			value={shape.position.y.toFixed(1)}
		/>
	</div>
	<div class="my-1" />
	<div>
		<label for="rotation">rotation:</label>
		<input
			bind:this={rotationInput}
			id="rotation"
			class="w-16 ml-2 input input-bordered"
			type="number"
			step="1"
			on:input={updateTransform}
			value={Math.round((shape.rotation.z / Math.PI) * 180)}
		/>
	</div>
	<div class="my-1" />
	<div>
		<label for="scale">scale:</label>
		<input
			bind:this={scaleInput}
			id="scale"
			class="w-16 ml-2 input input-bordered"
			type="number"
			step="0.1"
			on:input={updateTransform}
			value={shape.scale.x.toFixed(1)}
		/>
	</div>
	<button
		on:click={() => {
			if (selectedTool !== Tool.RotateAboutPoint) {
				dispatch('setSelectedTool', Tool.RotateAboutPoint);
			} else {
				dispatch('setSelectedTool', Tool.Select);
			}
		}}
		class="btn my-1"
		class:btn-active={selectedTool === Tool.RotateAboutPoint}
		>{selectedTool === Tool.RotateAboutPoint ? 'Finish' : 'Rotate about Point'}</button
	>
</div>

<!--
<button
	on:click={() => dispatch('setSelectedTool', Tool.ScaleAboutPoint)}
	class="btn mb-1"
	class:btn-active={selectedTool === Tool.ScaleAboutPoint}>Scale about Point</button
>
-->
<style>
	/* Chrome, Safari, Edge, Opera */
	input::-webkit-outer-spin-button,
	input::-webkit-inner-spin-button {
		text-align: center;
		-webkit-appearance: none;
		margin: 0;
	}

	/* Firefox */
	input[type='number'] {
		text-align: center;
		-moz-appearance: textfield;
	}
</style>
