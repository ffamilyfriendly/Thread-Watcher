<script lang="ts">
	import type { TypedPipelineModule } from '@watcher/shared';
	import common from '$lib/style/common.module.scss';
	import BaseModule from './BaseModule.svelte';
	import RolePicker from '../../settings/RolePicker.svelte';
	import Toggle from '../../Toggle.svelte';
	import { Info } from '@lucide/svelte';
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import { use_guild_state } from '$lib/stores/guild.svelte';

	const guild_state = use_guild_state()

	interface Props {
		module: TypedPipelineModule<'ASSIGN_ROLE'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="Assign Role" bind:module>
	{#snippet description()}
		Set which role is responsible for this ticket. The <a
			href="https://docs.threadwatcher.xyz/features/tickets/ticket-panels#assigned-role"
			>assigned role</a
		> will be pinged when the ticket is created or updated, and its members will gain access to manage
		the ticket in the dashboard.
	{/snippet}
	<RolePicker bind:value={module.role_id} roles={guild_state.roles} />

	<div class={[common.row, common.gap_medium]}>
		<Info
			size={16}
			color={'var(--primary-900)'}
			{@attach s_tooltip('Append role to "Assigned Roles" or replace')}
		/>
		<b>append</b>
		<Toggle bind:value={module.append} />
	</div>
</BaseModule>
