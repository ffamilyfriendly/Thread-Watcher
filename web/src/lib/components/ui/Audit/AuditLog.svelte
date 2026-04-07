<script lang="ts">
	import type { ExpandedAuditLog } from '$lib/types/internal_api';
	import type { NarrowedLog } from '@watcher/shared';
	import ConfigChange from './ConfigChange.svelte';
	import CommandInvokation from './CommandInvokation.svelte';
	import ThreadWatchStatus from './ThreadWatchStatus.svelte';
	import MonitorAdded from './MonitorAdded.svelte';
	import MonitorRemoved from './MonitorRemoved.svelte';
	import BatchAction from './BatchAction.svelte';
	import PanelStatus from './PanelStatus.svelte';
	import TicketStatus from './TicketStatus.svelte';
	import User from '../discord/user/User.svelte';
	import UserLoader from '../discord/user/UserLoader.svelte';
	interface Props {
		log: ExpandedAuditLog;
	}

	const { log }: Props = $props();
	const log_data = $derived(log);
	let executing_user = $derived(log_data.executing_user);
	let timestamp = $derived(log_data.timestamp);

	const time_as_date = $derived(new Date(timestamp));
</script>

<div class="audit">
	<div class="content">
		{#if log_data.data.audit_type == 'CONFIG'}
			<h4 id="type_name">Configuration Changed</h4>
			<ConfigChange log={log_data as NarrowedLog<'CONFIG', ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'MONITOR_ADD'}
			<h4 id="type_name">Monitor Added</h4>
			<MonitorAdded monitor={log_data as NarrowedLog<'MONITOR_ADD', ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'MONITOR_REMOVE'}
			<h4 id="type_name">Monitor Removed</h4>
			<MonitorRemoved monitor={log_data as NarrowedLog<'MONITOR_REMOVE', ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'COMMAND'}
			<h4 class="type_name">Command Ran</h4>
			<CommandInvokation log={log_data as NarrowedLog<'COMMAND', ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'THREAD_UNWATCHED'}
			<h4 class="type_name">Thread Unwatched</h4>
			<ThreadWatchStatus thread={log_data as NarrowedLog<'THREAD_UNWATCHED', ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'THREAD_WATCHED'}
			<h4 class="type_name">Thread Watched</h4>
			<ThreadWatchStatus thread={log_data as NarrowedLog<'THREAD_WATCHED', ExpandedAuditLog>} />
		{:else if log_data.data.audit_type == 'BATCH_ACTION'}
			<h4 class="type_name">Threads Actioned</h4>
			<BatchAction action={log_data as NarrowedLog<'BATCH_ACTION', ExpandedAuditLog>} />
		{:else if ['PANEL_CREATED', 'PANEL_REMOVED'].includes(log_data.data.audit_type)}
			<h4 class="type_name">{log_data.data.audit_type}</h4>
			<PanelStatus
				action={log_data as NarrowedLog<'PANEL_CREATED' | 'PANEL_REMOVED', ExpandedAuditLog>}
			/>
		{:else if ['TICKET_OPENED', 'TICKET_RESOLVED'].includes(log_data.data.audit_type)}
			<h4 class="type_name">{log_data.data.audit_type}</h4>
			<TicketStatus
				ticket={log_data as NarrowedLog<'TICKET_OPENED' | 'TICKET_RESOLVED', ExpandedAuditLog>}
			/>
		{/if}

		{#if log_data.reason}
			<div class="reason">
				<b>Reason:</b> <i>{log_data.reason}</i>
			</div>
		{/if}
	</div>

	<div class="meta">
		{#if executing_user}
			<User user={executing_user} />
		{:else}
			<UserLoader user_id={log_data.executor_id} />
		{/if}
		<div class="user"></div>
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
		opacity: 0.85;
		margin-bottom: 0.5rem;
	}

	.audit {
		--padding: 0.5rem;
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
		opacity: 0.6;
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
