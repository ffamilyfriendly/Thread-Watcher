<script lang="ts">
	import type { TypedPipelineModule } from "@watcher/shared";
	import BaseModule from "./BaseModule.svelte";
	import EmbedConfigurator from "../EmbedConfigurator.svelte";

    interface Props {
		module: TypedPipelineModule<"OPEN_TICKET">;
	}

	let { module = $bindable() }: Props = $props();

</script>

<BaseModule {module} title="Open Ticket">
    {#snippet description()}
        Opens the ticket in the <code>Assigned Channel</code> and pings all the <code>Assigned Roles</code>
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