<script lang="ts">
	import FallBackChannel from '../discord/FallBackChannel.svelte';

	interface Props {
		channel_id: string;
	}

	const { channel_id }: Props = $props();
</script>

<div class="md">
	<FallBackChannel icon_size={16} class_name="channel" {channel_id} />
</div>

<style lang="scss">
	.md {
		display: contents;
		:global(.channel) {
			padding: 0 0.25rem;
			font-weight: inherit;
			gap: 0rem;
			vertical-align: top;
		}
	}
</style>
