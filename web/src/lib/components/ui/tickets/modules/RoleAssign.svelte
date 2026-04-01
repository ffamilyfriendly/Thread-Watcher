<script lang="ts">
	import type { TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import RolePicker from '../../settings/RolePicker.svelte';
	import Toggle from '../../Toggle.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import Cheng from './components/Cheng.svelte';
	import style from "$lib/style/pipeline.module.scss"

	const guild_state = use_guild_state()

	interface Props {
		module: TypedPipelineModule<'ASSIGN_ROLE'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="Assign Role" bind:module>
	{#snippet description()}
		Defines which role(s) are responsible for handing this ticket. <a href="https://docs.threadwatcher.xyz/features/tickets/ticket-panels#assigned-role">Assigned Roles</a> will be pinged when the ticket is created and their members will be able to view, manage, and resolve the ticket.
	{/snippet}
	<RolePicker bind:value={module.role_id} roles={guild_state.roles} />

	<Cheng title="Append" description="Add this role to 'assigned roles' instead of replacing">
		<Toggle bind:value={module.append} />
	</Cheng>
</BaseModule>
