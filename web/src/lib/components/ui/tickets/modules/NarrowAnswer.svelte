<script lang="ts">
	import {
		TW_AI_PERSONA_MAX_LEN,
		TW_AI_RULES_MAX_LEN,
		type TypedPipelineModule
	} from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import EditableAttribute from './components/InlineTextEditor.svelte';
	import style from '$lib/style/pipeline.module.scss';
	import common from '$lib/style/common.module.scss';
	import { Info } from '@lucide/svelte';
	import { tooltip } from '$lib/client/attachments/tooltip';
	import Cheng from './components/Cheng.svelte';
	import Explainer from '../../Explainer.svelte';
	import EditableAttribute2 from './components/VariableTextEditor.svelte';

	interface Props {
		module: TypedPipelineModule<'NARROW_ISSUE'>;
	}
	let { module = $bindable() }: Props = $props();

	const TOOLTIP_CONTENT_RULES = `
Define the agent's <b>logic and constraints.</b></br><small>(ex: 'Never mention pricing' or 'ask for the server IP if it's a connectivity issue')</small>
`;

	const TOOLTIP_CONTENT_PERSONA = `
Define the agent's <b>personality and tone.</b></br><small>(ex: 'a witty tech export' or 'a formal support representative')</small>
`;
</script>

<BaseModule title="AI Narrowing" bind:module>
	{#snippet description()}
		<p>
			Uses AI to have a short conversation with the user before the ticket is created. Define a
			persona and rules to guide the conversation.
		</p>
		<small>For example: gathering details about a ban appeal or triaging a bug report</small>
	{/snippet}

	<Explainer title="Persona">
		{#snippet description()}
			<p>
				Define the agent's <b>personality and tone.</b><br /><small
					>(ex: 'a witty tech export' or 'a formal support representative')</small
				>
			</p>
		{/snippet}
		<EditableAttribute2
			use_variable_picker={true}
			before_uid={module.uid}
			maxlength={TW_AI_PERSONA_MAX_LEN}
			use_text_area={true}
			bind:value={module.persona}
		/>
	</Explainer>

	<Explainer title="Rules">
		{#snippet description()}
			<p>
				Define the agent's <b>logic and constraints.</b><br /><small
					>(ex: 'Never mention pricing' or 'ask for the server IP if it's a connectivity issue')</small
				>
			</p>
		{/snippet}
		<EditableAttribute2
			use_variable_picker={true}
			before_uid={module.uid}
			maxlength={TW_AI_RULES_MAX_LEN}
			use_text_area={true}
			bind:value={module.rules}
		/>
	</Explainer>

	<Cheng title="Max Rounds" description="How many times the AI can ask follow up questions">
		<input
			type="number"
			min="0"
			max="10"
			class={[style.number, 'jetbrains-mono-300']}
			bind:value={module.max_responses}
		/>
	</Cheng>
</BaseModule>

<style lang="scss">
	.grid {
		display: grid;
		gap: 1rem;
		grid-template-columns: repeat(2, minmax(100px, 50%));
	}

	.ai_input {
		font-size: smaller;
	}
</style>
