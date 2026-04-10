<script>
	import { goto } from '$app/navigation';
	import Button from './Button.svelte';
	import TwLogoBranding from './TwLogoBranding.svelte';

	function load_dash() {
		return goto(`/dashboard`);
	}
</script>

<div class="nav">
	<TwLogoBranding link_to_homepage={true} />

	<div>
		<Button size="large" load_with={load_dash}>Dashboard</Button>
		<Button size="large" variant="tetriary" href="https://botsuite.co/join">Support</Button>
	</div>
</div>

<style lang="scss">
	.nav {
		background-color: var(--background-500);
		border-bottom: 1px solid var(--background-800);
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
</style>
