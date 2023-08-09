<script>
	import { createEventDispatcher } from 'svelte';
	import { camelToLowerCase, camelToKebabCase } from '$lib/utils/panelUtils';

	export let shape;

	const inputs = {};
	const dispatch = createEventDispatcher();

	const updateAttributes = () => {
		const attributes = [];
		for (let { attribute, type } of shape.attributeData) {
			if (type === 'number') {
				attributes.push(inputs[attribute].valueAsNumber);
			} else if (type === 'angle') {
				attributes.push((inputs[attribute].valueAsNumber * Math.PI) / 180);
			} else if (type === 'boolean') {
				attributes.push(inputs[attribute].checked);
			} else {
				throw Error(`Unknown type ${type}`);
			}
		}
		dispatch('updateAttributes', { attributes });
	};
</script>

{#each shape.attributeData as { attribute, type }, i}
	{#if type === 'number'}
		<div class="mb-1">
			<label for={camelToKebabCase(attribute)}>{camelToLowerCase(attribute)}:</label>
			<input
				bind:this={inputs[attribute]}
				id={camelToKebabCase(attribute)}
				class="w-16 ml-2 input input-bordered"
				type="number"
				step="0.1"
				on:input={updateAttributes}
				value={shape[attribute].toFixed(1)}
			/>
		</div>
	{:else if type === 'angle'}
		<div class="mb-1">
			<label for={camelToKebabCase(attribute)}>{camelToLowerCase(attribute)}:</label>
			<input
				bind:this={inputs[attribute]}
				id={camelToKebabCase(attribute)}
				class="w-16 ml-2 input input-bordered"
				type="number"
				step="1"
				on:input={updateAttributes}
				value={Math.round((shape[attribute] * 180) / Math.PI)}
			/>
		</div>
	{:else if type === 'boolean'}
		<div class="flex justify-center mb-1">
			<label for={camelToKebabCase(attribute)}>{camelToLowerCase(attribute)}:</label>
			<input
				bind:this={inputs[attribute]}
				id={camelToKebabCase(attribute)}
				class="ml-2 checkbox"
				type="checkbox"
				on:input={updateAttributes}
				checked={shape[attribute]}
			/>
		</div>
	{/if}
{/each}

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
