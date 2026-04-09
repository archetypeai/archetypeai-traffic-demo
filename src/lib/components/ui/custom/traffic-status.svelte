<script>
	import { cn } from '$lib/utils.js';
	import BackgroundCard from '$lib/components/ui/patterns/background-card/index.js';
	import Badge from '$lib/components/ui/primitives/badge/index.js';
	import { Separator } from '$lib/components/ui/primitives/separator/index.js';
	import RadioTowerIcon from '@lucide/svelte/icons/radio-tower';

	let {
		sessionStatus = 'idle',
		frameCount = 0,
		lastUpdate = null,
		analysisCount = 0,
		class: className,
		...restProps
	} = $props();

	const STATUS_MAP = {
		idle: { label: 'IDLE', color: 'bg-muted text-muted-foreground' },
		connecting: { label: 'CONNECTING', color: 'bg-atai-warning text-black/70' },
		active: { label: 'ACTIVE', color: 'bg-atai-good text-black/70' },
		error: { label: 'ERROR', color: 'bg-atai-critical text-black/70' }
	};

	let statusInfo = $derived(STATUS_MAP[sessionStatus] ?? STATUS_MAP.idle);

	function formatTime(ts) {
		if (!ts) return '--:--:--';
		return new Date(ts).toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<BackgroundCard title="Status" icon={RadioTowerIcon} class={cn('gap-4', className)} {...restProps}>
	<div class="flex flex-col gap-3">
		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-sm">Session</span>
			<Badge variant="outline" class={cn('font-mono text-xs uppercase', statusInfo.color)}>
				{statusInfo.label}
			</Badge>
		</div>

		<Separator />

		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-sm">Frames sent</span>
			<span class="text-foreground font-mono text-sm">{frameCount}</span>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-sm">Analyses</span>
			<span class="text-foreground font-mono text-sm">{analysisCount}</span>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-sm">Last update</span>
			<span class="text-foreground font-mono text-sm">{formatTime(lastUpdate)}</span>
		</div>

		<Separator />

		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-sm">Camera</span>
			<span class="text-foreground font-mono text-xs">N101 @ Spencer Ave</span>
		</div>

		<div class="flex items-center justify-between">
			<span class="text-muted-foreground text-sm">Resolution</span>
			<span class="text-foreground font-mono text-xs">720x480</span>
		</div>
	</div>
</BackgroundCard>
