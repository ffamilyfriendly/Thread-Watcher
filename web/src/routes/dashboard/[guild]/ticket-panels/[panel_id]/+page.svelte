<script lang="ts">
	import Pipeline from '$lib/components/ui/tickets/Pipeline.svelte';
	import type { PipelineModule } from '@watcher/shared';
	import type { PageData, PageProps } from './$types.js';
	import { init_pipeline_state } from '$lib/stores/pipeline.svelte.js';
	import SettingBox from '$lib/components/ui/settings/SettingBox.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';

	const TEST_MODULES: PipelineModule[] = [
		{
			type: 'ASSIGN_ROLE',
			id: 'test_component_1',
			uid: 'test_1',
			conditional_type: 'OR',
			conditionals: [
				{
					value_1: 'test_component_1',
					operand: 'not_null'
				}
			]
		},
		{
			type: 'GENERATE_ANSWER',
			id: 'gen_ai_slop_ans',
			uid: 'test_2',
			conditional_type: 'AND',
			conditionals: []
		}
	];

	const { data, params }: PageProps = $props();

	let panel_name = $state<string>();
	let panel_description = $state<string>();

	const pipeline_state = init_pipeline_state(TEST_MODULES);
	let assign_role = $state<string>();

	$effect(() => {
		if (!data.panel) return;

		const { name, description } = data.panel;

		if (name) panel_name = name;
		if (description) panel_description = description;

		if (data.panel.pipeline) {
			pipeline_state.set_modules(data.panel.pipeline);
		}

		assign_role = data.panel.initial_assigned_role;

		init_pipeline_state(data.panel?.pipeline ?? []);
	});

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
	</div>

	<div class="sidebar">
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
