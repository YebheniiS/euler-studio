<script lang="ts">
	export let button: HTMLElement;
	export let hex: string;
	export let label: string;
	export let labelWrapper: HTMLLabelElement;
	export let isOpen: Boolean;
</script>

<label bind:this={labelWrapper}>
	<div class="mb-1 flex align-center justify-center" id="colorInput">
		<span class="mr-2">{label}</span>
		<span bind:this={button} class="btn btn-square btn-xs" style="background-color: {hex};" />
	</div>
</label>
