<script lang="ts">
	import { getStorage, ref, getDownloadURL } from 'firebase/storage';
	import { onMount } from 'svelte';

	let url: string | undefined;
	const videoRef = ref(
		getStorage(),
		'user/PB7Yu44WKPWG2e1vgjyGWvDY6nG2/projects/default/video/main.mp4'
	);
	onMount(async () => {
		url = await getDownloadURL(videoRef);
	});
</script>

<div class="flex items-stretch h-full overflow-y-scroll">
	<aside class="flex flex-col p-3 overflow-y-scroll border-r-gray-400 border-r-4">
		<div class="grow-0 max-h-full">
			<div class="flex btn btn-outline btn-wide normal-case text-base grow mb-1">main.mp4</div>
		</div>
	</aside>
	<div class="flex justify-center items-center grow">
		<video
			class:hidden={url === undefined}
			style="width: 640px; height: 360px"
			src={url}
			controls
		/>
	</div>
</div>
