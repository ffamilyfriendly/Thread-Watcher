<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import { Tag } from '@lucide/svelte';
	import style from '$lib/style/pipeline.module.scss';

	interface Props {
		id: string;
		max_len?: number;
	}
	let { id = $bindable(), max_len = 20 }: Props = $props();

	let is_being_edited = $state(false);
	let edited_id = $state(id);

	let input_elem = $state<HTMLInputElement>();

	function on_input(e: Event) {
		const input = e.target as HTMLInputElement;
		const val = input.value.replace(/\s/g, '_').replace(/[^\w]/g, '').slice(0, max_len);

		edited_id = val;
	}

	function on_editing_start() {
		is_being_edited = true;
		if (input_elem) input_elem.focus();
	}

	function on_submit() {
		id = edited_id;
		is_being_edited = false;
	}

	$effect(() => {
		if (!input_elem) return;
		input_elem.focus();
		input_elem.setSelectionRange(0, input_elem.value.length);
	});
</script>

{#if is_being_edited}
	<Modal title="Editing ID" bind:set_open={is_being_edited}>
		<input
			bind:this={input_elem}
			class={style.text_input}
			bind:value={edited_id}
			oninput={on_input}
			spellcheck="false"
			pattern="\w+"
			maxlength={max_len}
		/>

		{#snippet buttons()}
			<Button on_click={on_submit} variant="tetriary">Save</Button>
		{/snippet}
	</Modal>
{/if}

<button onclick={on_editing_start} class="jetbrains-mono pill">
	<Tag size={12} />
	<span>
		{id}
	</span>
</button>

<style lang="scss">
	.pill {
		background-color: color-mix(in srgb, var(--clr) 25%, transparent);
		border: 1px solid rgba(255, 255, 255, 0.2);
		color: inherit;
		padding: 0.25rem 0.5rem;
		border-radius: 0.5rem;
		cursor: pointer;

		&:hover {
			cursor: text;
		}

		span {
			text-decoration: dashed underline rgba(255, 255, 255, 0.5);
		}
	}
</style>
