<script>
	import Menubar from '$lib/components/ui/patterns/menubar/index.js';
	import { Button } from '$lib/components/ui/primitives/button/index.js';
	import StatusBadge from '$lib/components/ui/patterns/status-badge/status-badge.svelte';
	import TrafficFeed from '$lib/components/ui/custom/traffic-feed.svelte';
	import AnalysisLog from '$lib/components/ui/custom/analysis-log.svelte';
	import ChatPanel from '$lib/components/ui/custom/chat-panel.svelte';
	import { startSession, analyze, endSession } from '$lib/api/newton.js';

	let videoRef = $state(null);
	let sessionId = $state(null);
	let sessionStatus = $state('idle');
	let feedStatus = $state('connecting');
	let busy = $state(false);
	let lastUpdate = $state(null);
	let entries = $state([]);
	let chatMessages = $state([]);
	let chatLoading = $state(false);
	let intervalId = $state(null);

	function captureFrame(quality = 0.7) {
		if (!videoRef || !videoRef.videoWidth || !videoRef.videoHeight) return null;

		const canvas = document.createElement('canvas');
		canvas.width = videoRef.videoWidth;
		canvas.height = videoRef.videoHeight;

		const ctx = canvas.getContext('2d');
		if (!ctx) return null;

		ctx.drawImage(videoRef, 0, 0);
		const dataUri = canvas.toDataURL('image/jpeg', quality);
		return dataUri.replace(/^data:image\/\w+;base64,/, '');
	}

	function inferStatus(text) {
		const lower = text.toLowerCase();

		const negativePatterns = [
			/traffic\s+(is|appears?|seems?|looks?)\s+(heavy|stopped|dense|slow)/,
			/\b(heavy|dense|slow|stopped)\s+traffic\b/,
			/\b(significant|severe|major)\s+(congestion|delay|backup)\b/,
			/\b(accident|collision|crash|incident)\s+(reported|detected|observed|visible|ahead)\b/,
			/\blanes?\s+(blocked|closed)\b/
		];

		for (const pat of negativePatterns) {
			if (pat.test(lower)) {
				if (/accident|collision|crash|blocked|closed/.test(lower.match(pat)?.[0] || '')) {
					return 'critical';
				}
				return 'warning';
			}
		}

		return 'good';
	}

	async function captureAndAnalyze() {
		if (busy || !sessionId) return;

		const frame = captureFrame();
		if (!frame) return;

		busy = true;

		try {
			const result = await analyze(sessionId, frame);
			const text = result.analysis;
			const status = inferStatus(text);

			lastUpdate = result.timestamp;

			entries = [
				{ id: crypto.randomUUID(), text, timestamp: result.timestamp, status },
				...entries.slice(0, 49)
			];
		} catch (err) {
			console.error('Analysis failed:', err);
		} finally {
			busy = false;
		}
	}

	async function handleChatSend(text) {
		if (!sessionId) return;

		chatMessages = [
			...chatMessages,
			{ id: crypto.randomUUID(), role: 'user', text, timestamp: Date.now() }
		];
		chatLoading = true;

		const frame = captureFrame();
		if (!frame) {
			chatMessages = [
				...chatMessages,
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					text: 'Could not capture a frame from the video feed.',
					timestamp: Date.now()
				}
			];
			chatLoading = false;
			return;
		}

		while (busy) {
			await new Promise((r) => setTimeout(r, 200));
		}
		busy = true;

		try {
			const result = await analyze(sessionId, frame, text);
			chatMessages = [
				...chatMessages,
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					text: result.analysis,
					timestamp: result.timestamp
				}
			];
		} catch (err) {
			chatMessages = [
				...chatMessages,
				{
					id: crypto.randomUUID(),
					role: 'assistant',
					text: `Error: ${err.message}`,
					timestamp: Date.now()
				}
			];
		} finally {
			busy = false;
			chatLoading = false;
		}
	}

	async function handleStart() {
		if (sessionId) return;
		sessionStatus = 'connecting';

		try {
			const result = await startSession();
			sessionId = result.sessionId;
			sessionStatus = 'active';
			feedStatus = 'live';

			captureAndAnalyze();
			intervalId = setInterval(captureAndAnalyze, 8000);
		} catch (err) {
			console.error('Session failed:', err);
			sessionStatus = 'error';
		}
	}

	async function handleStop() {
		if (intervalId) {
			clearInterval(intervalId);
			intervalId = null;
		}
		if (sessionId) {
			try {
				await endSession(sessionId);
			} catch {
				// ignore cleanup errors
			}
			sessionId = null;
		}
		sessionStatus = 'idle';
		feedStatus = 'disconnected';
		busy = false;
	}

	function formatTime(ts) {
		if (!ts) return '--:--:--';
		return new Date(ts).toLocaleTimeString('en-US', {
			hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit'
		});
	}
</script>

{#snippet partnerSnippet()}
	<span class="text-muted-foreground font-mono text-sm tracking-wider uppercase">Traffic Monitor</span>
{/snippet}

<div
	class="bg-background text-foreground grid h-screen w-screen grid-rows-[auto_1fr] overflow-hidden"
>
	<Menubar partnerLogo={partnerSnippet}>
		<div class="flex items-center gap-3">
			{#if sessionStatus === 'active'}
				<StatusBadge label="Newton" percentage={100} initial="N" />
				<div class="text-muted-foreground hidden items-center gap-3 font-mono text-xs md:flex">
					<span>N101 @ Spencer Ave</span>
					<span class="text-border">|</span>
					<span>{entries.length} analyses</span>
					<span class="text-border">|</span>
					<span>{formatTime(lastUpdate)}</span>
				</div>
			{/if}
			{#if !sessionId}
				<Button variant="default" size="sm" onclick={handleStart}>Start Analysis</Button>
			{:else}
				<Button variant="outline" size="sm" onclick={handleStop}>Stop</Button>
			{/if}
		</div>
	</Menubar>

	<main class="grid grid-cols-[1fr_1fr] grid-rows-[2fr_3fr] gap-4 overflow-hidden p-4">
		<TrafficFeed bind:videoRef status={feedStatus} class="max-h-full" />

		<ChatPanel
			bind:messages={chatMessages}
			loading={chatLoading}
			disabled={!sessionId}
			onsend={handleChatSend}
			class="row-span-2 max-h-full"
		/>

		<AnalysisLog {entries} class="max-h-full" />
	</main>
</div>
