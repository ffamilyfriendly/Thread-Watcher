<script>
	import NavBar from '$lib/components/ui/NavBar.svelte';
	import { sidebar_open } from '$lib/stores/sidebar';
	import { init_guild_state } from '$lib/stores/guild.svelte';

	let { children, data } = $props();

	// svelte-ignore state_referenced_locally
	const gs = init_guild_state(data.guild_id)

	$effect(() => {
		gs.init(data.roles, data.channels, data.guild);
	});

	let inner_width = $state(0);
	let should_be_open = $derived($sidebar_open || inner_width > 500);
</script>

<svelte:window bind:innerWidth={inner_width} />

<div class="container">
	<NavBar open={should_be_open} />

	<main>
		{@render children()}
	</main>
</div>

<style lang="scss">
	@use 'sass:color';
	@use '../../../lib/style/colours.scss';

	.container {
		display: flex;
		gap: 1rem;
		align-items: stretch;
		height: calc(100vh - 62px);
	}

	main {
		flex-grow: 1;
		padding: var(--main_padding);
		overflow-y: scroll;
	}
</style>
