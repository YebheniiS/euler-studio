<script>
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	export let shape;
	export let selectedCursor;
	export let pixelsToCoords;
	export let coordsToPixels;

	const dispatch = createEventDispatcher();
</script>

<div>
	<div class="font-bold">Group</div>
	<div on:click={() => dispatch('addShape', { type: 'group' })}>Group</div>
	<div on:click={() => dispatch('addShape', { type: 'rectangle' })}>Rectangle</div>
	<div on:click={() => dispatch('addShape', { type: 'circle' })}>Circle</div>
</div>
