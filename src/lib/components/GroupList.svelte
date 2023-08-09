<script>
	import { createEventDispatcher } from 'svelte';

	export let scene;
	export let shapeToVariable;
	export let expandedMap;
	export let dragStartElement;

	const dispatch = createEventDispatcher();

	let handleDragStart = (event) => {
		event.dataTransfer.effectAllowed = 'move';
		dragStartElement = event.srcElement;
		dispatch('setDragStartElement', { element: event.srcElement });
	};

	let handleDragEnd = (event) => {
		dispatch('setDragStartElement', { element: null });
	};

	let handleDragOver = (event) => {
		event.preventDefault();
		return false;
	};

	let handleTopDividerDragEnter = (event, group) => {
		let fromElement = dragStartElement;
		let fromElementVariable = fromElement.getAttribute('variable');
		let fromShape;
		for (const [shape, variable] of shapeToVariable) {
			if (variable === fromElementVariable) {
				fromShape = shape;
				break;
			}
		}
		if (!fromShape) {
			console.error(`Element with variable ${fromElementVariable} has no associated shape.`);
			console.log(fromElement);
			return;
		}
		let parent = group.parent;
		if (fromShape.parent === group) {
			let groupIndex = parent.children.indexOf(group);
			if (groupIndex === -1) {
				console.error(`Can't remove ${group} from ${parent}.`);
			}
			group.remove(fromShape);
			parent.children.splice(groupIndex, 0, fromShape);
		} else {
			parent.remove(fromShape);
			group.children.splice(0, 0, fromShape);
		}
		scene.children = scene.children;
	};

	let handleBottomDividerDragEnter = (event, group) => {
		let fromElement = event.fromElement;
		let fromElementVariable = fromElement.getAttribute('variable');
		if (fromElementVariable === null) {
			return;
		}
		let fromShape;
		for (const [shape, variable] of shapeToVariable) {
			if (variable === fromElementVariable) {
				fromShape = shape;
				break;
			}
		}
		if (!fromShape) {
			console.error(`Element with variable ${fromElementVariable} has no associated shape.`);
			return;
		}
		let parent = group.parent;
		if (fromShape.parent === group) {
			let groupIndex = parent.children.indexOf(group);
			if (groupIndex === -1) {
				console.error(`Can't remove ${group} from ${parent}.`);
			}
			group.remove(fromShape);
			parent.children.splice(groupIndex + 1, 0, fromShape);
		} else {
			parent.remove(fromShape);
			group.add(fromShape);
		}
		scene.children = scene.children;
	};

	let handleDragEnter = (event) => {
		let fromElement = event.fromElement;
		if (fromElement === null) {
			return;
		}

		if (dragStartElement === null) {
			console.error('Called handleDragEnter with dragStartElement === null.');
			return;
		}
		let startElementVariable = dragStartElement.getAttribute('variable');
		let startShape;
		for (const [shape, variable] of shapeToVariable) {
			if (variable === startElementVariable) {
				startShape = shape;
				break;
			}
		}
		if (!startShape) {
			console.error(`Element ${dragStartElement} has no associated shape.`);
			return;
		}
		if (startShape.constructor.name === '_Group' && expandedMap.get(startElementVariable)) {
			return;
		}

		let toElement = event.srcElement;
		let toElementVariable = toElement.getAttribute('variable');
		let toShape;
		for (const [shape, variable] of shapeToVariable) {
			if (variable === toElementVariable) {
				toShape = shape;
				break;
			}
		}
		if (!toShape) {
			console.error(`Element ${toElement} has no associated shape.`);
			return;
		}
		if (toShape.constructor.name === '_Group' && expandedMap.get(toElementVariable)) {
			return;
		}

		let childrenVariables = [];
		for (let child of scene.children) {
			childrenVariables.push('.' + shapeToVariable.get(child));
		}
		let childrenItems = document.querySelectorAll(childrenVariables.join(','));

		let dragFromIndex = Array.prototype.indexOf.call(childrenItems, fromElement);
		if (dragFromIndex === -1) {
			return;
		}
		let dragToIndex = Array.prototype.indexOf.call(childrenItems, event.srcElement);

		let temp = scene.children[dragToIndex];
		scene.children[dragToIndex] = scene.children[dragFromIndex];
		scene.children[dragFromIndex] = temp;
	};

	let handleDragLeave = (event) => {};

	let handleDrop = (event) => {
		event.stopPropagation();
		return false;
	};

	let toggleExpanded = (shape) => {
		let variable = shapeToVariable.get(shape);
		if (expandedMap.get(variable)) {
			expandedMap.set(variable, false);
		} else {
			expandedMap.set(variable, true);
		}
		scene.children = scene.children;
	};
</script>

<div class="flex flex-col items-start">
	{#each scene?.children ? scene.children : [] as shape}
		<div class="flex flex-col items-start items-stretch w-full">
			{#if expandedMap.get(shapeToVariable.get(shape))}
				<div
					style="height:20px"
					class="group-divider"
					on:dragstart={handleDragStart}
					on:dragenter={(event) => handleTopDividerDragEnter(event, shape)}
					on:dragend={handleDragEnd}
				/>
			{/if}
			<div class="flex justify-between w-full">
				<div
					style={expandedMap.get(shapeToVariable.get(shape)) ? 'cursor: auto' : 'cursor: move'}
					draggable={expandedMap.get(shapeToVariable.get(shape)) ? 'false' : 'true'}
					class={'menu-item ' + shapeToVariable.get(shape)}
					variable={shapeToVariable.get(shape)}
					on:click={() => dispatch('select', { shape })}
					on:dragstart={handleDragStart}
					on:dragend={handleDragEnd}
					on:dragenter={handleDragEnter}
					on:dragleave={handleDragLeave}
					on:dragover={handleDragOver}
					on:drop={handleDrop}
				>
					{shape.constructor.name.slice(1)}
				</div>
				{#if shape?.constructor?.name === '_Group'}
					<div
						on:click={() => {
							toggleExpanded(shape);
						}}
					>
						{#if expandedMap.get(shapeToVariable.get(shape))}
							-
						{:else}
							+
						{/if}
					</div>
				{/if}
			</div>
			{#if expandedMap.get(shapeToVariable.get(shape))}
				<div class="pl-4 w-full">
					<svelte:self
						on:select={(event) => {
							dispatch('select', event.detail);
						}}
						on:setDragStartElement={(event) => {
							dispatch('setDragStartElement', event.detail);
						}}
						scene={shape}
						{expandedMap}
						{dragStartElement}
						{shapeToVariable}
					/>
					<div
						style="height:20px"
						class="group-divider"
						on:dragstart={handleDragStart}
						on:dragenter={(event) => handleBottomDividerDragEnter(event, shape)}
						on:dragend={handleDragEnd}
					/>
				</div>
			{/if}
		</div>
	{/each}
</div>
