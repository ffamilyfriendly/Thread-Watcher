<script lang="ts">
	import Monitor from "$lib/components/ui/monitor/Monitor.svelte";

    const { data } = $props()
</script>

<h2>Active Monitors</h2>
{#each data.monitors as monitor}
    <Monitor guild_id={data.guild_id} channels={data.channels} monitor={monitor} />
{/each}