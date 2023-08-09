<script lang="ts">
	import Delete from 'svelte-material-icons/Delete.svelte';
	import ContentCopy from 'svelte-material-icons/ContentCopy.svelte';
	import { createEventDispatcher } from 'svelte';
	import ShapeEditPanel from './ShapeEditPanel.svelte';
	import TransformEditPanel from './TransformEditPanel.svelte';
	import StyleEditPanel from './StyleEditPanel.svelte';
	import type * as Geometry from '$lib/studio/geometry';
	import { Tool } from '$lib/utils/enum';

	export let shape: Geometry.Shape;
	export let selectedTool: Tool;

	const dispatch = createEventDispatcher();
	let tab = 2;
</script>

<div class="flex justify-center">
	<div class="mb-2 tabs tabs-boxed">
		<!-- svelte-ignore a11y-missing-attribute -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			class="tab"
			class:tab-active={tab === 1}
			on:click={() => {
				tab = 1;
			}}>{shape.constructor.name}</a
		>
		<!-- svelte-ignore a11y-missing-attribute -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			class="tab"
			class:tab-active={tab === 2}
			on:click={() => {
				tab = 2;
			}}>Transform</a
		>
		<!-- svelte-ignore a11y-missing-attribute -->
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<a
			class="tab"
			class:tab-active={tab === 3}
			on:click={() => {
				tab = 3;
			}}>Style</a
		>
	</div>
</div>
{#if tab === 1}
	<ShapeEditPanel {shape} on:updateAttributes={(e) => dispatch('updateAttributes', e.detail)} />
{:else if tab === 2}
	<TransformEditPanel
		{shape}
		{selectedTool}
		on:setSelectedTool={(e) => dispatch('setSelectedTool', e.detail)}
		on:updateTransform={(e) => dispatch('updateTransform', e.detail)}
	/>
{:else}
	<StyleEditPanel {shape} />
{/if}
<div
	class="mt-2 btn text-content"
	on:click={() => {
		dispatch('delete');
	}}
>
	<Delete size="1.5em" />
</div>
<div
	class="btn text-content"
	on:click={() => {
		dispatch('copy');
	}}
>
	<ContentCopy size="1.5em" />
</div>
