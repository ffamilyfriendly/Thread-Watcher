<script lang="ts">
	import type { ButtonStart, SelectionStart, StringSelectOption } from '@watcher/shared';
	import EditableAttribute from './EditableAttribute.svelte';
	import { ChevronDown, ChevronUp, Trash2 } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	interface Props {
		placeholder: string,
		options: StringSelectOption[]
	}

	let { options = $bindable(), placeholder = $bindable() }: Props = $props();

	let is_expanded = $state(false);

	function get_new_option_id() {
		if (options.length === 0) return `option_0`;
		const last_option_id = Number(options[options.length - 1].option_id.split('_')[1]);
		return `option_${last_option_id + 1}`;
	}

	function add_new_field() {
		options.push({
			title: 'New Option',
			option_id: get_new_option_id()
		});
	}

	function remove_option(opt_id: string) {
		options = options.filter((v) => v.option_id !== opt_id).filter(Boolean);
	}
</script>

<div class="container">
	<div class="select">
		<EditableAttribute max={150} bind:value={placeholder}>
			{#snippet display(v)}
				<p class="placeholder">{v}</p>
			{/snippet}
		</EditableAttribute>

		<button class="expand_btn" onclick={() => (is_expanded = !is_expanded)}>
			{#if is_expanded}
				<ChevronUp size={16} />
			{:else}
				<ChevronDown size={16} />
			{/if}
		</button>
	</div>

	{#snippet option_field(val: StringSelectOption)}
		<div class="option">
			<button onclick={() => remove_option(val.option_id)} class="remove_option">
				<Trash2 />
			</button>
			<div class="middle">
				<EditableAttribute maxlength={100} bind:value={val.title}>
					{#snippet display(v)}
						<p class="label">{v}</p>
					{/snippet}
				</EditableAttribute>
				<EditableAttribute maxlength={100} bind:value={val.description}>
					{#snippet display(v)}
						<p class:empty={!v} class="description">{v ?? 'no description'}</p>
					{/snippet}
				</EditableAttribute>
			</div>
			<div class="id_area">
				<div class="pill">
					<p class="label">ID</p>
					<p class="value">{val.option_id}</p>
				</div>
			</div>
		</div>
	{/snippet}

	{#if is_expanded}
		<div transition:fly={{ duration: 400, y: -30, opacity: 0.2 }} class="options">
			{#each options as opt (opt.option_id)}
				{@render option_field(opt)}
			{/each}
			<button disabled={options.length === 25} onclick={add_new_field} class="add_new_field"
				>Add New</button
			>
		</div>
	{/if}
</div>

<style lang="scss">
	.container {
		display: flex;
		flex-direction: column;
		width: 400px;
		gap: 1rem;
		position: relative;
	}

	.select {
		background-color: #131416;
		border: 1px solid #2d2e32;
		border-radius: 8px;
		align-items: center;
		cursor: pointer;
		display: grid;
		gap: 8px;
		grid-template-columns: 1fr auto;
		padding-block: 8px;
		padding-inline: 12px 8px;

		.placeholder {
			opacity: 0.6;
		}

		.expand_btn {
			color: inherit;
			background-color: transparent;
			border: none;
			cursor: pointer;
		}
	}

	.options {
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		z-index: 1;
		top: 3rem;
		width: 400px;
		border-radius: 8px;
		background-color: #131416;
		border: 1px solid #2d2e32;
		position: absolute;

		.option {
			max-width: 100%;
			display: flex;
			gap: 0.5rem;
			overflow: hidden;
			white-space: nowrap;

			.description {
				opacity: 0.7;
				max-width: 100%;
				text-overflow: ellipsis;
			}

			.label {
				max-width: 100%;
				text-overflow: ellipsis;
			}

			.empty {
				text-decoration: underline dashed;
			}

			.remove_option {
				background-color: transparent;
				border: none;
				color: var(--error-500);
				transition: 0.2s ease-in;

				&:hover {
					cursor: pointer;
					color: var(--error-700);
				}
			}

			.middle {
				overflow: hidden;
				text-overflow: ellipsis;
			}

			.id_area {
				flex-grow: 1;
				display: flex;
				justify-content: right;
				align-items: start;

				div {
					--clr: var(--primary-500);
					--padding: 0.15rem 0.3rem;
					background-color: color-mix(in srgb, var(--clr) 5%, transparent);
					border: 1px solid var(--clr);
					border-radius: 0.5rem;

					font-size: smaller;
					display: flex;
					align-items: center;

					.label {
						background-color: color-mix(in srgb, var(--clr) 20%, transparent);
						font-weight: bold;
						padding: var(--padding);
						vertical-align: bottom;
					}

					.value {
						padding: var(--padding);
					}
				}
			}
		}

		.add_new_field {
			width: fit-content;
			background-color: transparent;
			border: none;
			color: inherit;
			cursor: pointer;

			&:disabled {
				opacity: 0.1;
				cursor: not-allowed;
			}
		}
	}
</style>
