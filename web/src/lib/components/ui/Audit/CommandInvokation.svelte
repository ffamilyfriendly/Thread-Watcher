<script lang="ts">
    	import type { ExpandedAuditLog } from "$lib/types/internal_api";
	import type { NarrowedLog } from "@watcher/shared";

    interface Props {
        log: NarrowedLog<"COMMAND", ExpandedAuditLog>
    }

    const { log }: Props = $props()
</script>
<span class="command">
<code>/{log.data.command_name}
    {#each Object.entries(log.data.command_args) as [key, value] }
        <b>{key}:</b> {value}
    {/each}
</code>
</span>

<style lang="scss">
    .command {
        background-color: var(--secondary-300);
        border-radius: .5rem;
        padding: .25rem;
    }
</style>