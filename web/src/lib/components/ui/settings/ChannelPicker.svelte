<script lang="ts">
	import { fetch_as_json } from "$lib/client/fetch";
	import { ZDiscordChannel, type DiscordChannel } from "$lib/types/internal_api";
	import Channel from "../discord/Channel.svelte";
	import BasePicker from "./BasePicker.svelte";

    interface Props {
        channels: DiscordChannel[],
        value?: string|null,
        guild_id: string
    }

    let { channels, value = $bindable(), guild_id }: Props = $props()

    function fetcher(channel_id: string) {
        return fetch_as_json(`/api/fetch_channel?guild_id=${guild_id}&channel_id=${channel_id}`, undefined, ZDiscordChannel)
    }
</script>

<BasePicker items={channels} bind:value fetcher={fetcher} placeholder="Search Channels">
    {#snippet render_item(channel)} <Channel channel={channel} /> {/snippet}
</BasePicker>