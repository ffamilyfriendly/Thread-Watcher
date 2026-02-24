<script lang="ts">
	import Pipeline from '$lib/components/ui/tickets/Pipeline.svelte';
	import type { PipelineModule } from '@watcher/shared';
	import type { PageProps } from './$types.js';
	import { clean_or_throw, init_pipeline_state } from '$lib/stores/pipeline.svelte.js';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import { CAN_HOLD_THREADS } from '$lib/types/discord.js';
	import { ResultAsync } from 'neverthrow';
	import { map_err } from '$lib/error_helper.js';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import btn_style from '$lib/style/button.module.scss';
	import { Clipboard } from '@lucide/svelte';

	const TEST_MODULES: PipelineModule[] = [
		{
			uid: '4f22d4d9-a252-4610-90cd-f959f76662b9',
			id: 'rhyme_username',
			conditional_type: 'AND',
			conditionals: [],
			type: 'GENERATE_ANSWER'
		},
		{
			uid: '4da3f6e0-8a77-4d97-ad75-76f80f5a3f97',
			id: 'rhymes_w_orange_lol',
			conditional_type: 'AND',
			conditionals: [
				{ value_1: '{{rhyme_username.answer}}', operand: 'includes', value_2: 'orange' }
			],
			type: 'ASSIGN_ROLE',
			role_id: '1460017237233504348'
		}
	];

	const { data, params }: PageProps = $props();

	let panel_name = $state<string>();
	let panel_description = $state<string>();

	let pipeline_state = init_pipeline_state(TEST_MODULES);
	let assign_role = $state<string>();
	let assign_channel = $state<string>();

	$effect(() => {
		if (!data.panel) return;

		const { name, description } = data.panel;

		if (name) panel_name = name;
		if (description) panel_description = description;

		if (data.panel.pipeline) {
			pipeline_state.set_modules(clean_or_throw(data.panel.pipeline));
		}

		assign_role = data.panel.initial_assigned_role;
		assign_channel = data.panel.initial_channel_id;

		pipeline_state = init_pipeline_state(data.panel?.pipeline ?? []);
	});

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

	const create_new = $derived(params.panel_id === 'new');
</script>

<main class="view">
	<div class="panel_meta">
		<h1>{panel_name ?? 'Ticket Panel'}</h1>
		<p>{panel_description ?? 'this is a description just tryna test stuff'}</p>
	</div>

	<div class="pipeline">
		<h2>Opening Embed</h2>
		put an embed generator thing here please

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
				bind:value={assign_channel}
			/>
		</div>
		<div class="option">
			<h3>Assigned Role</h3>
			<RolePicker roles={data.roles} bind:value={assign_role} />
		</div>
		<div class="option">
			<h3>Watch Ticket</h3>
			toggle for if tickets should be watched
		</div>
		<div class="option">
			<h3>Opening Method</h3>
			maybe tabbed view here for button alt. multiselect
		</div>
		<div class="option">
			<h3>Close Method</h3>
			What we want to do when a ticket is resolved. Maybe: Delete Thread, Un-Watch thread, nothing
		</div>
	</div>
</main>

<style lang="scss">
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
	}

	.sidebar {
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
