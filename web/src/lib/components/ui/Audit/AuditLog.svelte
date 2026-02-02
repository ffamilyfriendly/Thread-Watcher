<script lang="ts">
	import type { ExpandedAuditLog } from '$lib/types/internal_api';
	import type { NarrowedLog } from '@watcher/shared';
	import ConfigChange from './ConfigChange.svelte';
	import CommandInvokation from './CommandInvokation.svelte';
	import ThreadWatchStatus from './ThreadWatchStatus.svelte';
	interface Props {
		log: ExpandedAuditLog;
	}

	const { log }: Props = $props();
	const log_data = $derived(log);
	let executing_user = $derived(log_data.executing_user);
	let timestamp = $derived(log_data.timestamp);

	let user_pfp = $derived(
		executing_user.avatar
			? `https://cdn.discordapp.com/avatars/${executing_user.id}/${executing_user.avatar}?size=24`
			: executing_user.defaultAvatarURL
	);
	const time_as_date = $derived(new Date(timestamp));
</script>

<div class="audit">
	<div class="content">
		{#if log_data.data.audit_type == 'CONFIG'}
			<h4 id="type_name">Configuration Changed</h4>
			<ConfigChange log={log_data as NarrowedLog<"CONFIG", ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'MONITOR_ADD'}
				monitor added
		{:else if log_data.data.audit_type == 'MONITOR_REMOVE'}
				monitor removed
		{:else if log_data.data.audit_type == 'COMMAND'}
			<h4 class="type_name">Command Ran</h4>
			<CommandInvokation log={log_data as NarrowedLog<"COMMAND", ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'THREAD_UNWATCHED'}
			<h4 class="type_name">Thread Unwatched</h4>
			<ThreadWatchStatus thread={log_data as NarrowedLog<"THREAD_UNWATCHED", ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'THREAD_WATCHED'}
			<h4 class="type_name">Thread Watched</h4>
			<ThreadWatchStatus thread={log_data as NarrowedLog<"THREAD_WATCHED", ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'BATCH_ACTION'}
					batch action
		{/if}

		{#if log_data.reason}
		<div class="reason">
			<b>Reason:</b> <i>{log_data.reason}</i>
		</div>
		{/if}
	</div>

	<div class="meta">
		<div class="user" title={executing_user.id} data-user-id={executing_user.id}>
			<img src={user_pfp} alt="{executing_user.username}'s icon" />
			<p>{executing_user.username}</p>
		</div>
		<time datetime={time_as_date.toISOString()}>
			{time_as_date.toLocaleString()}
		</time>
		<small class="id">#{log_data.id}</small>
	</div>
</div>

<style lang="scss">
	@use 'sass:color';
	@use '../../../../lib/style/colours.scss';

	.type_name {
		opacity: .85;
		margin-bottom: .5rem;
	}

	.audit {
		--padding: .5rem;
		outline: 1px solid rgba(128, 128, 128, 0.3);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.content {
		padding: var(--padding);
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

	.reason {
		opacity: .6;
	}

	.meta {
		padding: var(--padding);
		background-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
		border-top: 1px solid color-mix(in srgb, var(--primary-500), transparent);
		display: flex;
		align-items: center;
		gap: 1rem;
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
