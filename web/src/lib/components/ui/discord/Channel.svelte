<script lang="ts">
	import type { DiscordChannel } from "$lib/types/internal_api";
	import { Group, Hash, Megaphone, Spool } from "@lucide/svelte";

    interface Props {
        channel: DiscordChannel
    }

    const { channel }: Props = $props()

    const Icon = $derived.by(() => {
        switch(channel.type) {
            case 0: // GUILD_TEXT
                return Hash
            case 4: // GUILD_CATEGORY
                return Group
            case 5: // GUILD_ANNOUNCEMENT
               return Megaphone
            case 11: // PUBLIC_THREAD
            case 12: // PRIVATE_THREAD
                return Spool
            default:
                return Hash
        }
    })

</script>

<p><Icon /> {channel.name}</p>

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