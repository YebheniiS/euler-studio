<script>
	import Two from 'two.js';
	import RectangleOptions from './RectangleOptions.svelte';
	import CircleOptions from './CircleOptions.svelte';
	import GroupOptions from './GroupOptions.svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let shape;
	export let selectedCursor;
	export let pixelsToCoords;
	export let coordsToPixels;
	export let shapeToVariable;
</script>

<div>
	{#if shape.constructor.name === '_Rectangle'}
		<RectangleOptions
			on:updateIndicator={(_) => dispatch('updateIndicator')}
			{shape}
			{selectedCursor}
			{pixelsToCoords}
			{coordsToPixels}
		/>
	{:else if shape.constructor.name === '_Circle'}
		<CircleOptions
			on:updateIndicator={(_) => dispatch('updateIndicator')}
			{shape}
			{selectedCursor}
			{pixelsToCoords}
			{coordsToPixels}
		/>
	{:else if shape.constructor.name === '_Group'}
		<GroupOptions
			on:addShape={(event) => dispatch('addShape', event.detail)}
			on:updateIndicator={(_) => dispatch('updateIndicator')}
			{shape}
			{selectedCursor}
			{pixelsToCoords}
			{coordsToPixels}
		/>
	{:else}
		<div>idk</div>
	{/if}
</div>
