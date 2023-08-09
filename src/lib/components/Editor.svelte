<script lang="ts">
	import { createEventDispatcher, onMount, onDestroy } from 'svelte';
	import { configureMonaco, addChangedCodeHandler } from '$lib/utils/editorUtils';
	import { EXAMPLE_2, EXAMPLE_1, DEFAULT_TEXT } from '$lib/code/code';
	import { getBlob, getStorage, ref } from 'firebase/storage';
	import { getAuth } from 'firebase/auth';
	import { getCurrentUser } from '../../firebase';

	export let widthDelta;
	export let user: User | null | undefined;
	let editor, editorElement;
	const dispatch = createEventDispatcher();

	$: widthDelta, editor && editor.layout();

	onMount(async () => {
		// https://github.com/sveltejs/kit/discussions/3539?sort=new#discussioncomment-2048425
		const monaco = await import('monaco-editor');
		configureMonaco();

		// // compiler options
		// monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
		// 	target: monaco.languages.typescript.ScriptTarget.ES2016,
		// 	allowNonTsExtensions: true,
		// 	moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
		// 	module: monaco.languages.typescript.ModuleKind.ES2015,
		// 	noEmit: true,
		// 	typeRoots: ['node_modules/@types']
		// });

		// // extra libraries
		// monaco.languages.typescript.typescriptDefaults.addExtraLib(
		// 	`export declare function next() : string`,
		// 	'node_modules/@types/external/index.d.ts'
		// );
		// monaco.languages.typescript.javascriptDefaults.addExtraLib(
		// 	`export declare function next() : string`,
		// 	'node_modules/@types/external/index.d.ts'
		// );
		// monaco.languages.typescript.javascriptDefaults.addExtraLib(
		// 	`const i = 3; export { i };`,
		// 	'node_modules/three/index.js'
		// );
		// // https://github.com/microsoft/monaco-editor/issues/1401
		//		monaco.languages.typescript.typescriptDefaults.addExtraLib(
		//			// works
		//			`
		//  /**
		//   * A function that adds numbers
		//   * @param a the first number
		//   * @param b the second number
		//   */
		//  export declare function add(a: number, b: number): number
		//
		//  `,
		//			'file:///node_modules/@types/add/index.d.ts'
		//		);
		//
		//		monaco.editor.createModel(
		//			[
		//				// Works for some edits in the primary model, then fails
		//				`
		//  export class Milestone {
		//    id: string;
		//    name: string;
		//  };
		//  `
		//			].join('\n'),
		//			'typescript',
		//			monaco.Uri.file('test.ts')
		//		);

		// const typescriptLibs = monaco.languages.typescript.typescriptDefaults.getExtraLibs();
		// const javascriptLibs = monaco.languages.typescript.javascriptDefaults.getExtraLibs();
		// console.log(typescriptLibs);
		// console.log(javascriptLibs);

		monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
			// TODO: Typescript errors will only work properly if I figure out how to use addExternalLib().
			noSemanticValidation: true
			// diagnosticCodesToIgnore: [2792]
		});

		// View font size with
		// console.log(editor.getOption(monaco.editor.EditorOption.fontSize));

		let model;
		try {
			model = monaco.editor.createModel('', 'typescript', monaco.Uri.parse('file:///main.ts'));
		} catch (e) {
			model = monaco.editor.getModel(monaco.Uri.parse('file:///main.ts'));
		}
		editor = monaco.editor.create(editorElement, {
			model,
			language: 'typescript',
			fontSize: 13
		});

		const auth = getAuth();
		const currentUser = await getCurrentUser(auth, user);
		if (currentUser !== null) {
			console.log(currentUser.uid);
			const mainRef = ref(getStorage(), `/user/${currentUser.uid}/projects/default/src/main.ts`);
			const fileBlob = await getBlob(mainRef);
			const text = await fileBlob.text();
			editor.setValue(text);
		} else {
			console.log('not logged in');
			editor.setValue(EXAMPLE_2);
		}

		const dispatchChangedCode = () => {
			dispatch('changedCode', { code: editor.getValue() });
		};
		addChangedCodeHandler(editor, dispatchChangedCode);

		// Trigger initial render.
		dispatchChangedCode();
	});

	onDestroy(() => {
		if (editor !== undefined) {
			editor.dispose();
		}
	});

	const getText = () => {
		return editor.getValue();
	};
	const setText = (val) => {
		editor.setValue(val);
	};
	export { getText, setText };
</script>

<div bind:this={editorElement} style="text-align: left" class="h-full" />
