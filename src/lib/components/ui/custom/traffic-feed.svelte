<script>
	import { cn } from '$lib/utils.js';
	import BackgroundCard from '$lib/components/ui/patterns/background-card/index.js';
	import Badge from '$lib/components/ui/primitives/badge/index.js';
	import VideoIcon from '@lucide/svelte/icons/video';

	const HLS_URL = 'https://wzmedia.dot.ca.gov/D4/N101_at_Spencer_Av.stream/playlist.m3u8';

	let {
		videoRef = $bindable(null),
		status = $bindable('connecting'),
		class: className,
		...restProps
	} = $props();

	let hlsInstance = $state(null);

	const STATUS_COLORS = {
		live: 'bg-atai-good text-black/70',
		connecting: 'bg-atai-warning text-black/70',
		disconnected: 'bg-muted text-muted-foreground',
		error: 'bg-atai-critical text-black/70'
	};

	// Reflect the real stream lifecycle: connecting → live (on first playback)
	// → error. Independent of whether analysis is running.
	$effect(() => {
		if (!videoRef) return;

		status = 'connecting';

		// 'playing' is the source of truth for "live" — it also re-fires after a
		// recovered error, flipping the badge back from connecting to live.
		const onPlaying = () => {
			status = 'live';
		};
		videoRef.addEventListener('playing', onPlaying);

		async function initHls() {
			const Hls = (await import('hls.js')).default;

			if (Hls.isSupported()) {
				const hls = new Hls({
					enableWorker: true,
					lowLatencyMode: true
				});
				hls.loadSource(HLS_URL);
				hls.attachMedia(videoRef);
				// Autoplay can stall silently — kick playback explicitly once the
				// manifest is ready (the element is muted, so this is allowed).
				hls.on(Hls.Events.MANIFEST_PARSED, () => {
					videoRef?.play?.().catch(() => {});
				});
				// Network/media errors are routine on a long-running live stream —
				// recover in place rather than latching the badge to ERROR. Only
				// surface 'error' for genuinely unrecoverable failures.
				hls.on(Hls.Events.ERROR, (_, data) => {
					if (!data.fatal) return;
					if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
						status = 'connecting';
						hls.startLoad();
					} else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
						status = 'connecting';
						hls.recoverMediaError();
					} else {
						console.error('HLS fatal error:', data);
						status = 'error';
						hls.destroy();
					}
				});
				hlsInstance = hls;
			} else if (videoRef.canPlayType('application/vnd.apple.mpegurl')) {
				videoRef.src = HLS_URL;
				videoRef.play?.().catch(() => {});
			}
		}

		initHls();

		return () => {
			videoRef?.removeEventListener('playing', onPlaying);
			if (hlsInstance) {
				hlsInstance.destroy();
				hlsInstance = null;
			}
		};
	});
</script>

<BackgroundCard title="Live Feed" icon={VideoIcon} class={cn('gap-3', className)} {...restProps}>
	<div class="relative overflow-hidden rounded-sm">
		<video
			bind:this={videoRef}
			autoplay
			muted
			playsinline
			class="bg-muted aspect-[3/2] w-full object-contain"
		></video>

		<div class="absolute top-2 left-2 flex items-center gap-2">
			<Badge
				variant="outline"
				class={cn(
					'font-mono text-xs uppercase',
					STATUS_COLORS[status] ?? STATUS_COLORS.disconnected
				)}
			>
				{status}
			</Badge>
		</div>

		<div class="absolute right-2 bottom-2">
			<Badge variant="outline" class="bg-background/80 font-mono text-xs backdrop-blur-sm">
				US-101 Spencer Ave
			</Badge>
		</div>
	</div>
</BackgroundCard>
