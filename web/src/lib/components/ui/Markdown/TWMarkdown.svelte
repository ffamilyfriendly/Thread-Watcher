<script lang="ts">
	import Markdown from 'svelte-exmarkdown';
	import type { Plugin } from 'svelte-exmarkdown';
	import { variable_plugin } from '$lib/client/md_plugins/md_variable_plugin';
	import { discord_plugin } from '$lib/client/md_plugins/md_discord_plugin';
	interface Props {
		md: string;
	}
	const { md }: Props = $props();

	const plugins: Plugin[] = [variable_plugin(), discord_plugin()];
</script>

<div class="md">
	<Markdown {md} {plugins} />
</div>

<style lang="scss">
	.md :global(p) {
		white-space: pre-wrap;
		margin: 0;
	}
</style>
