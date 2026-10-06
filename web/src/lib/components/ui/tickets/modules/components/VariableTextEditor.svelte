<script lang="ts">
	import { tick } from 'svelte';
	import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements';
	import VariableSelector from './VariableSelector.svelte';

	type TextAreaProps = {
		use_text_area: true;
		width?: string;
	} & HTMLTextareaAttributes;

	type InputProps = {
		use_text_area?: false;
		width?: never;
	} & HTMLInputAttributes;

	type AutoProps = {
		use_text_area?: undefined;
		width?: string;
	} & HTMLTextareaAttributes &
		HTMLInputAttributes;

	type Props = {
		value?: string | null;
		before_uid?: string;
		use_variable_picker?: boolean;
	} & (TextAreaProps | InputProps | AutoProps);

	let {
		value = $bindable(''),
		use_text_area,
		width,
		before_uid,
		use_variable_picker,
		...rest_props
	}: Props = $props();

	const resolved_use_text_area = use_text_area ?? (value ?? '').includes('\n');

	let show_variable_picker = $state(false);
	let last_keycode: string;
	let saved_location: number;

	let field_ref = $state<HTMLInputElement | HTMLTextAreaElement>();
	let overlay_ref = $state<HTMLDivElement>();

	const VAR_PATTERN = /\{\{[^{}]+\}\}/g;

	function escape_html(str: string) {
		return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
	}

	const highlighted_html = $derived.by(() => {
		const raw = value ?? '';
		const escaped = escape_html(raw).replace(
			VAR_PATTERN,
			(match) => `<span class="var_token">${match}</span>`
		);
		return escaped + (resolved_use_text_area ? '\n' : '');
	});

	function sync_overlay_scroll() {
		if (!field_ref || !overlay_ref) return;
		overlay_ref.scrollTop = field_ref.scrollTop;
		overlay_ref.scrollLeft = field_ref.scrollLeft;
	}

	function resize_if_textarea() {
		if (field_ref instanceof HTMLTextAreaElement) {
			field_ref.style.height = 'auto';
			field_ref.style.height = `${field_ref.scrollHeight}px`;
			if (overlay_ref) overlay_ref.style.height = field_ref.style.height;
		}
	}

	function handle_input() {
		resize_if_textarea();
		sync_overlay_scroll();
	}

	function handle_keydown(e: KeyboardEvent) {
		if (show_variable_picker) return;

		if (e.key === '{' && last_keycode === '{' && use_variable_picker) {
			show_variable_picker = true;

			const target = e.target;
			if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
				if (target.selectionStart != null) saved_location = target.selectionStart + 1;
			}
		}

		last_keycode = e.key;
	}

	async function insert_picked_var(variable: string) {
		const current = value ?? '';

		value = current.slice(0, saved_location) + variable + '}}' + current.slice(saved_location);

		await tick();
		resize_if_textarea();
		sync_overlay_scroll();

		if (field_ref) {
			const new_pos = saved_location + variable.length + 2;
			field_ref.setSelectionRange(new_pos, new_pos);
			field_ref.focus();
		}
	}

	$effect(() => {
		if (field_ref) resize_if_textarea();
	});
</script>

<div class="wrapper" style:width>
	{#if show_variable_picker && field_ref}
		<VariableSelector
			input_ref={field_ref}
			{before_uid}
			bind:show_this={show_variable_picker}
			on_selected={insert_picked_var}
		/>
	{/if}

	<div class="stack">
		<div bind:this={overlay_ref} class="overlay" class:textarea_mode={resolved_use_text_area}>
			{@html highlighted_html}
		</div>

		{#if resolved_use_text_area}
			<textarea
				bind:this={field_ref}
				{...rest_props as HTMLTextareaAttributes}
				bind:value
				class="field textarea"
				oninput={handle_input}
				onscroll={sync_overlay_scroll}
				onkeydown={handle_keydown}
			></textarea>
		{:else}
			<input
				bind:this={field_ref}
				{...rest_props as HTMLInputAttributes}
				bind:value
				class="field"
				oninput={handle_input}
				onscroll={sync_overlay_scroll}
				onkeydown={handle_keydown}
			/>
		{/if}
	</div>
</div>

<style lang="scss">
	.wrapper {
		position: relative;
		min-width: 0;
	}

	.stack {
		position: relative;
		min-width: 0;
	}

	.overlay,
	.field {
		font: inherit;
		font-size: 0.9rem;
		line-height: 1.4;
		padding: 0.25rem 0.5rem;
		border: 1px solid color-mix(in srgb, var(--clr, #121212) 85%, white);
		border-radius: 0.15rem;
		box-sizing: border-box;
		width: 100%;
	}

	.overlay {
		position: absolute;
		inset: 0;
		margin: 0;
		color: inherit;
		white-space: pre-wrap;
		word-break: break-word;
		overflow: hidden;
		pointer-events: none;
		background-color: color-mix(in srgb, var(--clr, #121212) 95%, white);

		:global(.var_token) {
			background-color: color-mix(in srgb, var(--primary-800, #6366f1) 25%, transparent);
			color: color-mix(in srgb, var(--primary-800, #6366f1) 60%, white);
			border-radius: 0.2rem;
		}

		&.textarea_mode {
			height: auto;
			min-height: 1.6rem;
		}
	}

	.field {
		position: relative;
		background: transparent;

		color: transparent;
		caret-color: var(--text, white);
		outline: none;
		resize: none;

		&.textarea {
			overflow: hidden;
			min-height: 1.6rem;
		}

		&::selection {
			background-color: color-mix(in srgb, var(--primary-800, #6366f1) 35%, transparent);
		}
	}
</style>
