import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

const configureMonaco = () => {
	// https://github.com/vitejs/vite/discussions/1791#discussioncomment-321046
	self.MonacoEnvironment = {
		getWorker: function (_moduleId, label) {
			if (label === 'json') {
				return new jsonWorker();
			}
			if (label === 'css' || label === 'scss' || label === 'less') {
				return new cssWorker();
			}
			if (label === 'html' || label === 'handlebars' || label === 'razor') {
				return new htmlWorker();
			}
			if (label === 'typescript' || label === 'javascript') {
				return new tsWorker();
			}
			return new editorWorker();
		}
	};
};

const addChangedCodeHandler = (editor, callback, timeoutMs = 1000) => {
	let timeoutId = null;

	editor.getModel().onDidChangeContent((event) => {
		if (timeoutId !== null) {
			clearTimeout(timeoutId);
		}
		timeoutId = setTimeout(() => {
			callback();
			timeoutId = null;
		}, timeoutMs);
	});
};

export { configureMonaco, addChangedCodeHandler };
