<script lang="ts">
	import type { Pipeline, PipelineModule, TypedPipelineModule } from "@watcher/shared";
	import { MODULE_COMPONENTS } from "./modules/module_registry";
	import type { Component } from "svelte";

    interface Props {
        modules: Pipeline
    }

    const { modules = $bindable() }: Props = $props()

    function get_module_component(type: PipelineModule["type"]) {
        return MODULE_COMPONENTS[type] as Component<{module: TypedPipelineModule<typeof type>}>
    }
</script>

<div class="pipeline">
    <div class="items">
        {#each modules as mod, index (mod.uid) }
            {@const Component = get_module_component(modules[index].type)}
            <Component bind:module={modules[index]} />
        {/each}
    </div>
</div>

<style lang="scss">

    .pipeline {
        background-color: #121212;
        padding: 1rem;

        --grid_clr: rgba(255, 255, 255, 0.05);
        background-image: linear-gradient(var(--grid_clr) .1em, transparent .1em), linear-gradient(90deg, var(--grid_clr) .1em, transparent .1em);
        background-size: 3em 3em;

        min-height: 50vh;
    }

    .items {
        gap: 1rem;
        display: flex;
        flex-direction: column;
    }
</style>