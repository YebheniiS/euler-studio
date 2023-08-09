<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let snapToPoints = true;
	let snapToPointsCheckBox: HTMLInputElement;

	let snapToCurves = true;
	let snapToCurvesCheckBox: HTMLInputElement;

	let snapToIntersections = true;
	let snapToIntersectionsCheckBox: HTMLInputElement;
</script>

<div class="flex justify-center mb-1">
	<label for="snap-to-points">snap to points</label>
	<input
		bind:this={snapToPointsCheckBox}
		id="snap-to-points"
		class="ml-2 checkbox"
		type="checkbox"
		on:input={(e) => {
			dispatch('updateSnapConfig', {
				snap: 'points',
				value: snapToPointsCheckBox.checked
			});
		}}
		checked={snapToPoints}
	/>
</div>

<div class="flex justify-center mb-1">
	<label for="snap-to-curves">snap to curves</label>
	<input
		bind:this={snapToCurvesCheckBox}
		id="snap-to-curves"
		class="ml-2 checkbox"
		type="checkbox"
		on:input={(e) => {
			dispatch('updateSnapConfig', {
				snap: 'curves',
				value: snapToCurvesCheckBox.checked
			});
		}}
		checked={snapToCurves}
	/>
</div>

<div class="flex justify-center mb-1">
	<label for="snap-to-intersections">snap to intersections</label>
	<input
		bind:this={snapToIntersectionsCheckBox}
		id="snap-to-intersections"
		class="ml-2 checkbox"
		type="checkbox"
		on:input={(e) => {
			dispatch('updateSnapConfig', {
				snap: 'intersections',
				value: snapToIntersectionsCheckBox.checked
			});
		}}
		checked={snapToIntersections}
	/>
</div>
