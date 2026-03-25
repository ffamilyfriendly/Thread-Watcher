<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import btn_style from '$lib/style/button.module.scss';
	import { click_outside } from '$lib/client/attachments/click_outside';
	import { modal_portal } from '$lib/client/attachments/portal';

	interface Props {
		children: Snippet;
		class_name?: string | string[];
		title: string;
		set_open: boolean;
		buttons?: Snippet;
	}

	let { children, title, set_open = $bindable(), buttons, class_name }: Props = $props();

	$effect(() => {
		if (!ref) return;
		if (set_open) ref.showModal();
		else ref.close();
	});

	function handle_click(e: MouseEvent) {
		if (e.target === ref) set_open = false;
	}

	let ref = $state<HTMLDialogElement>();
</script>

<dialog bind:this={ref} onclick={handle_click} onclose={() => (set_open = false)}>
	<div class="top_row">
		<h3>{title}</h3>

		<button onclick={() => (set_open = false)} class={[btn_style.button, 'cancel_btn']}>x</button>
	</div>

	{@render children()}

	{#if buttons}
		<div class="btn_row">
			{@render buttons()}
		</div>
	{/if}
</dialog>

<style lang="scss">
	dialog {
		display: flex;
		min-width: 300px;
		flex-direction: column;
		background-color: var(--background-500);
		border-radius: 0.5rem;
		padding: 1rem 1.5rem;
		margin: auto;
		border: none;
		outline: 1px solid color-mix(in srgb, var(--background-500), white 10%);
		color: inherit;

		&::backdrop {
			backdrop-filter: blur(5px);
			background: rgba(0, 0, 0, 0.5);
		}
	}

	.btn_row {
		display: flex;
		justify-content: right;
		gap: 0.5rem;
		margin-top: 1rem;
	}

	.cancel_btn {
		font-size: 1rem;
		margin: 0;
		padding: 0;
	}

	.modal {
		width: min(90vw, 500px);
		max-width: 100%;
		background-color: var(--background-500);
		border-radius: 0.5rem;
		padding: 1rem 1.5rem;
		outline: 1px solid color-mix(in srgb, var(--background-500), white 10%);

		@media (max-width: 500px) {
			width: 90%;
		}
	}

	.top_row {
		margin-bottom: 0.5rem;
		opacity: 0.7;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
