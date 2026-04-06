<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import AuditLog from '$lib/components/ui/Audit/AuditLog.svelte';
	import btn_style from '$lib/style/button.module.scss';

	let { data } = $props();

	const logs = $derived(data.logs);

	const has_before_id = $derived(page.url.searchParams.has('before_id'));
</script>

<h1>Logs</h1>
{#key data.logs}
	<div class="logs">
		{#each logs.logs as log}
			<AuditLog {log} />
		{/each}

		{#if logs.logs.length === 0}
			<p class="no_logs">No audit logs were found!</p>
		{/if}

		<div class="buttons">
			{#if has_before_id}
				<button
					class={[btn_style.button, btn_style.tetriary, 'navigation_button']}
					onclick={() => history.back()}
				>
					Previous Page
				</button>
			{/if}
			{#if logs.next_cursor}
				<button
					class={[btn_style.button, btn_style.primary, 'navigation_button']}
					onclick={() => goto(`?before_id=${logs.next_cursor}`, { invalidateAll: true })}
				>
					Next Page
				</button>
			{/if}
		</div>
	</div>
{/key}

<style>
	.logs {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.navigation_button {
		width: max-content;
	}

	.buttons {
		display: flex;
		justify-content: right;
		gap: 0.5rem;
	}
</style>
