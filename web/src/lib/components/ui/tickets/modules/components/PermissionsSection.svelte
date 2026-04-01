<script lang="ts">
	import style from '$lib/style/pipeline.module.scss';
	import { ConditionalOperands, type Conditional, type PipelineModule } from '@watcher/shared';
	import VariableInput from './VariableInput.svelte';
	import { Trash } from '@lucide/svelte';

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
	<tr>
		<td>
			<button onclick={() => remove_conditional(idx)} class="del_btn">
				<Trash />
			</button>
			<VariableInput module_uid={module.uid} bind:value={op.value_1} />
		</td>
		<td>
			<select class={style.select} bind:value={op.operand}>
				{#each ConditionalOperands as p_opr}
					<option value={p_opr}>{p_opr}</option>
				{/each}
			</select>
		</td>

		{#if op.operand !== 'not_null'}
			<td><VariableInput module_uid={module.uid} bind:value={op.value_2} /></td>
		{/if}
	</tr>
{/snippet}

<div class="conditionals">
	<div class="rowwy">
		<h3 class="space-grotesk">Conditionals</h3>
		<select class={style.select} bind:value={module.conditional_type}>
			<option value="AND">AND</option>
			<option value="OR">OR</option>
		</select>
	</div>

	<table>
		<thead>
			<tr>
				<th>Value</th>
				<th>Operation</th>
				<th>Value</th>
			</tr>
		</thead>
		<tbody>
			{#each module.conditionals as op, idx}
				{@render conditional(op, idx)}
			{/each}
			{#if module.conditionals.length === 0}
				<tr>
					<td>No condtionals set.</td>
				</tr>
			{/if}
		</tbody>
	</table>

	<button class={[style.basic_btn, 'add_new']} onclick={add_conditional}>+ Add Condition</button>
</div>

<style lang="scss">
	.rowwy {
		display: flex;
		justify-content: space-between;
		align-items: start;
	}

	.conditionals {
		flex-grow: 1;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;

		thead {
			tr {
				border-bottom: 2px solid rgba(255, 255, 255, 0.05);
			}

			th {
				text-align: left;
				padding: 0.5rem;
				font-weight: 500;
				opacity: 0.5;
				font-size: 0.7rem;
				text-transform: uppercase;
			}
		}

		tbody {
			tr {
				position: relative;
				border-bottom: 1px solid rgba(255, 255, 255, 0.03);
				transition: background-color 0.2s;

				&:hover {
					background-color: rgba(255, 255, 255, 0.02);

					.del_btn {
						opacity: 1;
						pointer-events: all;
					}
				}

				&:last-child {
					border-bottom: none;
				}
			}

			td {
				padding: 0.4rem 0.5rem;
				vertical-align: middle;

				font-family: 'JetBrains Mono', monospace;
			}
		}
	}

	.del_btn {
		all: unset;
		position: absolute;
		left: -25px;
		top: 50%;
		transform: translateY(-50%);

		color: var(--error-500);
		font-size: 1.4rem;
		cursor: pointer;
		opacity: 0;
		pointer-events: none;
		transition: opacity 0.1s ease;

		width: 20px;
		height: 20px;
		display: flex;
		align-items: center;
		justify-content: center;

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
