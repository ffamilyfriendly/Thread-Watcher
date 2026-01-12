<script lang="ts">
	import { fetch_as_json } from "$lib/client/fetch";
	import { ZDiscordChannel, type DiscordChannel } from "$lib/types/internal_api";
	import Channel from "../discord/Channel.svelte";
	import BasePicker from "./BasePicker.svelte";

    interface Props {
        channels: DiscordChannel[],
        value?: string|null,
        guild_id: string,
        only_with_types?: number[]
    }

    
    let { channels, value = $bindable(), guild_id, only_with_types }: Props = $props()
    const channels_to_show = $derived(only_with_types ? channels.filter(c => only_with_types.includes(c.type)) : channels)

    function fetcher(channel_id: string) {
        return fetch_as_json(`/api/fetch_channel?guild_id=${guild_id}&channel_id=${channel_id}`, undefined, ZDiscordChannel)
    }
</script>

<BasePicker items={channels_to_show} bind:value fetcher={fetcher} placeholder="Search Channels">
    {#snippet render_item(channel)} <Channel channel={channel} /> {/snippet}
</BasePicker>