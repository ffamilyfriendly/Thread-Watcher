<script lang="ts">
	import type { PipelineModule, TypedPipelineModule } from "@watcher/shared";
	import BaseModule from "./BaseModule.svelte";
	import RolePicker from "../../settings/RolePicker.svelte";
	import { guild_state } from "$lib/stores/guild.svelte";

    interface Props {
        module: TypedPipelineModule<"ASSIGN_ROLE">
    }
    let {module = $bindable()}: Props = $props()
    
</script>

<BaseModule title="Assign Role" accent="#5865F2" bind:module={module}>
    <RolePicker bind:value={module.role_id} roles={guild_state.roles} />
</BaseModule>