<script lang="ts">
	import { slide } from 'svelte/transition';
</script>

<div class="drawer" transition:slide={{ duration: 300, axis: 'x' }}>fuck you bro</div>

<style lang="scss">
	:root {
		--padding: 0.5rem;
		--clr: var(var(--clr), #121212);
	}

	.drawer {
		background-color: color-mix(in srgb, var(--clr) 95%, white);
		border: 2px solid rgba(255, 255, 255, 0.09);
		border-left: none;
		border-bottom: none;
		border-radius: 0 0.25rem 0 0;
		padding: 0.5rem;
	}
</style>
