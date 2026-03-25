<script lang="ts">
	import { ChevronDown } from '@lucide/svelte';
	import type { TicketSummarySegment } from '@watcher/shared';
	import { fly } from 'svelte/transition';

	interface Props {
		summary: TicketSummarySegment;
		open_initially?: boolean;
	}

	const { summary, open_initially }: Props = $props();

	// svelte-ignore state_referenced_locally
	let is_expanded = $state(open_initially ?? false);
</script>

<div class="summary">
	<button class:expanded={!is_expanded} onclick={() => (is_expanded = !is_expanded)}
		><ChevronDown /></button
	>
	<div>
		<p class="title">{summary.summary_title ?? 'Summary'}</p>
		{#if is_expanded}
			<p class="text" transition:fly>{summary.summary_text}</p>
		{/if}
	</div>
</div>

<style lang="scss">
	.summary {
		max-width: 40ch;
		display: flex;
		align-items: start;
		font-size: large;
		gap: 1rem;

		button {
			background-color: transparent;
			border: none;
			color: var(--primary-900);
			cursor: pointer;
			transition: 0.2s;

			&.expanded {
				transform: rotateZ(-90deg);
			}
		}
	}

	.title {
		font-size: smaller;
	}

	.text {
		opacity: 0.7;
	}
</style>
