<script>
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let shape;
	export let selectedCursor;
	export let pixelsToCoords;
	export let coordsToPixels;

	let handleWidthWheel = (event) => {
		let widthDelta = 0.2 * coordsToPixels;
		if (event.deltaY > 0) {
			widthDelta *= -1;
		}
		shape.width += widthDelta;
		dispatch('updateIndicator');
	};

	let handleHeightWheel = (event) => {
		let heightDelta = 0.1 * coordsToPixels;
		if (event.deltaY > 0) {
			heightDelta *= -1;
		}
		shape.height += heightDelta;
		dispatch('updateIndicator');
	};
</script>

<div>
	<div class="font-bold">Rectangle</div>
	<div on:wheel={handleWidthWheel}>Width: {(shape.width * pixelsToCoords).toFixed(2)}</div>
	<div on:wheel={handleHeightWheel}>Height: {(shape.height * pixelsToCoords).toFixed(2)}</div>
</div>
