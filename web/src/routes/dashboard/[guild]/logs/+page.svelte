<script lang="ts">
    import { goto } from '$app/navigation';
    // Remove import {page} from "$app/state" if not using it elsewhere
    import AuditLog from '$lib/components/ui/AuditLog.svelte';

    // 1. Capture the entire props object
    let { data } = $props();

    // 2. Reference data.logs inside the derivation
    // This ensures that whenever 'data' is updated by SvelteKit, 'logs' recomputes
    const logs = $derived(data.logs);
</script>

<h1>Logs</h1>
{#key data.logs}
<div class="logs">
    {#each logs.logs as log}
        <AuditLog log={log} roles={data.roles} channels={data.channels} />
    {/each}

    {#if logs.next_cursor}
        <button onclick={() => goto(`?before_id=${logs.next_cursor}`, { invalidateAll: true })}>
            next
        </button>
    {/if}
</div>
{/key}