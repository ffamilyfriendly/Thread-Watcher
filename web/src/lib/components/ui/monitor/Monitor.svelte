<script lang="ts">
	import type { ChannelMonitor, DiscordChannel } from "$lib/types/internal_api";
	import Channel from "../discord/Channel.svelte";
	import FallBackChannel from "../discord/FallBackChannel.svelte";

    interface Props {
        channels: DiscordChannel[],
        guild_id: string,
        monitor: ChannelMonitor
    }

    const { monitor, channels, guild_id, ...rest }: Props = $props()

    const channel_obj = $derived(channels.find(c => c.id === monitor.id))

</script>

<div class="monitor">
    <div class="pill">
        <p>Target</p>
        <FallBackChannel channel_id={monitor.id} guild_id={guild_id} channel={channel_obj} />
    </div>
</div>

<style lang="scss">
    .monitor {
        padding: 1rem;
        outline: 1px solid rgba(255, 255, 255, 0.2);
        border-radius: .5rem;
    }

    .pill {
        display: flex;
        align-items: center;
        gap: .5rem;
        background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
        width: fit-content;
        padding: .5rem 1rem;
        border-radius: .75rem;
        outline: 1px solid var(--primary-500);
    }
</style>