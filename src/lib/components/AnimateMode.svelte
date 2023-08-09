<script lang="ts">
	import Editor from './Editor.svelte';
	import AnimateCanvas from './AnimateCanvas.svelte';
	import type { User } from 'firebase/auth';
	import FileTree from './FileTree.svelte';

	let animationSource;
	let editorWidthDelta;
	let editor;
	export let user: User | null | undefined;
	$: editorWidthDelta = currentEditorWidthDelta + initialEditorWidthDelta;

	let initialEditorWidthDelta = 0,
		currentEditorWidthDelta = 0;
	let dragging = false,
		startX;
	const handleMouseDown = (event) => {
		dragging = true;
		startX = event.clientX;
	};

	const handleMouseMove = (event) => {
		if (!dragging) return;
		currentEditorWidthDelta = event.clientX - startX;
	};

	const handleMouseUp = (event) => {
		dragging = false;
		initialEditorWidthDelta += currentEditorWidthDelta;
		currentEditorWidthDelta = 0;
	};

	const getText = () => {
		return editor.getText();
	};
	const setText = (event) => {
		editor.setText(event.detail.value);
	};
	export { getText };
</script>

<div class="flex h-full" on:mousemove={handleMouseMove} on:mouseup={handleMouseUp}>
	<div class="flex flex-row">
		<FileTree on:content={setText} />
		<div class="h-full" style="width: {550 + editorWidthDelta}px">
			<Editor
				bind:this={editor}
				{user}
				widthDelta={editorWidthDelta}
				on:changedCode={(event) => {
					animationSource = event.detail.code;
				}}
			/>
		</div>
	</div>
	<div
		style="
			position: relative;
            width: 16px;
			margin-left: -2px;
			margin-right: -2px;
      background-color: #ffffff"
	>
		<div
			on:mousedown={handleMouseDown}
			style="
			position: absolute;
			left: {16 - 11}px;
			width: 11px;
			height: 100%;
			background-color: #bbbbbb;
			cursor: col-resize;"
		/>
	</div>
	<AnimateCanvas widthDelta={-editorWidthDelta} {animationSource} />
</div>
