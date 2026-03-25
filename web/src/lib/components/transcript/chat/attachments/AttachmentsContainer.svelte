<script lang="ts">
	import type { PublicTicketMessageAttachment } from '@watcher/shared';
	import FlaggedAttachment from './FlaggedAttachment.svelte';
	import FileAttachment from './FileAttachment.svelte';
	import MediaAttachments from './MediaAttachments.svelte';

	interface Props {
		attachments: PublicTicketMessageAttachment[];
	}

	const { attachments }: Props = $props();

	const VIDEO_FILETYPES = new Set(['mp4', 'mov']);
	const IMAGE_FILETYPES = new Set(['png', 'jpg', 'webp', 'gif']);

	const is_media = (f: PublicTicketMessageAttachment) => {
		const ext = f.filename.split('.').at(-1)?.toLowerCase() ?? '';
		return (VIDEO_FILETYPES.has(ext) || IMAGE_FILETYPES.has(ext)) && !f.flag;
	};

	const media = $derived(attachments.filter(is_media));
	const other = $derived(attachments.filter((f) => !is_media(f)));
</script>

<MediaAttachments attachments={media} />

{#each other as file}
	{#if file.flag}
		<FlaggedAttachment attachment={file} />
	{:else}
		<FileAttachment attachment={file} />
	{/if}
{/each}

<style lang="scss">
	.attachments {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
		gap: 0.5rem;
	}
</style>
