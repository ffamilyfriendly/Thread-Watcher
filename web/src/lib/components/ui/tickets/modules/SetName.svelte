<script lang="ts">
	import { DISCORD_CHANNEL_NAME_MAX_LEN, type TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import EditableAttribute from './components/InlineTextEditor.svelte';
	import Explainer from '../../Explainer.svelte';
	import EditableAttribute2 from './components/VariableTextEditor.svelte';

	interface Props {
		module: TypedPipelineModule<'ASSIGN_NAME'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="Assign Name" bind:module>
	{#snippet description()}
		Customizes the ticket's name. By default tickets are named after the user ID of the user who
		opened them. Use this to give tickets a more descriptive name.
	{/snippet}

	<Explainer title="Ticket Name">
		{#snippet description()}
			<p>
				Customize what the ticket thread will be called. Please keep in mind that not all characters
				are allowed by discord and will be removed by Thread-Watcher if present.
			</p>
		{/snippet}

		<EditableAttribute2
			before_uid={module.uid}
			use_variable_picker={true}
			bind:value={module.new_name}
			maxlength={100}
		/>
	</Explainer>
</BaseModule>
