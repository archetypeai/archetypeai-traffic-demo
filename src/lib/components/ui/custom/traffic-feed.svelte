<script>
	import { cn } from '$lib/utils.js';
	import BackgroundCard from '$lib/components/ui/patterns/background-card/index.js';
	import Badge from '$lib/components/ui/primitives/badge/index.js';
	import VideoIcon from '@lucide/svelte/icons/video';

	const HLS_URL = 'https://wzmedia.dot.ca.gov/D4/N101_at_Spencer_Av.stream/playlist.m3u8';

	// Fatal network errors at the manifest level need loadSource, not startLoad —
	// there is no parsed level to resume from.
	const MANIFEST_ERRORS = new Set([
		'manifestLoadError',
		'manifestLoadTimeOut',
		'manifestParsingError'
	]);
	const INITIAL_RETRY_DELAY = 1000;
	const MAX_RETRY_DELAY = 30000;

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

		let retryTimer = null;
		let retryDelay = INITIAL_RETRY_DELAY;

		// 'playing' is the source of truth for "live" — it also re-fires after a
		// recovered error, flipping the badge back from connecting to live.
		const onPlaying = () => {
			retryDelay = INITIAL_RETRY_DELAY; // recovered — reset the backoff
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
						// The Caltrans publisher drops in and out, so playlist.m3u8 serves
						// intermittent 404s. A manifest-level failure leaves no levels for
						// startLoad() to resume — the feed would sit blank until a manual
						// reload — so re-issue loadSource instead, backing off so an
						// extended outage doesn't turn into a tight retry loop.
						if (MANIFEST_ERRORS.has(data.details)) {
							retryDelay = Math.min(retryDelay * 2, MAX_RETRY_DELAY);
							clearTimeout(retryTimer);
							retryTimer = setTimeout(() => {
								if (hlsInstance === hls) hls.loadSource(HLS_URL);
							}, retryDelay);
						} else {
							hls.startLoad();
						}
					} else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
						status = 'connecting';
						hls.recoverMediaError();
					} else {
						console.error('HLS fatal error:', data);
						status = 'error';
						// Drop any pending manifest retry — it would call loadSource on a
						// destroyed instance.
						clearTimeout(retryTimer);
						hls.destroy();
						hlsInstance = null;
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
			clearTimeout(retryTimer);
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
			class="aspect-[3/2] w-full bg-muted object-contain"
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
