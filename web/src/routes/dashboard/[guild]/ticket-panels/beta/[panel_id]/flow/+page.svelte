<script>
	import Button from '$lib/components/ui/Button.svelte';
	import Pipeline from '$lib/components/ui/tickets/Pipeline.svelte';
	import { use_pipeline } from '$lib/stores/panel.svelte';
	import { ExternalLink, Plus } from '@lucide/svelte';
	const state = use_pipeline()
</script>

<nav>
	<Button variant="primary" on_click={() => state.module_picker_open = true}>
		<Plus size={16} />
		Module
	</Button>
	<Button href="https://docs.threadwatcher.xyz/features/tickets" variant="tetriary">
		<ExternalLink size={16} />
		Docs
	</Button>
</nav>

<Pipeline />

<style lang="scss">
	nav {
		padding: .5rem;
		display: flex;
		align-items: center;
		gap: .5rem;
	}
</style>
