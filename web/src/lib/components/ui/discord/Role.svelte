<script lang="ts">
	import type { DiscordRole } from "$lib/types/internal_api";

    interface Props {
        role: DiscordRole
    }
    const { role }: Props = $props()

    const role_colour = $derived(role.color === 0 ? "e3e3e3" : (role.color).toString(16).padStart(6, '0'))
</script>

<p style="--colour: #{role_colour}">@{role.name}</p>

<style lang="scss">
    p {
        border-radius: .2rem;
        font-weight: bold;
        background-color:color-mix(in srgb, var(--colour) 20%, transparent);
        color: var(--colour);
    }
</style>