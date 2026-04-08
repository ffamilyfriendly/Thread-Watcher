<script lang="ts">
	import { page } from '$app/state';
	import DropDown from '$lib/components/ui/DropDown.svelte';
	import { signOut } from '@auth/sveltekit/client';
	import list_style from '$lib/style/list.module.scss';
	import { Menu } from '@lucide/svelte';
	import NavBar from '$lib/components/ui/DashNav/DashboardNavbar.svelte';
	import TwLogoBranding from '$lib/components/ui/TwLogoBranding.svelte';

	let inner_width = $state(0);
	const should_show_overlay = $derived(inner_width < 600);
	let sidebar_open = $state(true);
	let should_be_open = $derived(sidebar_open || !should_show_overlay);
	let { children } = $props();
</script>

<svelte:window bind:innerWidth={inner_width} />

{#snippet hamburger()}
	{#if should_show_overlay}
		<button class="hamburger" onclick={() => (sidebar_open = !sidebar_open)}>
			<Menu />
		</button>
	{/if}
{/snippet}

<nav class="top_nav">
	{@render hamburger()}
	<TwLogoBranding link_to_homepage={true} />

	<DropDown>
		{#snippet parent_item()}
			<div class="account">
				<img src={page.data.session?.user?.image} alt="profile pic" />
				<span>{page.data.session?.user?.name}</span>
			</div>
		{/snippet}

		{#snippet child_item()}
			<div class={list_style.list}>
				<h3 class={list_style.heading}>Account</h3>
				<a href="/dashboard">My Servers</a>
				<button onclick={() => signOut()}>Log Out</button>

				<h3 class={list_style.heading}>Links</h3>
				<a href="https://botsuite.co/join">Support Server</a>
				<a href="/policies/privacy-policy">Privacy Policy</a>
				<a href="/policies/terms-of-service">Terms of Service</a>
			</div>
		{/snippet}
	</DropDown>
</nav>

<div class="container">
	<NavBar overlay={should_show_overlay} {should_be_open} {hamburger} />

	<main>
		{@render children()}
	</main>
</div>

<style lang="scss">
	@use '../../lib/style/colours.scss';

	.hamburger {
		cursor: pointer;
		background-color: transparent;
		color: white;
		padding: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}

	.top_nav {
		background-color: var(--background-600);
		border-bottom: 1px solid color-mix(in srgb, var(--background-600) 90%, white);
		height: var(--navbar_height);
		display: flex;
		align-items: center;
		width: 100%;
		padding: 1rem;
		justify-content: space-between;
	}

	.account {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		img {
			height: 30px;
			border-radius: 50%;
		}

		@media (max-width: 500px) {
			span {
				display: none;
			}
		}
	}

	.container {
		display: flex;
		gap: 1rem;
		min-height: calc(100vh - var(--navbar_height));
	}

	main {
		flex-grow: 1;
		padding: var(--main_padding);
	}
</style>
