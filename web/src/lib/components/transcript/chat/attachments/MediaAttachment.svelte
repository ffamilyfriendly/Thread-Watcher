<script lang="ts">
	import type { PublicTicketMessageAttachment } from '@watcher/shared';
	import { Play } from '@lucide/svelte';
	import BaseAttachment from './BaseAttachment.svelte';

	interface Props {
		attachment: PublicTicketMessageAttachment;
		height: number;
		square: boolean;
		on_click: () => void;
	}

	const { attachment, height, square, on_click }: Props = $props();

	const VIDEO_FILETYPES = new Set(['mp4', 'mov']);
	const ext = $derived(attachment.filename.split('.').at(-1)?.toLowerCase() ?? '');
	const is_video = $derived(VIDEO_FILETYPES.has(ext));
</script>

<BaseAttachment {attachment}>
	<div style="height: {height}px" class="attachment" class:square>
		{#if is_video}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video preload="none" {height} class:square class="media" src={attachment.access_url}></video>
		{:else}
			<img
				loading="lazy"
				{height}
				class:square
				class="media"
				src={attachment.access_url}
				alt="message attachment"
			/>
		{/if}

		<button onclick={on_click} class="open_content">
			{#if is_video}
				<div class="play_btn"><Play fill="white" color="white" /></div>
			{/if}
		</button>
	</div>
</BaseAttachment>

<style lang="scss">
	.play_btn {
		position: absolute;
		background-color: rgba(0, 0, 0, 0.3);
		padding: 0.5rem;
		border-radius: 50%;
		opacity: 0.2;
		border: none;
		transition: 0.2s;
	}

	.attachment {
		overflow: hidden;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: center;

		&.square {
			aspect-ratio: 1/1;
		}

		&:hover {
			.play_btn {
				opacity: 1;
			}
		}
	}

	.media {
		width: 100%;
		height: 100%;
		object-fit: cover; // or contain depending on your preference
		transition: 0.2s;

		&.square {
			object-fit: cover;
		}
	}

	.open_content {
		position: absolute;
		left: 0;
		top: 0;
		bottom: 0;
		right: 0;
		display: flex;
		align-items: center;
		justify-content: center;
		background-color: transparent;
		border: none;
		cursor: pointer;
	}
</style>
