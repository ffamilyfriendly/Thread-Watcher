<script lang="ts">
	import type { TypedPipelineModule } from "@watcher/shared";
	import BaseModule from "./BaseModule.svelte";

    interface Props {
        module: TypedPipelineModule<"GENERATE_ANSWER">
    }
    let {module = $bindable()}: Props = $props()
    
</script>

<BaseModule title="Generate Answer" accent="#10A37F" bind:module={module}>
    <input value={module.prompt} />
</BaseModule>