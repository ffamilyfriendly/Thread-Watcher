<script lang="ts">
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import { get_pwetty_relative_time, get_pwetty_relative_time_delta } from '$lib/client/time_util';
	import type { DiscordUser, TicketListData } from '@watcher/shared';
	import User from '../../discord/user/User.svelte';
	import UserLoader from '../../discord/user/UserLoader.svelte';
	import Button from '../../Button.svelte';
	import { ExternalLink } from '@lucide/svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';

	const gs = use_guild_state();

	interface Props {
		data: TicketListData;
	}

	const { data }: Props = $props();
</script>

<div class="entry">
	<div class="head">
		<span
			{@attach s_tooltip(`This ticket is ${data.status.toLowerCase()}`)}
			class="diode {data.status == 'OPEN' ? 'green' : 'gray'}"
		></span>
		<p>{data.name}</p>
		<p class="timestamp">{get_pwetty_relative_time(data.last_activity)}</p>
		<Button href="/tickets/{data.ticket_id}" variant="none"><ExternalLink size="1rem" /></Button>
	</div>

	<div class="body">
		<p>
			Opened by <UserLoader style="inline" user_id={data.owner} />
		</p>
		{#if data.claimed_by_user_id}
			<span class="divider"></span>
			<p>
				Assigned to <UserLoader style="inline" user_id={data.claimed_by_user_id} />
			</p>
		{/if}
	</div>
</div>

<style lang="scss">
	.entry {
		--left_offset: 1rem;
		--head_gap: 0.5rem;
		--total_left_offset: calc(var(--left_offset) + var(--head_gap));
		background-color: var(--background-600);
		padding: 1rem;
		border-radius: 0.25rem;
		border: 1px solid color-mix(in srgb, var(--background-600) 90%, white);

		.head {
			display: grid;
			grid-template-columns: var(--left_offset) 1fr auto auto;
			align-items: center;
			gap: var(--head_gap);

			.timestamp {
				opacity: 0.7;
			}
		}

		.body {
			margin-left: var(--total_left_offset);
			display: flex;
			align-items: center;
			gap: 0.5rem;
			opacity: 0.9;
			margin-top: 0.25rem;

			.divider {
				height: 1rem;
				border-left: 2px solid color-mix(in srgb, var(--background-600) 90%, white);
			}

			p {
				display: inline-flex;
				align-items: center;
				gap: 0.3rem;
			}
		}
	}

	.diode {
		display: inline-block;
		width: 0.6rem;
		height: 0.6rem;
		border-radius: 50%;
		flex-shrink: 0;

		&.green {
			background-color: var(--success-500, #22c55e);
			box-shadow: 0 0 6px color-mix(in srgb, var(--success-500, #22c55e) 60%, transparent);
		}

		&.gray {
			--grayyyy: rgb(74, 74, 74);
			background-color: var(--grayyyy, #ef4444);
			box-shadow: 0 0 6px color-mix(in srgb, var(--grayyyy, #ef4444) 60%, transparent);
		}
	}
</style>
