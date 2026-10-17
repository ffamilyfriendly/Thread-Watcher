<script lang="ts">
	import {
		TW_AI_PERSONA_MAX_LEN,
		TW_AI_RULES_MAX_LEN,
		type TypedPipelineModule
	} from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import style from '$lib/style/pipeline.module.scss';
	import Cheng from './components/Cheng.svelte';
	import Explainer from '../../Explainer.svelte';
	import EditableAttribute2 from './components/VariableTextEditor.svelte';
	import UserLoader from '../../discord/user/UserLoader.svelte';
	import { PUBLIC_BOT_ID, PUBLIC_PREMIUM_SKU_STORE_LINK } from '$env/static/public';

	interface Props {
		module: TypedPipelineModule<'AI_TRY_RESOLVE'>;
	}
	let { module = $bindable() }: Props = $props();
</script>

<BaseModule title="AI Assist" bind:module>
	{#snippet description()}
		<p>
			<UserLoader user_id={PUBLIC_BOT_ID} style="inline" /> opens a DM with the user and tries to find
			a solution for the issue. The AI agent can read files from your
			<a href="../../library">library</a>
		</p>
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
					>(ex: 'skip if user mentions private information' or 'suggest resolving if matter is
					unrelated to server')</small
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
			max="30"
			class={[style.number, 'jetbrains-mono-300']}
			bind:value={module.max_rounds}
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
