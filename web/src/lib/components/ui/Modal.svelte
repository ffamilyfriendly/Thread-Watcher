<script lang="ts">
	import type { Snippet } from 'svelte';
	import { fly } from 'svelte/transition';
	import btn_style from '$lib/style/button.module.scss';
	import { click_outside } from '$lib/client/attachments/click_outside';

	interface Props {
		children: Snippet;
		class_name?: string | string[];
		title: string;
		set_open: boolean;
		buttons?: Snippet;
	}

	let { children, title, set_open = $bindable(), buttons, class_name }: Props = $props();
	const other_class_names = $derived(Array.isArray(class_name) ? class_name : [class_name]);
</script>

<div transition:fly class="container">
	<div {@attach click_outside(() => set_open = false)} class={['modal', ...other_class_names]}>
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
	</div>
</div>

<style lang="scss">
	.container {
		position: fixed;
		z-index: 5000;
		top: 0;
		left: 0;
		width: 100%;
		height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		backdrop-filter: blur(5px);
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
		min-width: max(200px, 25%);
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
