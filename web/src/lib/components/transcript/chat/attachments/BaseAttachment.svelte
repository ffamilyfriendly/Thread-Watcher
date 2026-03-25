<script lang="ts">
	import HoverButton from '$lib/components/ui/HoverButton.svelte';
	import type { PublicTicketMessageAttachment } from '@watcher/shared';
	import type { Snippet } from 'svelte';
	import btn_style from '$lib/style/button.module.scss';
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import { Download } from '@lucide/svelte';

	interface Props {
		attachment: PublicTicketMessageAttachment;
		children: Snippet;
	}

	const { attachment, children }: Props = $props();

	const VIDEO_FILETYPES = new Set(['mp4', 'mov']);
	const IMAGE_FILETYPES = new Set(['png', 'jpg', 'webp', 'gif']);
	const ext = $derived(attachment.filename.split('.').at(-1)?.toLowerCase() ?? '');

	let ref_div = $state<HTMLDivElement>();

	const download_link = $derived(attachment.access_url);
</script>

<HoverButton colour="#121212" target={ref_div}>
	<a
		{@attach s_tooltip('Download')}
		class={[btn_style.button, btn_style.naked, btn_style.small]}
		href={download_link}
		target="_blank"
	>
		<Download size={16} />
	</a>
</HoverButton>

<div class="attachment" bind:this={ref_div}>
	{@render children()}
</div>

<style>
	.attachment {
		display: inline-block;
		position: relative;
	}
</style>
