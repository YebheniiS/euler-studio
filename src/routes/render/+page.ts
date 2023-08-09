export function load({ url }) {
	return {
		canvasResolution: {
			width: Number(url.searchParams.get('width') || '1280'),
			height: Number(url.searchParams.get('height') || '720')
		},
		framerate: Number(url.searchParams.get('framerate') || '30')
	};
}
