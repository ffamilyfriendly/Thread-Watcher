<script lang="ts">
	import type { TypedPipelineModule } from '@watcher/shared';
	import { MODULE_COMPONENTS, type RenderableModuleTypes } from './modules/module_registry';
	import type { Component } from 'svelte';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import ModuleDrawer from './ModuleDrawer.svelte';
	import DropArea from './DropArea.svelte';
	import DefaultPipelines from './DefaultPipelines.svelte';
	import { flip } from 'svelte/animate';

	const pipe_state = use_pipeline();

	function get_module_component(type: RenderableModuleTypes) {
		return MODULE_COMPONENTS[type] as Component<{ module: TypedPipelineModule<typeof type> }>;
	}

	function handle_reorder(idx: number, module_uid: string) {
		pipe_state.move_module(idx, module_uid);
	}

	function handle_create(idx: number, module_type_unchecked: string) {
		pipe_state.create_module_with_defaults(idx, module_type_unchecked);
		console.log('CREATED', module_type_unchecked);
	}

	const safe_modules = $derived(pipe_state.safe_modules());
</script>

<ModuleDrawer
	on_click={(unchecked_module_type) => {
		handle_create(pipe_state.modules.length, unchecked_module_type);
	}}
/>

<div class="pipeline">
	{#if safe_modules.length === 0}
		<DefaultPipelines />
	{/if}

	<div class="items">
		{#each safe_modules as mod, index (mod.uid)}
			{@const ModuleComponent = get_module_component(mod.type)}

			<!-- Adding an animation here was a GOATED (albeit accidental) move. Much nicer :D -->
			<div animate:flip={{ duration: 300 }}>
				<DropArea on_create_here={handle_create} on_move={handle_reorder} idx={index} />
				<ModuleComponent bind:module={safe_modules[index]} />
			</div>
		{/each}
		<DropArea
			on_create_here={handle_create}
			on_move={handle_reorder}
			idx={pipe_state.modules.length}
		/>
	</div>
</div>

<style lang="scss">
	.pipeline {
		min-height: 350px;
		position: relative;
		display: flex;
		max-width: 100%;
	}

	.items {
		gap: 1rem;
		flex: 1;
		display: flex;
		flex-direction: column;
	}
</style>
