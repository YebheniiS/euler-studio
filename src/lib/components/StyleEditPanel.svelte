<script lang="ts">
	import * as Geometry from '$lib/studio/geometry';
	import { createEventDispatcher } from 'svelte';
	import ColorPicker from 'svelte-awesome-color-picker';
	import ColorInput from '$lib/components/ColorInput.svelte';

	export let shape: Geometry.Shape;

	let fillInput: HTMLInputElement;
	let strokeInput: HTMLInputElement;

	const updateStyle = (style) => {
		let { stroke, fill, fillColor, strokeColor } = style;
		if (fill !== undefined) {
			fill ? shape.addFill() : shape.removeFill();
			shape = shape;
		}
		if (fillColor !== undefined) {
			shape.fill.material.color.setRGB(
				fillColor.rgb.r / 255,
				fillColor.rgb.g / 255,
				fillColor.rgb.b / 255
			);
			shape.fill.material.opacity = fillColor.rgb.a;
		}

		if (stroke !== undefined) {
			stroke ? shape.addStroke() : shape.removeStroke();
			shape = shape;
		}
		if (strokeColor !== undefined) {
			shape.stroke.material.color.setRGB(
				strokeColor.rgb.r / 255,
				strokeColor.rgb.g / 255,
				strokeColor.rgb.b / 255
			);
			shape.stroke.material.opacity = strokeColor.rgb.a;
		}
	};

	let fillMaterial = shape.fill.material;
	let fillRgbObj = {
		r: fillMaterial.color.r * 255,
		g: fillMaterial.color.g * 255,
		b: fillMaterial.color.b * 255,
		a: fillMaterial.opacity
	};

	let strokeMaterial = shape.stroke.material;
	let strokeRgbObj = {
		r: strokeMaterial.color.r * 255,
		g: strokeMaterial.color.g * 255,
		b: strokeMaterial.color.b * 255,
		a: strokeMaterial.opacity
	};
</script>

{#if shape instanceof Geometry.Shape}
	<ColorPicker
		on:input={(e) => {
			updateStyle({ fillColor: e.detail });
		}}
		rgb={fillRgbObj}
		label="fill color:"
		components={{ input: ColorInput }}
	/>
	<div class="flex align-center justify-center">
		<label for="fill" class="mr-2">fill:</label>
		<input
			bind:this={fillInput}
			on:change={() => updateStyle({ fill: fillInput.checked })}
			id="fill"
			type="checkbox"
			checked={shape.fillVisible}
			class="checkbox"
		/>
	</div>
	<ColorPicker
		on:input={(e) => {
			updateStyle({ strokeColor: e.detail });
		}}
		rgb={strokeRgbObj}
		label="stroke color:"
		components={{ input: ColorInput }}
	/>
	<div class="flex align-center justify-center">
		<label for="stroke" class="mr-2">stroke:</label>
		<input
			bind:this={strokeInput}
			on:change={() => updateStyle({ stroke: strokeInput.checked })}
			id="stroke"
			type="checkbox"
			checked={shape.strokeVisible}
			class="checkbox"
		/>
	</div>
{/if}

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
