import { rollup } from '@rollup/browser';
import axios from 'axios';
import * as ts from 'typescript';
import { getStorage, ref, getBlob } from 'firebase/storage';

function doimport(str) {
	const blob = new Blob([str], { type: 'text/javascript' });
	const url = URL.createObjectURL(blob);
	const module = import(url);
	URL.revokeObjectURL(url); // GC objectURLs
	return module;
}

const bundle = async (source: string) => {
	const modules = {
		'main.js': source
	};
	const bundle = await rollup({
		input: 'main.js',
		plugins: [
			{
				name: 'loader',
				resolveId(source) {
					if (modules.hasOwnProperty(source)) {
						return source;
					} else if (source === 'three') {
						return source;
					} else if (source === 'studio') {
						return source;
					}
				},
				load(id) {
					if (modules.hasOwnProperty(id)) {
						return modules[id];
					} else if (id === 'three') {
						return axios
							.get('https://unpkg.com/three@v0.149.0/build/three.module.js')
							.then((resp) => resp.data);
					} else if (id === 'studio') {
						// return axios.get('http://localhost:8081/bundle.js').then((resp) => resp.data);
						const bundleRef = ref(getStorage(), 'studio.js/build/bundle.js');
						return getBlob(bundleRef).then((blob) => blob.text());
					}
				},
				transform(code, id) {
					if (id === 'main.js') {
						const result = ts.transpileModule(code, {
							compilerOptions: { target: ts.ScriptTarget.ES2015 }
						});
						return result.outputText;
					}
				}
			}
		]
	});
	const { output } = await bundle.generate({ format: 'es' });
	return output[0].code;
};

const bundleModule = async (source: string) => {
	const sourceBundle = await bundle(source);
	const module = await doimport(sourceBundle);
	return module;
};

export { bundle, bundleModule };
