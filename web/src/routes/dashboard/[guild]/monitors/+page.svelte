<script lang="ts">
	import Monitor from '$lib/components/ui/monitor/Monitor.svelte';

	const { data } = $props();
	const channels = $derived(data.channels);
	const guild_id = $derived(data.guild_id);
	let monitors = $derived(data.monitors);
</script>

<h2>Active Monitors</h2>
{#each monitors as monitor (monitor.id)}
	<Monitor bind:monitors {monitor} />
{/each}
