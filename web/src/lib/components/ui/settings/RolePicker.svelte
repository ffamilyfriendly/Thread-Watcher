<script lang="ts">
	import { fetch_as_json } from '$lib/client/fetch';
	import { ZDiscordRole, type DiscordRole } from '$lib/types/internal_api';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import Role from '../discord/Role.svelte';
	import BasePicker from './BasePicker.svelte';
	import { err } from 'neverthrow';

	const guild_state = use_guild_state()

	interface Props {
		roles: DiscordRole[];
		value?: string | string[] | null;
		multiple?: boolean;
		disabled?: boolean;
	}

	let { roles, value = $bindable(), multiple = false, disabled }: Props = $props();

	function fetcher(role_id: string) {
		const g_id = guild_state.guild_id;

		if (!g_id || g_id === '') {
			return err(new Error('no guild id!'));
		}

		return fetch_as_json(
			`/api/fetch_role?guild_id=${guild_state.guild_id}&role_id=${role_id}`,
			undefined,
			ZDiscordRole
		);
	}
</script>

{#if guild_state.guild_id}
	<BasePicker {multiple} {disabled} items={roles} bind:value {fetcher} placeholder="Search Roles">
		{#snippet render_item(role)}
			<Role {role} />
		{/snippet}
	</BasePicker>
{/if}
