<script lang="ts">
	import type { DiscordUser } from "@watcher/shared";
	import User from "./User.svelte";
	import { use_guild_state } from "$lib/stores/guild.svelte";
	import { add_toast_from_error } from "$lib/state/toasts.svelte";
	import { map_err } from "$lib/error_helper";

    interface Props {
        user_id: string
    }

    const { user_id }: Props = $props()

    let is_loading = $state(true)
    let user = $state<DiscordUser>()
    const gs = use_guild_state()

    $effect(() => {
        gs.get_user(user_id).then(res => {
            is_loading = false
            if(res.isErr()) return add_toast_from_error(map_err(res.error))
            user = res.value
        })
    })
</script>
{#if user}
    <User user={user} />
{:else if is_loading}
    <div class="skeleton">

    </div>
{/if}
