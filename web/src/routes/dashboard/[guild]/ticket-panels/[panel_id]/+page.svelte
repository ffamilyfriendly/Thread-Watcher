<script lang="ts">
	import Pipeline from '$lib/components/ui/tickets/Pipeline.svelte';
	import type { PipelineModule } from '@watcher/shared';
import type { PageData, PageProps } from './$types.js';

	const TEST_MODULES: PipelineModule[] = [
		{
			type: "ASSIGN_ROLE",
			id: "test_component_1",
			uid: "test_1",
			conditional_type: "AND",
			conditionals: []
		},
		{
			type: "GENERATE_ANSWER",
			id: "gen_ai_slop_ans",
			uid: "test_2",
			conditional_type: "AND",
			conditionals: []
		}
	]


	const { data, params }: PageProps = $props();

	let panel_name = $state<string>()
	let panel_description = $state<string>()
	let modules = $state<PipelineModule[]>(TEST_MODULES)

	$effect(() => {
		if(!data.panel) return

		const { name, description, pipeline } = data.panel

		if(name) panel_name = name
		if(description) panel_description = description
		modules = pipeline
	})

	const create_new = $derived(params.panel_id === 'new');
</script>

<div class="panel_meta">
	<h1>{panel_name ?? "Ticket Panel"}</h1>
	<p>{panel_description ?? "this is a description just tryna test stuff"}</p>
</div>



<h1>Pipeline</h1>
<Pipeline bind:modules={modules} />

<style lang="scss">
	.panel_meta {
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		outline: 2px dashed var(--primary-500);
		padding: .5rem 1rem;
		border-radius: .5rem;
		max-width: 60ch;

		h1 {
			padding-top: .25rem;
			padding-bottom: .1rem;
		}

		p {
			opacity: .6;
		}
	}
</style>