<script lang="ts">
	import type { LayeredScene } from '$lib/LayeredScene';
	import { createEventDispatcher } from 'svelte';
	import type * as Geometry from '$lib/studio/geometry.types';
	import DragVertical from 'svelte-material-icons/DragVertical.svelte';

	export let children: Array<Geometry.Shape>;
	let reverseChildren: Array<Geometry.Shape>;
	$: children, updateDragIndices();
	let updateDragIndices = () => {
		if (sourceDragIndex !== null && destinationDragIndex !== null) {
			sourceDragIndex = destinationDragIndex;
		}
		reverseChildren = [...children].reverse();
	};

	const dispatch = createEventDispatcher();

	let handleMouseDown = (shape: Geometry.Shape) => {
		dispatch('selectShape', shape);
	};

	let sourceDragIndex: number | null = null;
	let destinationDragIndex: number | null = null;
	let handleDragStart = (index: number) => {
		sourceDragIndex = index;
	};

	let handleDragOver = (e: DragEvent, index: number) => {
		e.preventDefault();
		if (sourceDragIndex !== null && sourceDragIndex !== index) {
			destinationDragIndex = index;
			dispatch('updateChildrenOrder', {
				source: sourceDragIndex,
				destination: destinationDragIndex
			});
		}
	};

	let handleDragEnd = () => {
		sourceDragIndex = null;
		destinationDragIndex = null;
	};
</script>

<svelte:window on:dragover={(e) => e.preventDefault()} />

<div>
	{#each reverseChildren as shape, i}
		<div
			on:mousedown={(e) => handleMouseDown(shape)}
			on:dragstart={(e) => handleDragStart(i)}
			on:dragend={(e) => handleDragEnd()}
			on:dragover={(e) => handleDragOver(e, i)}
			class="flex justify-between align-center pl-10 pr-4 py-2 border-b-2 first:border-t-2"
			draggable="true"
		>
			<span class="font-bold">{shape.constructor.name}</span>
			<DragVertical size="1.5em" />
		</div>
	{/each}
</div>
