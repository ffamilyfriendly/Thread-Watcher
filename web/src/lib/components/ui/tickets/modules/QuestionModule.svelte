<script lang="ts">
	import { ZModalChannelSelect, type TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import RolePicker from '../../settings/RolePicker.svelte';
	import Toggle from '../../Toggle.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import Cheng from './components/Cheng.svelte';
	import style from "$lib/style/pipeline.module.scss"

	const guild_state = use_guild_state()

	interface Props {
		module: TypedPipelineModule<"MODAL_QUESTION">;
	}
	let { module = $bindable() }: Props = $props();

    function new_channel_select() {
        const d = ZModalChannelSelect.parse({  })
        return d
    }
</script>

<BaseModule title="Assign Role" bind:module>
	{#snippet description()}
		Set which role is responsible for this ticket. The <a
			href="https://docs.threadwatcher.xyz/features/tickets/ticket-panels#assigned-role"
			>assigned role</a
		> will be pinged when the ticket is created or updated, and its members will gain access to manage
		the ticket in the dashboard.
	{/snippet}

    {#each module.labels as label (label.component.custom_id)}
        <div class="lable">
            <p>{label.label}</p>
            <p>{label.description}</p>
        </div>

        CONTENT HERE

        <div>
            <p>Component ID</p>
            <input bind:value={label.component.custom_id} />
        </div>
    {/each}
    <button onclick={() => module.labels.push({ label: "New Label", description: "hi", component: new_channel_select() })}>hi</button>
</BaseModule>
