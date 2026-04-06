<script lang="ts">
    import type { ExpandedAuditLog } from "$lib/types/internal_api";
	import type { NarrowedLog } from "@watcher/shared";
	import Button from "../Button.svelte";
	import { goto } from "$app/navigation";

    interface Props {
        ticket: NarrowedLog<"TICKET_OPENED" | "TICKET_RESOLVED", ExpandedAuditLog>
    }

    async function view_ticket() {
        await goto(`/tickets/${ticket.data.ticket_id}`)
    }

    const { ticket }: Props = $props()
</script>
    <div class="breakdown">
        <Button load_with={view_ticket}>View Transcript</Button>
    </div>
<style lang="scss">

    .breakdown {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>