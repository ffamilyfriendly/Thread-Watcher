<script lang="ts">
	import { get_pwetty_relative_time } from '$lib/client/time_util';
	import { guild_state } from '$lib/stores/guild.svelte';
	import { CircleAlert, CircleX, Eye } from '@lucide/svelte';
	import type { HydratedThreadData } from '@watcher/shared';

	interface Props {
		thread: HydratedThreadData;
	}

	const { thread }: Props = $props();

	function get_pwetty_number_as_string(n: number | null) {
		if (n === 10) return `10+`;
		if (n === 0) return `no`;
		if (n === -1) return `could not fetch`;
		return n?.toString();
	}
</script>

<div class="watched_thread">
	<div class="head">
		<a
			class="thread_name"
			href="https://discord.com/channels/{guild_state.guild_id}/{thread.thread_id}"
			target="_blank"
		>
			<span>{thread.display_name}</span>
		</a>

		{#if thread.parent_channel}
			{@const p = thread.parent_channel}
			<a
				class="parent_name"
				href="https://discord.com/channels/{guild_state.guild_id}/{p.channel_id}"
				target="_blank">#{p.display_name}</a
			>
		{/if}
	</div>

	<div class="thread_activity">
		<span>{get_pwetty_number_as_string(thread.recent_messages_count)} recent messages</span>
		<p class="dot"></p>
		{get_pwetty_relative_time(thread.last_activity, 'narrow')}
	</div>

	{#if thread.managed_by}
		<div class="notice">
			<Eye size={18} />
			<span>Watched by <a href="./monitors#focus_{thread.managed_by}">this monitor</a></span>
		</div>
		<!--- do shit here -->
	{/if}

	{#if thread.thread_bump_mode == 'MESSAGE'}
		<div class="notice warn">
			<CircleAlert size={18} />
			<span>
				This thread will be bumped with a message. <a
					href="https://docs.threadwatcher.xyz/common-issues/bump-issues#unlocking-silent-bumps"
					>Learn why</a
				>
			</span>
		</div>
	{:else if thread.thread_bump_mode === 'CANNOT_BUMP'}
		<div class="notice err">
			<CircleX size={18} />
			<span>
				This thread <b>cannot</b> be bumped.
				<a href="https://docs.threadwatcher.xyz/common-issues/bump-issues">Learn why</a>
			</span>
		</div>
	{/if}
</div>

<style lang="scss">
	:global(.parent_channel_link) {
		background-color: transparent !important;
		gap: 0.1rem !important;
		font-size: smaller;
		opacity: 0.7;
	}

	:global(.parent_channel_link > svg) {
		height: 1rem;
		width: 1rem;
	}

	.watched_thread {
		outline: 1px solid var(--secondary-600);
		padding: 0.5rem;
		border-radius: 0.5rem;
	}

	.head {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		.thread_name {
			font-weight: bold;
			color: inherit;
			text-decoration: none;
		}

		.parent_name {
			opacity: 0.67;
			color: inherit;
			text-decoration: none;
			font-size: smaller;
		}
	}

	.thread_activity {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		opacity: 0.8;

		.dot {
			width: 0.25rem;
			height: 0.25rem;
			border-radius: 50%;
			background-color: var(--primary-800);
		}
	}

	.notice {
		display: flex;
		align-items: center;
		font-size: smaller;
		gap: 0.25rem;
		opacity: 0.67;
		margin-top: 0.25rem;

		a {
			color: inherit;
			font-weight: bolder;
		}

		&.err {
			color: red;
		}

		&.warn {
			color: orange;
		}
	}
</style>
