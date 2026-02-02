<script lang="ts">
    import type { ExpandedAuditLog } from "$lib/types/internal_api";
    import btn_style from "$lib/style/button.module.scss"
	import type { NarrowedLog } from "@watcher/shared";
	import FallBackChannel from "../discord/FallBackChannel.svelte";

    interface Props {
        thread: NarrowedLog<"THREAD_WATCHED"|"THREAD_UNWATCHED", ExpandedAuditLog>
    }

    const { thread }: Props = $props()
</script>


    <FallBackChannel channel_id={thread.data.thread_id} />
    
    {#if thread.data.due_to_monitor}
        <a class={[btn_style.button, btn_style.tetriary, btn_style.inline]} href="./monitors#focus_{thread.data.due_to_monitor}">View Monitor</a>
    {/if}

<style lang="scss">
    .command {
        background-color: var(--secondary-300);
        border-radius: .5rem;
        padding: .25rem;
    }

    .breakdown {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
</style>