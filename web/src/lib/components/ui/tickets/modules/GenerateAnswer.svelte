<script lang="ts">
	import { TW_AI_PERSONA_MAX_LEN, TW_AI_RULES_MAX_LEN, type TypedPipelineModule } from '@watcher/shared';
	import BaseModule from './BaseModule.svelte';
	import EditableAttribute from '../EditableAttribute.svelte';
	import style from "$lib/style/pipeline.module.scss"
	import common from "$lib/style/common.module.scss"
	import { Info } from '@lucide/svelte';
	import { tooltip } from '$lib/client/attachments/tooltip';

	interface Props {
		module: TypedPipelineModule<"NARROW_ISSUE">;
	}
	let { module = $bindable() }: Props = $props();

	const TOOLTIP_CONTENT_RULES = `
Define the agent's <b>logic and constraints.</b></br><small>(ex: 'Never mention pricing' or 'ask for the server IP if it's a connectivity issue')</small>
`

	const TOOLTIP_CONTENT_PERSONA = `
Define the agent's <b>personality and tone.</b></br><small>(ex: 'a witty tech export' or 'a formal support representative')</small>
`

</script>

<BaseModule title="Generate Answer" bind:module>
	{#snippet description()}
		The <code>Generate Answer</code> module allows you to automatically answer whatever a user might need
		help with.
	{/snippet}

	<div class="grid">
		<div class={style.indented}>
			<div class={[common.row, common.gap_small]}>
				<Info {@attach tooltip({ content: TOOLTIP_CONTENT_PERSONA, allowHTML: true })} size={16} color="var(--primary-900)" />
				<h3 class="space-grotesk">Persona</h3>
			</div>
			<EditableAttribute use_variable_picker={true} before_uid={module.uid} use_text_area={true} maxlength={TW_AI_PERSONA_MAX_LEN} bind:value={module.persona}>
				{#snippet display(v)}
				<p class={["jetbrains-mono-300", style.wrap, "ai_input"]}>
					{v}
				</p>
				{/snippet}
			</EditableAttribute>
		</div>
	
		<div class={style.indented}>
			<div class={[common.row, common.gap_small]}>
				<Info {@attach tooltip({ content: TOOLTIP_CONTENT_RULES, allowHTML: true })} size={16} color="var(--primary-900)" />
				<h3 class="space-grotesk">Rules</h3>
			</div>
			<EditableAttribute use_variable_picker={true} before_uid={module.uid} use_text_area={true} maxlength={TW_AI_RULES_MAX_LEN} bind:value={module.rules}>
				{#snippet display(v)}
				<p class={["jetbrains-mono-300", style.wrap, "ai_input"]}>
					{v}
				</p>
				{/snippet}
			</EditableAttribute>
		</div>
	</div>
	<div>
		<b>Followup Questions</b>
		<input type="number" min="0" max="10" bind:value={module.max_responses} />
	</div>
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