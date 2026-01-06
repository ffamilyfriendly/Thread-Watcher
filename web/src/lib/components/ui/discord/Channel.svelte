<script lang="ts">
	import type { DiscordChannel } from "$lib/types/internal_api";
	import { Group, Hash, Megaphone, Spool } from "@lucide/svelte";
	import { ResultAsync } from "neverthrow";
	import { onMount } from "svelte";

    interface Props {
        channel?: DiscordChannel
        channel_id: string,
        guild_id: string
    }

    const { channel, channel_id, guild_id }: Props = $props()

    let channel_name = $state(channel?.name)
    let Icon = $state(Hash)

    if(!channel) {
        console.log("NO CHANNEL!")
    }

    set_icon(channel?.type)

    function set_icon(type: number = 0) {
        switch(type) {
            case 0: // GUILD_TEXT
                Icon = Hash
            break;
            case 4: // GUILD_CATEGORY
                Icon = Group
            break;
            case 5: // GUILD_ANNOUNCEMENT
                Icon = Megaphone
            break;
            case 11: // PUBLIC_THREAD
            case 12: // PRIVATE_THREAD
                Icon = Spool
            break;
            default:
                Icon = Hash
        }
    }


    onMount(async () => {
        if(!channel) {
            const fetch_res = await ResultAsync.fromPromise(fetch(`/api/fetch_channel?channel_id=${channel_id}&guild_id=${guild_id}`), (e) => new Error(e?.toString()))

            if(fetch_res.isErr()) {
                return console.error(fetch_res.error)
            }

            if(fetch_res.value.status != 200) {
                channel_name = `Unknown Channel (${channel_id})`
                return
            }

            const json = await ResultAsync.fromPromise(fetch_res.value.json(), (e) => new Error(e?.toString()))

            if(json.isErr()) {
                return console.error(json.error)
            }

            if("name" in json.value) {
                channel_name = json.value.name
            }

            if("type" in json.value) {
                set_icon(json.value.type)
            }
        }
    })
</script>

<p><Icon /> {channel_name}</p>

<style lang="scss">
    p {
        --colour: white;
        display: inline-flex;
        align-items: center;
        gap: .25rem;
        border-radius: .2rem;
        font-weight: bold;
        background-color:color-mix(in srgb, var(--colour) 20%, transparent);
        color: var(--colour);
    }
</style>