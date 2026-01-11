<script lang="ts">
	import { fetch_as_json } from "$lib/client/fetch";
	import { ZDiscordChannel, type DiscordChannel } from "$lib/types/internal_api";
	import Channel from "./Channel.svelte";

    interface Props {
        channel?: DiscordChannel,
        channel_id: string
        guild_id: string
    }

    const { channel, guild_id, channel_id }: Props = $props()

    let fetched_channel = $state<DiscordChannel|null>(null)

    const use_channel = $derived(channel ?? fetched_channel)

    $effect(() => {
        if(!channel) {
            fetch_as_json(`/api/fetch_channel?guild_id=${guild_id}&channel_id=${channel_id}`, undefined, ZDiscordChannel)
            .then(res => {
                if(res.isErr()) {
                    console.error("could not fetch channel", res.error)
                    return
                }

                fetched_channel = res.value
            })
        }
    })
</script>

{#if use_channel}
    <Channel channel={use_channel} />
{:else}
    could not fetch channel
{/if}