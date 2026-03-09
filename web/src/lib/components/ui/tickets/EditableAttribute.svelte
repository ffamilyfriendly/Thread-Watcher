<script lang="ts">
	import { Check, Pencil } from '@lucide/svelte';
	import { tick, type Snippet } from 'svelte';
	import type { HTMLInputAttributes, HTMLTextareaAttributes } from 'svelte/elements';
	import VariableSelector from './modules/components/VariableSelector.svelte';
	import { s_tooltip, tooltip } from '$lib/client/attachments/tooltip';

	type TextAreaProps = {
		use_text_area: true;
		width?: string;
	} & HTMLTextareaAttributes;

	type InputProps = {
		use_text_area?: false;
		width?: never;
	} & HTMLInputAttributes;

	type Props = {
		value?: string | null;
		display: Snippet<[string | undefined | null]>;
		before_uid?: string;
		use_variable_picker?: boolean;
	} & (TextAreaProps | InputProps);

	let {
		value = $bindable(),
		display,
		use_text_area = false,
		width,
		before_uid,
		use_variable_picker,
		...rest_props
	}: Props = $props();
	let is_editing = $state(false);
	let show_variable_picker = $state(false);

	const input_attrs = $derived(!use_text_area ? (rest_props as HTMLInputAttributes) : {});
	const textarea_attrs = $derived(use_text_area ? (rest_props as HTMLTextareaAttributes) : {});

	let last_keycode: string;
	let saved_location: number;
	function handle_keydown(e: KeyboardEvent) {
		if (show_variable_picker) return;
		const is_text_area = e.target instanceof HTMLTextAreaElement;

		if (e.key === '{' && last_keycode === '{' && use_variable_picker) {
			show_variable_picker = true;

			const target = e.target;
			if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
				if (target.selectionStart) saved_location = target.selectionStart + 1;
			}
		}

		if (e.key === 'Enter' && (is_text_area ? !e.shiftKey : true)) is_editing = false;

		last_keycode = e.key;
	}

	function on_blur() {
		if (show_variable_picker) return;
		is_editing = false;
	}

	function resize(node: HTMLTextAreaElement, text: string | null | undefined) {
		const update = () => {
			node.style.height = `auto`;
			node.style.height = `${node.scrollHeight}px`;
		};

		update();

		return { update };
	}

	async function insert_picked_var(variable: string) {
		// I have not the slightest of clues WHY value is not a string when its typed as a string | null in props.
		// doing this just to keep vsc happy
		const v_typed = value as string;

		const value_with_variable_added =
			v_typed.slice(0, saved_location) + variable + '}}' + v_typed.slice(saved_location);
		value = value_with_variable_added;

		await tick();

		const target = document.activeElement;
		if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
			const new_pos = saved_location + variable.length + 2;
			target.setSelectionRange(new_pos, new_pos);
			target.focus();
		}
	}

	function focus(node: HTMLInputElement | HTMLTextAreaElement) {
		node.focus();
		node.select();
	}

	let item_ref = $state<HTMLElement>();
</script>

<div class="wrapper">
	{#if show_variable_picker && item_ref}
		<VariableSelector
			input_ref={item_ref}
			{before_uid}
			bind:show_this={show_variable_picker}
			on_selected={insert_picked_var}
		/>
	{/if}

	{#if is_editing}
		<div class="content">
			{#if use_text_area}
				<textarea
					bind:this={item_ref}
					{...textarea_attrs}
					use:focus
					style:width
					class="edit textarea"
					use:resize={value}
					bind:value
					onblur={on_blur}
					onkeydown={handle_keydown}
				></textarea>
			{:else}
				<input
					bind:this={item_ref}
					{...input_attrs}
					use:focus
					class="edit"
					bind:value
					onblur={on_blur}
					onkeydown={handle_keydown}
				/>
			{/if}
		</div>

		<button class="icon_btn" onclick={() => (is_editing = false)}>
			<Check size={14} />
		</button>
	{:else}
		<div class="content">
			{@render display(value)}
		</div>

		<button
			{@attach tooltip({ content: 'Edit Value', delay: 200 })}
			class="icon_btn edit_trigger"
			onclick={() => (is_editing = true)}
		>
			<Pencil size={14} />
		</button>
	{/if}
</div>

<style lang="scss">
	.wrapper {
		display: flex;
		align-items: center;
		width: fit-content;
		position: relative;
		gap: 0.5rem;
		min-width: 0;
	}

	.edit {
		font: inherit;
		padding: 0;
		margin: 0;
		display: inline-block;
		overflow: hidden;
		white-space: pre-wrap;
		background-color: transparent;
		border: none;
		outline: none;
		color: inherit;

		&.textarea {
			min-height: 1.2rem;
			flex-grow: 1;
			resize: none;
		}
	}

	.content {
		flex: 1;
		min-width: 0;
		padding-top: 0.15rem;
		padding-bottom: 0.15rem;
		overflow: hidden;
	}

	.icon_btn {
		flex-shrink: 0;
		margin-top: 2px;
		background-color: transparent;
		border: none;
		color: white;
		cursor: pointer;
		opacity: 0.6;
	}
</style>
