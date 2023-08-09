<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let distance: number;
	export let totalDistance: number;

	const dispatch = createEventDispatcher();
	// let snapToIntersections = true;
	let distanceInput: HTMLInputElement;
	let percentageInput: HTMLInputElement;

	const updateDistanceData = () => {
		dispatch('updatePointOnCurveCanvas', {
			distance: distanceInput.valueAsNumber
		});
	};
	const updatePercentageData = () => {
		dispatch('updatePointOnCurveCanvas', {
			distance: (totalDistance * percentageInput.valueAsNumber) / 100
		});
	};

	const confirmPoint = () => {
		dispatch('confirmPointOnCurveCanvas');
	};
</script>

<div class="mb-1">
	<label for="distance-input">Length along Curve:</label>
	<input
		bind:this={distanceInput}
		id="distance-input"
		class="w-16 ml-2 input input-bordered"
		type="number"
		min="0"
		max={totalDistance}
		step="0.1"
		on:input={updateDistanceData}
		value={distance.toFixed(1)}
	/>
</div>
<div class="mb-1">
	<label for="percentage-input">Percentage along Curve:</label>
	<input
		bind:this={percentageInput}
		id="percentage-input"
		class="w-16 ml-2 input input-bordered"
		type="number"
		min="0"
		max="100"
		on:input={updatePercentageData}
		value={Math.round((distance / totalDistance) * 100)}
	/>
</div>
<button on:click={confirmPoint} class="btn mb-1">Confirm</button>

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
