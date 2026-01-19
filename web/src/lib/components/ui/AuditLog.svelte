<script lang="ts">
	import { guild_state } from '$lib/stores/guild.svelte';
	import type { DiscordChannel, DiscordRole, ExpandedAuditLog } from '$lib/types/internal_api';

	import Channel from './discord/FallBackChannel.svelte';
	import Guild from './discord/Guild.svelte';
	import Role from './discord/Role.svelte';
	interface Props {
		log: ExpandedAuditLog;
		roles: DiscordRole[];
		channels: DiscordChannel[];
		guild_id: string;
	}

	const { log, roles, channels, guild_id }: Props = $props();
	const {
		audit_type,
		executor_id,
		timestamp,
		old_value,
		new_value,
		reason,
		executing_user,
		...rest
	} = log;

	type RenderOption = 'ROLE' | 'CHANNEL' | 'NULL' | 'STRING';
	function render_as(value: string): RenderOption {
		if (value === 'null') return 'NULL';
		if (value.startsWith('<@&')) {
			const role_id = value.substring(3, value.length - 1);

			if (role_id === 'null') {
				return 'NULL';
			}

			if (!roles.find((r) => r.id === role_id)) {
				return 'STRING';
			}

			return 'ROLE';
		}

		if (value.startsWith('<#')) {
			const channel_id = value.substring(2, value.length - 1);

			if (channel_id === 'null') {
				return 'NULL';
			}

			return 'CHANNEL';
		}

		return 'STRING';
	}

	function get_role_from_id(value: string) {
		const role_id = value.substring(3, value.length - 1);
		return roles.find((r) => r.id === role_id);
	}

	function get_channel_from_id(value?: string | null) {
		if (!value) return undefined;
		const channel_id = value.substring(2, value.length - 1);
		return channels.find((c) => c.id === channel_id);
	}

	let render_old_as = old_value ? render_as(old_value) : false;
	let render_new_as = new_value ? render_as(new_value) : false;
	let user_pfp = executing_user.avatar
		? `https://cdn.discordapp.com/avatars/${executing_user.id}/${executing_user.avatar}?size=24`
		: executing_user.defaultAvatarURL;
	const time_as_date = new Date(timestamp);
</script>

{#snippet render_value(render_as: RenderOption | false, value?: string | null)}
	{#if !value}
		<p>null</p>
	{:else if render_as === 'ROLE'}
		<Role role={get_role_from_id(value)!} />
	{:else if render_as === 'CHANNEL'}
		<Channel
			channel={get_channel_from_id(value)}
			channel_id={value.substring(2, value.length - 1)}
		/>
	{:else}
		{value}
	{/if}
{/snippet}

{#snippet target_channel()}
	{#if rest.target_id}
		{#if rest.target_id == rest.guild_id}
			{#if guild_state.guild}<Guild guild={guild_state.guild?.guild} />{/if}
		{:else}
			<Channel channel={get_channel_from_id(rest.target_id)} channel_id={rest.target_id} />
		{/if}
	{:else}
		{rest.target_id}
	{/if}
{/snippet}

<div class="audit">
	{#if audit_type == 'CONFIG_UPDATE'}
		<h3>Config Value Changed</h3>
		<b>{reason}</b>
		<div class="changes">
			<div>
				<p>From</p>
				{@render render_value(render_old_as, old_value)}
			</div>
			<div>
				<p>To</p>
				{@render render_value(render_new_as, new_value)}
			</div>
		</div>
	{:else if audit_type == 'CHANNEL_MONITOR_START'}
		<h3>Channel Monitor Added</h3>
		{@render target_channel()}
	{:else if audit_type == 'CHANNEL_MONITOR_END'}
		<h3>Channel Monitor Removed</h3>
		{@render target_channel()}
	{:else if audit_type == 'COMMAND_EXEC'}
		<h3>Command Executed</h3>
		Command<code>/{rest.command_name}</code> executed.

		{#if rest.error}
			<div class="cmd_error">
				{rest.error}
				<small>Command Error</small>
			</div>
		{/if}
	{:else if audit_type == 'THREAD_UNWATCHED'}
		<h3>Thread Unwatched</h3>
		{@render target_channel()}
	{:else if audit_type == 'THREAD_WATCHED'}
		<h3>Thread Watched</h3>
		{@render target_channel()}
	{:else if audit_type == 'BATCH_ACTION'}
		<h3>Batch {reason}</h3>
		affected<code>{rest.target_id?.split(',').length}</code> threads
	{/if}

	<div class="meta">
		<div class="user" title={executing_user.id} data-user-id={executing_user.id}>
			<img src={user_pfp} alt="{executing_user.username}'s icon" />
			<p>{executing_user.username}</p>
		</div>
		<time datetime={time_as_date.toISOString()}>
			{time_as_date.toLocaleString()}
		</time>
		<small class="id">#{rest.id}</small>
	</div>
</div>

<style lang="scss">
	@use 'sass:color';
	@use '../../../lib/style/colours.scss';

	.audit {
		outline: 1px solid rgba(128, 128, 128, 0.3);
		padding: 0.5rem;
		border-radius: 0.5rem;
	}

	.user {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		img {
			width: 1.5rem;
			border-radius: 50%;
		}
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-top: 0.5rem;
	}

	.changes {
		display: flex;
		gap: 1rem;
	}

	.cmd_error {
		@extend .bg-error-100;
		display: flex;
		flex-direction: column;
		width: fit-content;
		padding: 0.5rem;
		border-radius: 0.5rem;

		& small {
			opacity: 0.7;
		}
	}

	.id {
		opacity: 0.5;
	}
</style>
