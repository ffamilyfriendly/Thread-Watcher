<script lang="ts">
	import style from '$lib/style/pipeline.module.scss';
	import { ConditionalOperands, type Conditional, type PipelineModule } from '@watcher/shared';
	import VariableInput from './VariableInput.svelte';
	import { CircleMinus, MinusCircle, Trash } from '@lucide/svelte';

	const OPERAND_NICER_NAMES: Record<(typeof ConditionalOperands)[number], string> = {
		ends_with: 'ends with',
		starts_with: 'starts with',
		includes: 'includes',
		equal: 'is equal to',
		not_null: 'is not null'
	};

	interface Props {
		module: PipelineModule;
	}

	let { module = $bindable() }: Props = $props();

	function remove_conditional(idx: number) {
		module.conditionals.splice(idx, 1);
	}

	function add_conditional() {
		module.conditionals.push({
			value_1: '',
			operand: 'equal'
		});
	}
</script>

{#snippet conditional(op: Conditional, idx: number)}
	<div class="conditional">
		<button class="del_btn" onclick={() => remove_conditional(idx)}>
			<CircleMinus size={16} />
		</button>

		<span>if</span>
		<VariableInput module_uid={module.uid} bind:value={op.value_1} />
		<select class={style.select} bind:value={op.operand}>
			{#each ConditionalOperands as p_opr}
				<option value={p_opr}>{OPERAND_NICER_NAMES[p_opr]}</option>
			{/each}
		</select>
		{#if op.operand !== 'not_null'}
			<VariableInput module_uid={module.uid} bind:value={op.value_2} />
		{/if}
	</div>
{/snippet}

<div class="conditionals">
	<div class="rowwy">
		<h3 class="space-grotesk">Conditionals</h3>
		<select class={style.select} bind:value={module.conditional_type}>
			<option value="AND">AND</option>
			<option value="OR">OR</option>
		</select>
	</div>

	<div class="conditionals_list">
		{#each module.conditionals as op, idx}
			{@render conditional(op, idx)}
		{:else}
			<div>
				<p>Conditionals allow you to have this module run only when a statement is true.</p>
			</div>
		{/each}
	</div>
	<button class={[style.basic_btn, 'add_new']} onclick={add_conditional}>+ Add Condition</button>
</div>

<style lang="scss">
	.rowwy {
		display: flex;
		justify-content: space-between;
		align-items: start;
		margin-bottom: 0.75rem;
	}

	.add_new {
		margin-top: 1rem;
	}

	.conditional {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		select {
			align-self: stretch;
		}
	}

	.conditionals_list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.del_btn {
		all: unset;
		cursor: pointer;
		color: var(--error-500);
		font-size: 1.4rem;
		transition: opacity 0.1s ease;

		&:hover {
			color: var(--error-700);
		}

		&::before {
			content: '';
			position: absolute;
			right: -10px;
			width: 40px;
			height: 100%;
			background-color: transparent;
			z-index: -1;
		}
	}
</style>
