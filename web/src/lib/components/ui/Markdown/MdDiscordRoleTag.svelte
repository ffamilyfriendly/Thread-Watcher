<script lang="ts">
	import { guild_state } from '$lib/stores/guild.svelte';
	import type { DiscordRole } from '$lib/types/internal_api';

	interface Props {
		role_id: string;
	}

	const { role_id }: Props = $props();

	let role_obj = $state<DiscordRole>();
	let is_err = $state(false);

	$effect(() => {
		guild_state.get_role(role_id).then((res) => {
			if (res.isErr()) {
				console.error(`[DiscordRoleTag] could not fetch role '${role_id}'`, res.error);
				is_err = true;
				return;
			}

			is_err = false;
			role_obj = res.value;
		});
	});
</script>

<span class="ping" style="--ping_clr: #{role_obj?.color.toString(16)}" class:errored={is_err}>
	{#if role_obj}
		@{role_obj.name}
	{:else if is_err}
		error
	{:else}
		Loading...
	{/if}
</span>

<style lang="scss">
	.ping {
		--ping_clr: #25ace8;
		color: var(--ping_clr);
		background-color: color-mix(in srgb, var(--ping_clr) 25%, transparent);
		padding: 0 0.25rem;
		border-radius: 0.25rem;

		&.errored {
			--ping_clr: var(--error-800);
		}
	}
</style>
