<script lang="ts">
	import * as Geometry from '$lib/studio/geometry';
	import * as Text from '$lib/studio/text';
	import type { LayeredScene } from '$lib/LayeredScene';
	import ContentSave from 'svelte-material-icons/ContentSave.svelte';
	import Delete from 'svelte-material-icons/Delete.svelte';
	import Pencil from 'svelte-material-icons/Pencil.svelte';
	import DotsVertical from 'svelte-material-icons/DotsVertical.svelte';
	import { createEventDispatcher } from 'svelte';
	import { onMount } from 'svelte';
	import {
		getStorage,
		ref,
		uploadBytes,
		getBytes,
		listAll,
		type FirebaseStorage
	} from 'firebase/storage';
	import type { User } from 'firebase/auth';
	import protobuf from 'protobufjs';
	import ObjectProto from '../../proto/object.proto?raw';
	import SketchProto from '../../proto/sketch.proto?raw';
	import StructProto from '../../proto/google/protobuf/struct.proto?raw';

	export let scene: LayeredScene;
	export let sketchTitle: string;
	export let user: User;

	const dispatch = createEventDispatcher();
	let sketchData = [];
	let userDataContainer;
	let SketchMessage: protobuf.Type | undefined;
	let storage: FirebaseStorage;

	const messageObjectToShape = (messageObject) => {
		const json = {
			class: messageObject.class,
			attributes: structToAttributes(messageObject.attributes),
			style: messageObject.style,
			transform: messageObject.transform
		};
		return Geometry.shapeFromJson(json);
	};

	const shapeToPayload = (shape) => {
		return {
			class: shape.constructor.name,
			attributes: attributesToStruct(shape.getAttributes()),
			style: Geometry.Shape.styleToJson(shape.getStyle()),
			transform: shape.getTransform()
		};
	};

	const structToAttributes = (struct) => {
		let ret = {};
		for (let [k, v] of Object.entries(struct.fields)) {
			ret[k] = Object.values(v)[0];
		}
		return ret;
	};

	const attributesToStruct = (attributes) => {
		let ret = {};
		for (let [k, v] of Object.entries(attributes)) {
			if (v === null) {
				ret[k] = { nullValue: null };
				continue;
			} else if (Array.isArray(v)) {
				ret[k] = { listValue: v };
				continue;
			}

			const valueType = typeof v;
			switch (valueType) {
				case 'number':
					ret[k] = { numberValue: v };
					break;
				case 'string':
					ret[k] = { stringValue: v };
					break;
				case 'boolean':
					ret[k] = { boolValue: v };
					break;
				case 'object':
					ret[k] = { structValue: attributesToStruct(v) };
					break;
				default:
					throw Error(`Unable to serialize type ${valueType}`);
			}
		}
		return { fields: ret };
	};

	const saveSketch = async () => {
		if (SketchMessage === undefined) {
			throw Error('SketchMessage is undefined.');
		}

		if (user === null) {
			throw new Error('Only logged in users can save.');
		}

		let objectData: Array = [];
		scene.mainLayer.traverse((obj) => {
			if (obj instanceof Geometry.Shape || obj instanceof Text.Text) {
				objectData.push(shapeToPayload(obj));
			}
		});

		// let payload = shapeToPayload(scene.mainLayer.children[0]);
		let payload = { objects: objectData };
		var errMsg = SketchMessage.verify(payload);
		if (errMsg) throw Error(errMsg);
		var message = SketchMessage.create(payload); // or use .fromObject if conversion is necessary
		var buffer = SketchMessage.encode(message).finish();
		const sketchRef = ref(storage, `/user/${user.uid}/projects/default/sketches/${sketchTitle}`);
		uploadBytes(sketchRef, buffer).then((snapshot) => {
			console.log(`Saved ${sketchTitle}`);
		});
	};

	const loadSketch = async (loadData) => {
		if (SketchMessage === undefined) {
			throw Error('SketchMessage is undefined.');
		}
		const sketchRef = ref(storage, `/user/${user.uid}/projects/default/sketches/${loadData.name}`);
		const buffer = new Uint8Array(await getBytes(sketchRef));
		let message = SketchMessage.decode(buffer);
		let messageObject = SketchMessage.toObject(message, {
			longs: String,
			enums: String,
			bytes: String
			// see ConversionOptions
		});

		scene.mainLayer.clear();
		for (let obj of messageObject.objects) {
			scene.mainLayer.add(messageObjectToShape(obj));
		}
		dispatch('selectShape', null);
		dispatch('setTitle', loadData.name);
	};

	const deleteSketch = async (deleteData) => {
		await userDataContainer.item(deleteData.id, deleteData.id).delete();
		const deletionIndex = sketchData.findIndex((entry) => entry.id === deleteData.id);
		sketchData = [...sketchData.slice(0, deletionIndex), ...sketchData.slice(deletionIndex + 1)];
	};

	let renameIndex: number | null = null;
	let renameInput: HTMLInputElement;
	const handleRename = async (renameData) => {
		// const newName = renameInput.value;
		// if (newName.length === 0) {
		// 	renameIndex = null;
		// 	return;
		// }
		// //
		// sketchData[updatedIndex].name = newName;
		// sketchData = sketchData;
		// renameIndex = null;
	};

	const loadSketchNames = async () => {
		const sketchesRef = ref(storage, `/user/${user.uid}/projects/default/sketches/`);
		const results = await listAll(sketchesRef);
		sketchData = results.items.map((ref) => {
			return {
				name: ref.name
			};
		});
	};

	onMount(async () => {
		storage = getStorage();
		// userDataContainer = await cosmosDbClient.database('Studio').container('UserData');
		await loadSketchNames();
		let root;
		for (let proto of [ObjectProto, StructProto, SketchProto]) {
			if (root === undefined) {
				root = protobuf.parse(proto).root;
			} else {
				root = protobuf.parse(proto, root).root;
			}
		}
		if (root === undefined) {
			throw Error('root is undefined.');
		}
		SketchMessage = root.lookupType('sketch.Sketch');
		// // Exemplary payload
		// var payload = { awesomeField: 'AwesomeString' };
		// // Verify the payload if necessary (i.e. when possibly incomplete or invalid)
		// // debugger;
		// var errMsg = ObjectMessage.verify(payload);
		// if (errMsg) throw Error(errMsg);
		// // Create a new message
		// var message = ObjectMessage.create(payload); // or use .fromObject if conversion is necessary
		// // Encode a message to an Uint8Array (browser) or Buffer (node)
		// var buffer = ObjectMessage.encode(message).finish();
		// // ... do something with buffer
		// // Decode an Uint8Array (browser) or Buffer (node) to a message
		// var message = ObjectMessage.decode(buffer);
		// // ... do something with message
		// // If the application uses length-delimited buffers, there is also encodeDelimited and decodeDelimited.
		// // Maybe convert the message back to a plain object
		// var object = ObjectMessage.toObject(message, {
		// 	longs: String,
		// 	enums: String,
		// 	bytes: String
		// 	// see ConversionOptions
		// });
		// console.log(object);
	});
	// const entryData = {
	// 	name: sketchTitle,
	// 	shapes: shapeData
	// };
	// let existingId = sketchData.find((data) => data.name === sketchTitle)?.id;
	// let response;
	// if (existingId !== undefined) {
	// 	entryData.id = existingId;
	// 	response = await userDataContainer.items.upsert(entryData);
	// } else {
	// 	response = await userDataContainer.items.create(entryData);
	// 	sketchData = [...sketchData, { name: sketchTitle, id: response.item.id }];
	// }
	//>
</script>

<div>
	<button class="btn" on:click={saveSketch}>
		<ContentSave size="1.5em" />
	</button>
</div>
{#each sketchData as data, i}
	<div class="flex items-center justify-between mt-1">
		{#if renameIndex !== i}
			<button
				class="btn btn-outline rounded-r-none normal-case text-base grow"
				on:click={() => loadSketch(data)}>{data.name}</button
			>
		{:else}
			<input
				bind:this={renameInput}
				autofocus={true}
				class="h-12 rounded-r-none normal-case text-base text-center grow"
				value={data.name}
				on:blur={() => handleRename(data)}
				on:keypress={(e) => {
					if (e.key === 'Enter') {
						renameInput.blur();
					}
				}}
			/>
		{/if}
		<div class="dropdown">
			<label tabindex="0" class="btn btn-outline rounded-l-none border-l-0"
				><DotsVertical size="1.5em" /></label
			>
			<ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box">
				<li>
					<a
						on:click={() => {
							renameIndex = i;
						}}
						class="flex justify-between">Rename <Pencil size="1.5em" /></a
					>
				</li>
				<li>
					<a on:click={() => deleteSketch(data)} class="flex justify-between"
						>Delete <Delete size="1.5em" /></a
					>
				</li>
			</ul>
		</div>
	</div>
{/each}
<!-- <div class="btn btn-error"><Delete size="1.5em" /></div> -->
