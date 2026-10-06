<script lang="ts">
	import { get_tab_context } from './TabbedView.svelte';
	import type { Snippet } from 'svelte';

	const { id, label, children }: { id: string; label: string; children: Snippet } = $props();
	const context = get_tab_context();

	$effect(() => {
		context.register_tab(id, label);
	});
</script>

{#if context.active_tab === id}
	{@render children()}
{/if}
