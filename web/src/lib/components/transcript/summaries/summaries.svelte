<script lang="ts">
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import Summary from './summary.svelte';

	const ts = use_ticket_state();
</script>

{#if ts.ticket?.summaries}
	<div class="summaries">
		{#each ts.ticket.summaries as summary, idx}
			<Summary {summary} />

			{#if idx !== ts.ticket.summaries.length - 1}
				<div class="divider"></div>
			{/if}
		{/each}
	</div>
{/if}

<style lang="scss">
	.summaries {
		padding: 0.5rem;
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--primary-500) 40%, transparent);
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
	}

	.divider {
		width: 100%;
		height: 1px;
		background-color: color-mix(in srgb, var(--primary-500) 40%, transparent);
		margin-top: 0.5rem;
		margin-bottom: 0.5rem;
	}
</style>
