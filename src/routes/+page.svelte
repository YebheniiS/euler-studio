<script lang="ts">
	import AnimateMode from '$lib/components/AnimateMode.svelte';
	import DrawMode from '$lib/components/DrawMode.svelte';
	import TheaterMode from '$lib/components/TheaterMode.svelte';
	import app, { getCurrentUser } from '../firebase';
	import {
		getAuth,
		onAuthStateChanged,
		signInWithPopup,
		signOut,
		GoogleAuthProvider
	} from 'firebase/auth';
	import type { User } from 'firebase/auth';
	import {
		getStorage,
		ref,
		uploadString,
		getMetadata,
		StorageError,
		StorageErrorCode
	} from 'firebase/storage';
	import { bundle } from '$lib/utils/bundle';

	const provider = new GoogleAuthProvider();

	let modeCheckbox: HTMLInputElement;

	enum Mode {
		Animate,
		Draw,
		Theater
	}
	let mode = Mode.Animate;

	// TODO: Wait on the user at the start then pass it to children components.
	// https://github.com/firebase/firebase-js-sdk/issues/462
	let user: User | null | undefined = undefined;
	const auth = getAuth(app);

	const signIn = () => {
		signInWithPopup(auth, provider).catch((error) => {
			throw error;
		});
	};

	onAuthStateChanged(auth, (userOrNull) => {
		user = userOrNull;
	});

	let animateMode: AnimateMode;
	const saveCode = async () => {
		const currentUser = await getCurrentUser(auth, user);
		if (currentUser === null) {
			throw new Error('Only logged in users can save.');
		}

		const mainRef = ref(getStorage(), `/user/${currentUser.uid}/projects/default/src/main.ts`);
		uploadString(mainRef, animateMode.getText()).then((snapshot) => {
			console.log('Saved main.ts');
		});
	};

	const fetchUpdatedMetadata = async (user: User, project: string) => {
		const videoRef = ref(getStorage(), `/user/${user.uid}/projects/${project}/video/main.mp4`);
		try {
			const videoMetadata = await getMetadata(videoRef);
			return videoMetadata.updated;
		} catch (err) {
			if (
				err instanceof StorageError &&
				err.code === `storage/${StorageErrorCode.OBJECT_NOT_FOUND}`
			) {
				return 'Does not exist';
			} else {
				throw err;
			}
		}
	};

	let showRenderSuccess = false;
	let showRenderFailure = false;
	let renderTime = 5;
	let renderResolution = 720;
	let renderFrameRate = 30;
	let renderProgress: number | null = null;
	let encodeProgress: number | null = null;
	let uploadFinished: boolean | null = null;
	let progressDisplay: string | null = null;
	let progressBarPercent: number | null = null;

	const resetRenderProgress = () => {
		renderProgress = null;
		encodeProgress = null;
		uploadFinished = null;
		progressDisplay = null;
		progressBarPercent = null;
	};

	const updateProgressDisplay = () => {
		if (uploadFinished) {
			progressDisplay = 'Finished!';
			setTimeout(resetRenderProgress, 5000);
		} else if (encodeProgress) {
			progressDisplay = 'Encoding...';
			progressBarPercent = encodeProgress;
		} else if (renderProgress) {
			progressDisplay = 'Rendering...';
			progressBarPercent = renderProgress;
		}
	};

	const renderVideo = async (time: number, resolution: number, framerate: number) => {
		const currentUser = await getCurrentUser(auth, user);
		if (currentUser === null) {
			throw new Error('Only logged in users can save.');
		}

		const bundleRef = ref(
			getStorage(),
			`/user/${currentUser.uid}/projects/default/src/build/bundle.js`
		);
		const sourceBundle = await bundle(animateMode.getText());
		await uploadString(bundleRef, sourceBundle);

		const project = 'default';

		const token = await currentUser.getIdToken(/* forceRefresh */ true);

		const socket = new WebSocket(
			// 'ws://eulertour-cuddly-spork-vqv464xjx5vcxj66-48957.preview.app.github.dev'
			'ws://renderer-aompdrdwha-wl.a.run.app'
		);
		let startTime;
		socket.onopen = (e) => {
			// startTime = performance.now();
			socket.send(
				JSON.stringify({
					token,
					project,
					runtime: renderTime,
					resolution: renderResolution,
					framerate: renderFrameRate
				})
			);
		};
		socket.onmessage = (event) => {
			const message = event.data;
			// console.log(message);

			const renderProgressRegex = /^render: (?<renderProgress>.*)/;
			const renderProgressMatch = message.match(renderProgressRegex);

			const encodeProgressRegex = /^encode: (?<encodeProgress>.*)/;
			const encodeProgressMatch = message.match(encodeProgressRegex);

			if (renderProgressMatch) {
				const renderProgressCapture = renderProgressMatch.groups.renderProgress;
				const renderProgessPercent = Number(renderProgressCapture);
				if (renderProgessPercent) {
					renderProgress = renderProgessPercent;
				} else {
					console.error(`Unable to parse websocket message: ${message}`);
				}
			} else if (encodeProgressMatch) {
				const encodeProgressCapture = encodeProgressMatch.groups.encodeProgress;
				const encodeProgessPercent = Number(encodeProgressCapture);
				if (encodeProgessPercent) {
					encodeProgress = encodeProgessPercent;
				} else {
					console.error(`Unable to parse websocket message: ${message}`);
				}
			} else if (message === 'finished: 1') {
				uploadFinished = true;
				// console.log(performance.now() - startTime);
			}

			updateProgressDisplay();
		};
		socket.onclose = (event) => {
			if (!event.wasClean) {
				console.log('[close] Connection died');
			}
		};
		socket.onerror = (error) => {
			console.error('[error]', error);
		};
	};

	let videoLengthInput: HTMLInputElement;
	let videoResolutionInput: HTMLSelectElement;
	let videoFrameRateInput: HTMLSelectElement;
</script>

<main class="h-full">
	<div class="drawer">
		<input bind:this={modeCheckbox} id="mode-drawer" type="checkbox" class="drawer-toggle" />
		<div style="overflow: hidden" class="flex flex-col justify-stretch drawer-content max-h-full">
			<div class="flex justify-between navbar bg-primary">
				<div class="flex">
					<label for="mode-drawer" class="px-3 mr-1 btn btn-primary drawer-button">
						<span class="text-2xl material-symbols-outlined text-base-100 hover:text-base-300"
							>menu</span
						>
					</label>
					<div>
						<div class="flex flex-col items-start">
							<a href="/" class="self-start text-base text-primary-content"> EulerStudio </a>
							<div class="flex align-center">
								<button on:click={saveCode} class="btn btn-link btn-sm focus:outline-none m-0 p-0">
									<span
										style="font-variation-settings: 'FILL' 1"
										class="text-2xl material-symbols-outlined text-base-100 hover:text-base-300"
										>save</span
									>
								</button>
								<label for="render-modal" class="btn btn-link btn-sm focus:outline-none m-0 p-0">
									<span class="text-2xl material-symbols-outlined text-base-100 hover:text-base-300"
										>movie</span
									>
								</label>
							</div>
						</div>
					</div>
				</div>
				{#if user === null}
					<span on:click={signIn} class="text-primary-content">Not logged in </span>
				{:else if user !== undefined}
					<span on:click={() => signOut(auth)} class="text-primary-content">{user.displayName}</span
					>
				{/if}
			</div>
			<div class="grow overflow-y-scroll">
				{#if mode === Mode.Animate}
					<AnimateMode bind:this={animateMode} {user} />
				{:else if mode === Mode.Draw}
					<DrawMode {user} />
				{:else}
					<TheaterMode />
				{/if}
			</div>
			{#if renderProgress !== null || encodeProgress !== null}
				<div
					class="absolute card right-3 bottom-3 border-2 bg-base-100 border-black"
					style="width: 350px"
				>
					<div class="flex flex-col items-stretch card-body">
						<div class="flex items-center justify-between">
							<span>Rendering...</span>
							<span
								class:invisible={Number(renderProgress) < 1}
								class="text-2xl material-symbols-outlined text-primary hover:text-base-300"
							>
								check_circle
							</span>
						</div>
						<progress
							class="progress {Number(renderProgress) < 1 ? 'progress-info' : 'progress-primary'}"
							value={renderProgress}
							max="1"
						/>
						<div class="flex items-center justify-between">
							<span>Encoding...</span>
							<span
								class:invisible={Number(encodeProgress) < 1}
								class="text-2xl material-symbols-outlined text-primary hover:text-base-300"
							>
								check_circle
							</span>
						</div>
						<progress
							class="progress {Number(encodeProgress) < 1 ? 'progress-info' : 'progress-primary'}"
							value={encodeProgress}
							max="1"
						/>
						<div class="card-actions justify-end">
							<button
								on:click={() => {
									resetRenderProgress();
									mode = Mode.Theater;
								}}
								class="btn btn-sm btn-primary"
								class:btn-disabled={!uploadFinished}>View in Theater</button
							>
						</div>
					</div>
				</div>
			{/if}
		</div>
		<div class="drawer-side">
			<label for="mode-drawer" class="drawer-overlay" />
			<ul class="menu p-4 w-80 bg-base-100 text-base-content">
				<li>
					<a href="/" class="btn btn-ghost normal-case text-xl">EulerStudio</a>
				</li>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-missing-attribute -->
				<li>
					<a
						on:click={() => {
							mode = Mode.Animate;
							modeCheckbox.checked = false;
						}}>Animate Mode</a
					>
				</li>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-missing-attribute -->
				<li>
					<a
						on:click={() => {
							mode = Mode.Draw;
							modeCheckbox.checked = false;
						}}>Draw Mode</a
					>
				</li>
				<!-- svelte-ignore a11y-click-events-have-key-events -->
				<!-- svelte-ignore a11y-missing-attribute -->
				<li>
					<a
						on:click={() => {
							mode = Mode.Theater;
							modeCheckbox.checked = false;
						}}>Theater Mode</a
					>
				</li>
			</ul>
		</div>
	</div>
</main>

<input type="checkbox" id="render-modal" class="modal-toggle" />
<div class="modal">
	<div class="modal-box">
		<div>
			<label for="render-length">length (seconds):</label>
			<input
				bind:this={videoLengthInput}
				on:change={() => {
					renderTime = Number(videoLengthInput.value);
				}}
				id="render-length"
				class="w-20 ml-2 input input-bordered"
				type="number"
				step="1"
				value={renderTime}
			/>
		</div>
		<div class="mt-2">
			<label for="render-resolution">resolution:</label>
			<select
				id="render-resolution"
				bind:this={videoResolutionInput}
				on:change={() => {
					renderResolution = Number(videoResolutionInput.value);
				}}
				class="select"
				value={720}
			>
				<option disabled selected>resolution</option>
				<option value={1080}>1080p</option>
				<option value={720}>720p</option>
				<option value={360}>360p</option>
			</select>
		</div>
		<div class="mt-2">
			<label for="render-framerate">frame rate:</label>
			<select
				id="render-framerate"
				bind:this={videoFrameRateInput}
				on:change={() => {
					renderFrameRate = Number(videoFrameRateInput.value);
				}}
				class="select"
				value={30}
			>
				<option disabled selected>frame rate</option>
				<option value={60}>60</option>
				<option value={30}>30</option>
			</select>
		</div>
		<!-- svelte-ignore a11y-click-events-have-key-events -->
		<label
			on:click={() => renderVideo(renderTime, renderResolution, renderFrameRate)}
			for="render-modal"
			class="btn btn-primary mt-2">Render</label
		>
	</div>
</div>

<div class="toast">
	<div class:hidden={!showRenderFailure} class="alert alert-error">
		<div>
			<span>Rendering failed</span>
		</div>
	</div>
	<div class:hidden={!showRenderSuccess} class="alert alert-success">
		<div>
			<span>Finished rendering</span>
		</div>
	</div>
</div>
