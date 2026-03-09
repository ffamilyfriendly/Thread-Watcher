<script lang="ts">
	import type { TypedPipelineModule } from "@watcher/shared";
	import BaseModule from "./BaseModule.svelte";
	import EmbedConfigurator from "../EmbedConfigurator.svelte";

    interface Props {
		module: TypedPipelineModule<"SILENT_RESOLVE">;
	}

	let { module = $bindable() }: Props = $props();

</script>

<BaseModule {module} title="Silent Resolve">
    {#snippet description()}
        Shows the user the provided embed but does not open a ticket channel
        <br />
        <small class="resolves">This module will end the pipeline execution</small>
    {/snippet}

    <EmbedConfigurator bind:value={module.embed} use_variable_picker={true} before_uid={module.uid} />
</BaseModule>

<style>
.resolves {
    color: var(--error-500);
}
</style>