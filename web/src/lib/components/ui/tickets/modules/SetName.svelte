<script lang="ts">
	import type { TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import EditableAttribute from '../EditableAttribute.svelte';

	interface Props {
		module: TypedPipelineModule<'ASSIGN_NAME'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="Assign Name" bind:module>
	{#snippet description()}
		Sets the name of the ticket
	{/snippet}

	<EditableAttribute
		before_uid={module.uid}
		use_variable_picker={true}
		bind:value={module.new_name}
	>
		{#snippet display(v)}
			{v}
		{/snippet}
	</EditableAttribute>
</BaseModule>
