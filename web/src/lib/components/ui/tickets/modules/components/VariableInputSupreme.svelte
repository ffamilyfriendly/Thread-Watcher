<script lang="ts">
	import { tick } from 'svelte';
	import { portal } from '$lib/client/attachments/portal';
	import type { HTMLInputAttributes } from 'svelte/elements';
	import VariableSelector from './VariableSelector.svelte';

	interface Props extends HTMLInputAttributes {
		before_uid?: string;
	}

	let { value = $bindable(), before_uid, ...rest_props }: Props = $props();

	let show_variable_picker = $state(false);

	let last_keycode: string;
	let saved_location: number;
	function handle_keydown(e: KeyboardEvent) {
		if (show_variable_picker) return;
		const is_text_area = e.target instanceof HTMLTextAreaElement;

		if (e.key === '{' && last_keycode === '{') {
			show_variable_picker = true;

			const target = e.target;
			if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
				if (target.selectionStart) saved_location = target.selectionStart + 1;
			}
		}

		last_keycode = e.key;
	}

	async function insert_picked_var(variable: string) {
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

	let input_ref = $state<HTMLInputElement>();

	$effect(() => {
		console.log('INPUT REF', input_ref);
	});
</script>

{#if show_variable_picker && input_ref}
	<VariableSelector
		{before_uid}
		{input_ref}
		bind:show_this={show_variable_picker}
		on_selected={insert_picked_var}
	/>
{/if}

<input bind:this={input_ref} onkeydown={handle_keydown} {...rest_props} bind:value />
