<script lang="ts">
	import type { ExpandedAuditLog } from '$lib/types/internal_api';
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
	{#if log_data.data.audit_type == 'CONFIG'}{:else if log_data.data.audit_type == 'MONITOR_ADD'}{:else if log_data.data.audit_type == 'MONITOR_REMOVE'}{:else if log_data.data.audit_type == 'COMMAND'}{:else if log_data.data.audit_type == 'THREAD_UNWATCHED'}{:else if log_data.data.audit_type == 'THREAD_WATCHED'}{:else if log_data.data.audit_type == 'BATCH_ACTION'}{/if}

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
