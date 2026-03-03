<script lang="ts">
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import type { DiscordUser } from '$lib/types/internal_api';

	const guild_state = use_guild_state()

	interface Props {
		user_id: string;
	}

	const { user_id }: Props = $props();

	let user_obj = $state<DiscordUser>();
	let is_err = $state(false);

	$effect(() => {
		guild_state.get_user(user_id).then((res) => {
			if (res.isErr()) {
				console.error(`[DiscordTag] could not fetch user '${user_id}'`, res.error);
				is_err = true;
				return;
			}

			is_err = false;
			user_obj = res.value;
		});
	});
</script>

<span class="ping" class:errored={is_err}>
	{#if user_obj}
		@{user_obj.username}
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
