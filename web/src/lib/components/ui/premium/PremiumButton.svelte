<script lang="ts">
	import btn_styles from '$lib/style/button.module.scss';
	import { Crown } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import Modal from '../Modal.svelte';
	import PremiumInformation from './PremiumInformation.svelte';
	import { PUBLIC_SKU_BASIC, PUBLIC_SKU_EXTENDED, PUBLIC_SKU_STORE } from '$env/static/public';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';

	const guild_state = use_guild_state()

	interface Props {
		on_click: () => void;
		children?: Snippet;
		icon?: Snippet;
		class_name?: string;
	}

	const { on_click, children, icon, class_name }: Props = $props();

	let show_premium_modal = $state(false);

	async function on_click_wrapper() {
		if (!guild_state.guild_id) return;

		let is_subscribed = guild_state.is_subscribed
		if(typeof is_subscribed === "undefined") {
			const res = await guild_state.get_guild_subscription(guild_state.guild_id)
			if(res.isErr()) return add_toast_from_error(res.error)
			is_subscribed = res.value.is_subscribed
		}

		if(!is_subscribed) return show_premium_modal = true

		on_click();
	}

	const store_page_url = "https://hello.com"
</script>

{#if show_premium_modal}
	<Modal title="Premium Feature" bind:set_open={show_premium_modal}>
		{#snippet buttons()}
			<button class={[btn_styles.button, btn_styles.tetriary]} onclick={() => show_premium_modal = false}>maybe later</button>
			<a href={store_page_url} target="_blank" class={[btn_styles.button, btn_styles.premium]}
				>Subscribe</a
			>
		{/snippet}
		<PremiumInformation />
	</Modal>
{/if}

{#snippet icon_fallback()}
	<Crown />
{/snippet}

<button onclick={on_click_wrapper} class={[btn_styles.button, btn_styles.premium, class_name]}>
	{#if icon}
		{@render icon()}
	{:else}
		{@render icon_fallback()}
	{/if}

	{#if children}
		{@render children()}
	{/if}
</button>
