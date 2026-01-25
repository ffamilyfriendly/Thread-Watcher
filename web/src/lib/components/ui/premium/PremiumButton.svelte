<script lang="ts">
	import btn_styles from '$lib/style/button.module.scss';
	import { Crown } from '@lucide/svelte';
	import { guild_state } from '$lib/stores/guild.svelte';
	import type { Snippet } from 'svelte';
	import Modal from '../Modal.svelte';
	import PremiumInformation from './PremiumInformation.svelte';
	import { PUBLIC_SKU_BASIC, PUBLIC_SKU_EXTENDED, PUBLIC_SKU_STORE } from '$env/static/public';

	interface Props {
		require_level: 'BASIC' | 'EXTENDED';
		on_click: () => void;
		children: Snippet;
	}

	const { require_level, on_click, children }: Props = $props();

	let show_premium_modal = $state(false);

	function on_click_wrapper() {
		console.log('HI HI', guild_state.guild);
		if (!guild_state.guild) return;

		if (require_level === 'EXTENDED' && guild_state.guild.entitlements !== 'EXTENDED') {
			show_premium_modal = true;
			return;
		}

		if (require_level === 'BASIC' && guild_state.guild.entitlements === 'NONE') {
			show_premium_modal = true;
			return;
		}

		on_click();
	}

	const store_page_lookup = {
		ANY: PUBLIC_SKU_STORE,
		BASIC: PUBLIC_SKU_BASIC,
		EXTENDED: PUBLIC_SKU_EXTENDED
	};

	const store_page_url = $derived(store_page_lookup[require_level]);
</script>

{#if show_premium_modal}
	<Modal title="Premium Feature" bind:set_open={show_premium_modal}>
		{#snippet buttons()}
			<button class={[btn_styles.button, btn_styles.tetriary]}>maybe later</button>
			<a href={store_page_url} target="_blank" class={[btn_styles.button, btn_styles.premium]}
				>Subscribe</a
			>
		{/snippet}
		<PremiumInformation level={require_level} />
	</Modal>
{/if}

<button onclick={on_click_wrapper} class={[btn_styles.button, btn_styles.premium]}>
	<Crown />
	{@render children()}
</button>
