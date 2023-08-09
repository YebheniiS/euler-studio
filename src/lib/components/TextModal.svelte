<script lang="ts">
	import { TextMode } from '$lib/utils/textUtils';
	import { createEventDispatcher } from 'svelte';

	export let textMode: TextMode;
	$: {
		if (texInput !== undefined) {
			texInput.value = textMode === TextMode.text ? 'hi there' : 'x^2';
			renderTex();
		}
	}

	let texInput: HTMLInputElement;
	let texOutput: HTMLDivElement;

	const dispatch = createEventDispatcher();

	let renderTex = () => {
		let texString = texInput.value;
		if (textMode === TextMode.text) {
			texString = `\\textrm{${texInput.value}}`;
		}
		texOutput.innerHTML = '';
		window.MathJax.texReset();
		var options = window.MathJax.getMetricsFor(texOutput);
		options.display = true;
		window.MathJax.tex2svgPromise(texString, options)
			.then(function (node: HTMLElement) {
				texOutput.appendChild(node);
				window.MathJax.startup.document.clear();
				window.MathJax.startup.document.updateDocument();
			})
			.catch(function (err) {
				texOutput
					.appendChild(document.createElement('pre'))
					.appendChild(document.createTextNode(err.message));
			});
	};
</script>

<div class="modal">
	<div class="modal-box">
		<div
			bind:this={texOutput}
			class="flex justify-center min-h-[2em] border-neutral border text-lg my-2 p-1"
		/>
		<input
			bind:this={texInput}
			type="text"
			class="text-center input input-bordered input-primary w-full max-w-xs"
			spellcheck="false"
			on:input={() => {
				setTimeout(renderTex, 1000);
			}}
		/>
		<div class="modal-action">
			<label
				on:click={() => {
					let texString = texInput.value;
					if (textMode === TextMode.text) {
						texString = `\\textrm{${texInput.value}}`;
					}
					dispatch('insertTex', texString);
				}}
				for="text-modal"
				class="btn">Insert</label
			>
		</div>
	</div>
</div>
