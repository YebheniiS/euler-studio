<script lang="ts">
	import { TreeViewer } from 'svelte-tree-viewer';
	import { SOURCE } from '$lib/code/code';
	import { createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();
	let tree = [
		{
			desc: 'EulerStudio',
			child: SOURCE
		}
	];
	function onClickItem(val) {
		const result = SOURCE.find(({ key }) => key === val);
		dispatch('content', {
			value: result.data
		});
	}
</script>

<div style="width:250px;border-right: 1px solid gray;">
	<TreeViewer {tree} onSelectCallback={onClickItem} faIcon={false} />
</div>
