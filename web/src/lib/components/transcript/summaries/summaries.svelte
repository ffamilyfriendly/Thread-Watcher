<script lang="ts">
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import Summary from './summary.svelte';

	const ts = use_ticket_state();

	const master_summary = $derived(ts.ticket?.summaries.find(s => s.is_master_summary))
</script>

{#if ts.ticket?.summaries}
	{#if master_summary}
	<div class="master_summary">
		<b>{master_summary.summary_title}</b>
		<p>{ master_summary.summary_text }</p>
		<small>Master Summary</small>
	</div>
	{/if}
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

	.master_summary {
		padding: 1rem;
		background-color: var(--secondary-500);
		border: 1px solid var(--secondary-700);
		border-radius: .25rem;
		margin-bottom: .5rem;

		b {
			opacity: .7;
		}

		small {
			opacity: .4;
		}
	}
</style>
