<script lang="ts">
	import { goto } from '$app/navigation';
	import Button from '$lib/components/ui/Button.svelte';

	function load_dash() {
		return goto(`/dashboard`);
	}
</script>

<div class="nav">
	Thread-Watcher

	<Button load_with={load_dash}>Dashboard</Button>
</div>

<h1>Hello guys</h1>
welcome to the thread watcher dashboard

<marquee>this shit barely works</marquee>

<style lang="scss">
	.nav {
		background-color: var(--background-700);
		border-bottom: 1px solid var(--background-900);
		padding: 1rem;
	}
</style>
