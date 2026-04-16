<script lang="ts">
	import btn_styles from '$lib/style/button.module.scss';
	import { Crown } from '@lucide/svelte';
	import type { Snippet } from 'svelte';
	import Modal from '../Modal.svelte';
	import PremiumInformation from './PremiumInformation.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';

	const guild_state = use_guild_state()

	interface Props {
		on_click: () => void;
		allow_topgg_vote?: boolean;
		children?: Snippet;
		icon?: Snippet;
		class_name?: string;
	}

	const { on_click, children, icon, class_name, allow_topgg_vote = false }: Props = $props();

	let show_premium_modal = $state(false);

	async function on_click_wrapper() {
		if (!guild_state.guild_id) return;

		let is_subscribed = guild_state.is_subscribed || (allow_topgg_vote ? guild_state.has_active_vote : false)

		if(!is_subscribed) return show_premium_modal = true

		on_click();
	}
</script>

{#if show_premium_modal}
	<Modal title="Premium Feature" bind:set_open={show_premium_modal}>
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
