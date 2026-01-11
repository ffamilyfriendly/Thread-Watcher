<script lang="ts">
	import { fetch_as_json } from "$lib/client/fetch";
	import { ZDiscordRole, type DiscordRole } from "$lib/types/internal_api";
	import Role from "../discord/Role.svelte";
	import BasePicker from "./BasePicker.svelte";

    interface Props {
        roles: DiscordRole[],
        value?: string|null,
        guild_id: string
    }

    let { roles, value = $bindable(), guild_id }: Props = $props()

    function fetcher(role_id: string) {
        return fetch_as_json(`/api/fetch_role?guild_id=${guild_id}&role_id=${role_id}`, undefined, ZDiscordRole)
    }
</script>

<BasePicker items={roles} bind:value fetcher={fetcher} placeholder="Search Roles">
    {#snippet render_item(role)} <Role role={role} /> {/snippet}
</BasePicker>