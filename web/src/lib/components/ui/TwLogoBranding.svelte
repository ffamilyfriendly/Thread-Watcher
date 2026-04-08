<script lang="ts">
	import Logo from '$lib/assets/thread_watcher_icon.png';

	interface Props {
		link_to_homepage?: boolean;
	}

	const { link_to_homepage }: Props = $props();
</script>

{#if link_to_homepage}
	<a href="/">
		<div class="branding">
			<img height="24px" alt="Logo" src={Logo} />
			<span>Thread-Watcher</span>
		</div>
	</a>
{:else}
	<div class="branding">
		<img height="24px" alt="Logo" src={Logo} />
		<span>Thread-Watcher</span>
	</div>
{/if}

<style lang="scss">
	.branding {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	a {
		all: unset;
		cursor: pointer;
	}
</style>
