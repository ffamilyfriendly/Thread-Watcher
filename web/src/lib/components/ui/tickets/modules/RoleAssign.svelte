<script lang="ts">
	import type { PipelineModule, TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import RolePicker from '../../settings/RolePicker.svelte';
	import { guild_state } from '$lib/stores/guild.svelte';

	interface Props {
		module: TypedPipelineModule<'ASSIGN_ROLE'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="Assign Role" accent="#5865F2" bind:module>
	{#snippet description()}
		Set which role is responsible for this ticket. The <a
			href="https://docs.threadwatcher.xyz/features/tickets/ticket-panels#assigned-role"
			>assigned role</a
		> will be pinged when the ticket is created or updated, and its members will gain access to manage
		the ticket in the dashboard.
	{/snippet}
	<RolePicker bind:value={module.role_id} roles={guild_state.roles} />
</BaseModule>
