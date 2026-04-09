<script>
	import { cn } from '$lib/utils.js';
	import BackgroundCard from '$lib/components/ui/patterns/background-card/index.js';
	import FlatLogItem from '$lib/components/ui/patterns/flat-log-item/index.js';
	import { ScrollArea } from '$lib/components/ui/primitives/scroll-area/index.js';
	import BrainIcon from '@lucide/svelte/icons/brain';

	/**
	 * @typedef {Object} LogEntry
	 * @property {string} id
	 * @property {string} text
	 * @property {number} timestamp
	 * @property {'good' | 'warning' | 'critical' | 'neutral'} status
	 */

	/** @type {{ entries?: LogEntry[], class?: string }} */
	let { entries = [], class: className, ...restProps } = $props();

	function formatTime(ts) {
		return new Date(ts).toLocaleTimeString('en-US', {
			hour12: false,
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		});
	}
</script>

<BackgroundCard title="Analysis" icon={BrainIcon} class={cn('flex max-h-full flex-col gap-3 overflow-hidden', className)} {...restProps}>
	<ScrollArea class="min-h-0 flex-1">
		<div class="flex flex-col gap-2 pr-3">
			{#if entries.length === 0}
				<p class="text-muted-foreground py-8 text-center text-sm">
					Waiting for analysis...
				</p>
			{:else}
				{#each entries as entry (entry.id)}
					<FlatLogItem
						title={entry.status === 'good' ? 'NORMAL' : entry.status === 'warning' ? 'CONGESTION' : entry.status === 'critical' ? 'INCIDENT' : 'OBSERVING'}
						message={entry.text}
						status={entry.status}
						detail={formatTime(entry.timestamp)}
					/>
				{/each}
			{/if}
		</div>
	</ScrollArea>
</BackgroundCard>
