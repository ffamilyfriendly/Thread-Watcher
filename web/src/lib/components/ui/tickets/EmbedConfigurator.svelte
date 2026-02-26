<script lang="ts">
	import { DISCORD_EMBED_DESCRIPTION_MAX_LEN, type Embed, type EmbedField } from '@watcher/shared';
	import EditableAttribute from './EditableAttribute.svelte';
	import TWMarkdown from '../Markdown/TWMarkdown.svelte';
	import Toggle from '../Toggle.svelte';
	import { Trash2 } from '@lucide/svelte';

	interface Props {
		value: Embed;
		width?: `${number}px` | `${number}rem`;
	}

	const { value = $bindable(), width }: Props = $props();

	let colour_element = $state<HTMLInputElement>();

	function handle_colour_click() {
		colour_element?.click();
	}
</script>

{#snippet embed_field(f: EmbedField, idx: number)}
	<div class="field" class:inline={f.is_inline}>
		<EditableAttribute bind:value={f.title}>
			{#snippet display(v)}
				<b class="title">{v}</b>
			{/snippet}
		</EditableAttribute>
		<EditableAttribute use_text_area={true} bind:value={f.text}>
			{#snippet display(v)}
				<div class="field_value_markdown">
					<TWMarkdown md={v ?? ''} />
				</div>
			{/snippet}
		</EditableAttribute>

		<div class="row inline_sel">
			Inline
			<Toggle height={'14px'} width={'30px'} bind:value={f.is_inline} />
			<button
				aria-label="Remove this field"
				class="remove_btn"
				onclick={() => value.fields.splice(idx, 1)}
			>
				<Trash2 size={16} />
			</button>
		</div>
	</div>
{/snippet}

<div style:width style="--embed_clr: {value.colour}" class="embed">
	<input
		bind:value={value.colour}
		bind:this={colour_element}
		type="color"
		style:display="none"
		list="preset_clrs"
	/>
	<datalist id="preset_clrs">
		<option>#1c2d69</option>
		<option>#22c55e</option>
		<option>#ff3366</option>
		<option>#ef4444</option>
	</datalist>

	<div class="row title_row">
		<button aria-label="colour swatch" class="clr_picker" onclick={handle_colour_click}></button>
		<EditableAttribute maxlength={50} bind:value={value.title}>
			{#snippet display(v)}
				<b class="embed_title">{v}</b>
			{/snippet}
		</EditableAttribute>
	</div>
	<EditableAttribute
		width="65ch"
		use_text_area={true}
		maxlength={DISCORD_EMBED_DESCRIPTION_MAX_LEN}
		bind:value={value.description}
	>
		{#snippet display(v)}
			{#if v}
				<TWMarkdown md={v} />
			{:else}
				<p class="description placeholder">no description set</p>
			{/if}
		{/snippet}
	</EditableAttribute>

	<div>
		<small class="label">Embed Fields</small>
		<div class="fields">
			{#each value.fields as field, index (index)}
				{@render embed_field(field, index)}
			{/each}
		</div>
		<button
			disabled={value.fields.length >= 25}
			aria-label="Add a new embed field"
			class="add_field"
			onclick={() => {
				value.fields.push({ title: 'New Field', text: '' });
			}}>Add Field</button
		>
	</div>

	<div class="footer">
		<small>
			This is an approximation of how the embed looks on official discord clients and may differ
		</small>
	</div>
</div>

<style lang="scss">
	.add_field {
		background-color: transparent;
		border: none;
		color: color-mix(in srgb, var(--embed_clr) 40%, white);
		cursor: pointer;
		width: fit-content;
	}

	.footer {
		opacity: 0.5;
		align-items: center;
		display: flex;
		grid-column: 1 / 1;
		grid-row: auto / auto;
	}

	.clr_picker {
		cursor: pointer;
		width: 1rem;
		height: 1rem;
		border: none;
		outline: none;
		border-radius: 50%;
		background-color: var(--embed_clr);
		outline: 1px solid color-mix(in srgb, var(--embed_clr) 30%, transparent);
	}

	.description {
		white-space: pre-line;
		max-width: 65ch;

		&.placeholder {
			opacity: 0.5;
			text-decoration: dashed underline;
		}
	}

	.label {
		opacity: 0.5;
	}

	.fields {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 8px;

		.field {
			position: relative;
			grid-column: span 3;

			&.inline {
				grid-column: span 1;
			}

			.remove_btn {
				background-color: transparent;
				border: none;
				color: var(--error-500);
				cursor: pointer;

				&:hover {
					color: var(--error-700);
				}
			}

			&:hover {
				.inline_sel {
					opacity: 0.8;
				}
			}
		}
	}

	.field_value_markdown {
		opacity: 0.75;
	}

	.embed {
		font-size: 14px;
		gap: 0.5rem;
		min-height: 100px;
		background-color: #131416;

		border: 1px solid #2d2e32;
		border-inline-start: 4px solid var(--embed_clr);

		border-radius: 0.25rem;

		/* straight up stole this from discord lol. Sorry John Discord */
		max-width: max-content;
		word-wrap: break-word;
		display: grid;
		grid-template-columns: auto;
		grid-template-rows: auto;
		overflow: hidden;
		padding-block: 0.5rem 1rem;
		padding-inline: 0.75rem 1rem;
		padding-top: 0.125rem;

		.embed_title {
			font-size: 16px;
		}
	}

	.inline_sel {
		opacity: 0.2;
		transition: 0.2s ease-in;
	}

	.row {
		gap: 0.5rem;
		display: flex;
		align-items: center;
	}
</style>
