<script lang="ts">
	import { goto } from "$app/navigation";
	import { use_guild_state } from "$lib/stores/guild.svelte";
    import type { ExpandedAuditLog } from "$lib/types/internal_api";
	import type { NarrowedLog } from "@watcher/shared";
	import Button from "../Button.svelte";

    interface Props {
        action: NarrowedLog<"PANEL_CREATED" | "PANEL_REMOVED", ExpandedAuditLog>
    }

    const gs = use_guild_state()

    async function visit_panel() {
        await goto(`/dashboard/${gs.guild_id}/ticket-panels/${action.data.panel_id}`)
    }

    const { action }: Props = $props()
</script>
    <div class="breakdown">
        <p><b>panel id:</b> {action.data.panel_id}</p>
        <Button load_with={visit_panel} disabled={action.data.audit_type === "PANEL_REMOVED"}>View Panel</Button>
    </div>
<style lang="scss">

    .breakdown {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>