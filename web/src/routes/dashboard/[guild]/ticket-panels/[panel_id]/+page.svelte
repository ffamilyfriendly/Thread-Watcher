<script lang="ts">
	import Pipeline from '$lib/components/ui/tickets/Pipeline.svelte';
	import type { ButtonStart, SelectionStart } from '@watcher/shared';
	import type { PageProps } from './$types.js';
	import { init_pipeline_state } from '$lib/stores/pipeline.svelte.js';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import { CAN_HOLD_THREADS } from '$lib/types/discord.js';
	import { ResultAsync } from 'neverthrow';
	import { map_err } from '$lib/error_helper.js';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import btn_style from '$lib/style/button.module.scss';
	import { Clipboard } from '@lucide/svelte';
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import EmbedConfigurator from '$lib/components/ui/tickets/EmbedConfigurator.svelte';
	import EditableAttribute from '$lib/components/ui/tickets/EditableAttribute.svelte';
	import TabbedView from '$lib/components/ui/TabbedView.svelte';
	import ButtonConfigurator from '$lib/components/ui/tickets/ButtonConfigurator.svelte';
	import StringSelectConfigurator from '$lib/components/ui/tickets/StringSelectConfigurator.svelte';
	import { fetch_as_json } from '$lib/client/fetch.js';
	import { use_guild_state } from '$lib/stores/guild.svelte.js';
	import common from '$lib/style/common.module.scss';
	import z from 'zod';
	import { goto } from '$app/navigation';

	const { data, params }: PageProps = $props();

	const guild_state = use_guild_state();

	// svelte-ignore state_referenced_locally
	let pipeline_state = $state(init_pipeline_state(guild_state.guild_id_throws, data.panel));

	let init_w_btn_state = $state<ButtonStart>(
		pipeline_state.panel.commencement_method.type === 'BUTTON'
			? pipeline_state.panel.commencement_method
			: { type: 'BUTTON', button_text: 'Open Ticket' }
	);

	let init_w_select_state = $state<SelectionStart>(
		pipeline_state.panel.commencement_method.type === 'SELECTION'
			? pipeline_state.panel.commencement_method
			: { type: 'SELECTION', placeholder: 'Select a reason', options: [] }
	);

	async function export_pipeline_as_json() {
		const as_json = JSON.stringify(pipeline_state.modules);

		const could_set_clipboard = await ResultAsync.fromPromise(
			navigator.clipboard.writeText(as_json),
			map_err
		);
		if (could_set_clipboard.isErr()) add_toast_from_error(could_set_clipboard.error);

		add_toast({
			label: 'Yay!',
			message: 'pipeline data saved to your clipboard',
			type: 'success'
		});
	}

	function handle_tab_change(new_id: number) {
		if (new_id === 0 && init_w_btn_state) {
			pipeline_state.panel.commencement_method = init_w_btn_state;
		} else if (init_w_select_state) {
			pipeline_state.panel.commencement_method = init_w_select_state;
		}
	}

	async function create_ticket() {
		const panel_validation_result = pipeline_state.get_panel();

		if (!panel_validation_result.success) {
			return add_toast_from_error(panel_validation_result.error);
		}

		const res = await fetch_as_json(
			`/api/panel`,
			{
				body: JSON.stringify(panel_validation_result.data),
				method: "PUT"
			},
			z.object({ panel_id: z.string().default(pipeline_state.panel.panel_id) })
		);

		if (res.isErr()) {
			return add_toast_from_error(res.error);
		}

		add_toast({ type: 'success', message: 'updated panel!', timeout: 1500 });
		
	}

	async function update_message() {
		const res = await fetch_as_json(
			`/api/panel/${pipeline_state.panel.panel_id}/send_message`,
			{
				method: 'POST',
				body: JSON.stringify({
					panel_id: pipeline_state.panel.panel_id,
					guild_id: guild_state.guild_id
				})
			},
			z.object({ message_id: z.string() })
		);

		if (res.isErr()) return add_toast_from_error(res.error);

		console.log(res.value);
		alert('OK');
	}
</script>

<main class="view">
	<div class="panel_meta">
		<EditableAttribute maxlength={50} bind:value={pipeline_state.panel.name}>
			{#snippet display(v)}
				<h1>{v ?? '<no title>'}</h1>
			{/snippet}
		</EditableAttribute>
		<EditableAttribute
			width="65ch"
			bind:value={pipeline_state.panel.description}
			use_text_area={true}
		>
			{#snippet display(v)}
				<p>{v ?? '<no description>'}</p>
			{/snippet}
		</EditableAttribute>
	</div>

	<div class="pipeline">
		<h2>Panel Embed</h2>
		<EmbedConfigurator bind:value={pipeline_state.panel.commencement_embed} />

		{#snippet btn_conf()}
			<ButtonConfigurator bind:value={init_w_btn_state} />
		{/snippet}
		{#snippet select_conf()}
			<StringSelectConfigurator
				bind:options={init_w_select_state.options}
				bind:placeholder={init_w_select_state.placeholder}
			/>
		{/snippet}

		<TabbedView
			inverted={true}
			on_change={handle_tab_change}
			tabs={[
				{
					label: 'Button',
					content: btn_conf
				},
				{
					label: 'Select',
					content: select_conf
				}
			]}
		/>

		<h2>Resolve Embed</h2>
		<EmbedConfigurator bind:value={pipeline_state.panel.resolve_embed} use_variable_picker={true} />

		<h2>Pipeline</h2>
		<Pipeline />
		<button class={[btn_style.button, btn_style.tetriary]} onclick={export_pipeline_as_json}>
			<Clipboard />
			Copy
		</button>
	</div>

	<div class="sidebar">
		<div class="option">
			<h3>Assigned Channel</h3>
			<ChannelPicker
				channels={data.channels}
				guild_id={data.guild_id}
				only_with_types={CAN_HOLD_THREADS}
				bind:value={pipeline_state.panel.initial_channel_id}
			/>
		</div>
		<div class="option">
			<h3>Assigned Roles</h3>
			<RolePicker
				roles={data.roles}
				multiple={true}
				bind:value={pipeline_state.panel.initial_assigned_roles}
			/>
		</div>
		<div class="option row">
			<h3>Watch Ticket</h3>
			<Toggle bind:value={pipeline_state.panel.should_watch_ticket} />
		</div>
		<div class="option row">
			<h3>Summarize Ticket</h3>
			<Toggle bind:value={pipeline_state.panel.should_GPT_summarize_ticket} />
		</div>
		<div class="option">
			<h3>Close Method</h3>
			What we want to do when a ticket is resolved. Maybe: Delete Thread, Un-Watch thread, nothing
		</div>

		<div class={[common.row, common.gap_medium]}>
			<button
				onclick={update_message}
				class={[btn_style.button, btn_style.tetriary, 'updatebtn']}
			>
				Send Embed
			</button>

			<button onclick={create_ticket} class={[btn_style.button, btn_style.primary, 'updatebtn']}>
				Update
			</button>
		</div>
	</div>
</main>

<style lang="scss">
	.updatebtn {
		flex: 1;
	}
	.option {
		&.row {
			display: flex;
			justify-content: space-between;
			align-items: center;
		}
	}

	.view {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 300px;
		gap: 1rem;
		align-items: start;
		grid-template-areas:
			'head head head'
			'pipe pipe side'
			'pipe pipe side';
	}

	.pipeline {
		grid-area: pipe;
		width: 100%;
		min-width: 0;
		min-height: 100vh;

		h2 {
			margin-top: 1rem;
		}
	}

	.sidebar {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		width: 300px;
		grid-area: side;
		position: sticky;
		top: 1rem;
		min-height: 500px;
		outline: 2px dashed var(--primary-500);
		border-radius: 0.5rem;
	}

	.panel_meta {
		grid-area: head;
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		outline: 2px dashed var(--primary-500);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		width: 100%;

		h1 {
			padding-top: 0.25rem;
			padding-bottom: 0.1rem;
		}

		p {
			opacity: 0.6;
		}
	}
</style>
