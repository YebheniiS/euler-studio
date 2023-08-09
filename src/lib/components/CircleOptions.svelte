<script>
	import { onMount } from 'svelte';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	export let shape;
	export let selectedCursor;
	export let pixelsToCoords;
	export let coordsToPixels;

	let handleRadiusWheel = (event) => {
		let radiusDelta = 0.1 * coordsToPixels;
		if (event.deltaY > 0) {
			radiusDelta *= -1;
		}
		shape.radius += radiusDelta;
		dispatch('updateIndicator');
	};
</script>

<div>
	<div class="font-bold">Circle</div>
	<div on:wheel={handleRadiusWheel}>Radius: {(shape.radius * pixelsToCoords).toFixed(2)}</div>
</div>
