<script>
	export let scene;
	export let selection;
	export let shapeToVariable;

	let hierarchy = [];
	let computeHierarchy = (shape) => {
		if (shape === null) {
			return [];
		}

		let ret = [];
		let currentShape = shape;
		while (currentShape !== scene) {
			ret.push(currentShape);
			currentShape = currentShape.parent;
		}
		ret.reverse();
		return ret;
	};

	$: if (scene !== undefined) {
		hierarchy = computeHierarchy(selection);
	}
</script>

<div class="flex">
	<div class="mr-2">scene</div>
	{#each hierarchy as shape}
		<div class="mr-2">> {shape.constructor.name.slice(1)}</div>
	{/each}
</div>
