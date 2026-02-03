<script lang="ts">
    import type { ExpandedAuditLog } from "$lib/types/internal_api";
    import btn_style from "$lib/style/button.module.scss"
	import type { NarrowedLog } from "@watcher/shared";
	import FallBackChannel from "../discord/FallBackChannel.svelte";

    interface Props {
        monitor: NarrowedLog<"MONITOR_REMOVE", ExpandedAuditLog>
    }

    const { monitor }: Props = $props()
</script>
    <div class="breakdown">
        <FallBackChannel clickable={true} channel_id={monitor.data.target_channel} />
    </div>
<style lang="scss">

    .breakdown {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>