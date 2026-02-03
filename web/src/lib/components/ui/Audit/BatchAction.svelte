<script lang="ts">
    	import type { ExpandedAuditLog } from "$lib/types/internal_api";
	import type { NarrowedLog } from "@watcher/shared";

    interface Props {
        action: NarrowedLog<"BATCH_ACTION", ExpandedAuditLog>
    }

    const { action }: Props = $props()

    const nice_name_loopup = {
        "WATCH": "watched",
        "UNWATCH": "un-watched",
        "TOGGLE": "toggled"
    } as const

</script>
{nice_name_loopup[action.data.action]} {action.data.target_channels.length} threads!

<style lang="scss">
    .command {
        background-color: var(--secondary-300);
        border-radius: .5rem;
        padding: .25rem;
    }

    .command_props {
        display: inline-flex;
        gap: .2rem;
    }
</style>