<script lang="ts">
	import { File } from '@lucide/svelte';
	import type { PublicTicketMessageAttachment } from '@watcher/shared';
	import BaseAttachment from './BaseAttachment.svelte';

	interface Props {
		attachment: PublicTicketMessageAttachment;
	}
	const { attachment }: Props = $props();

	const size_formatter = Intl.NumberFormat('en', {
		notation: 'compact',
		style: 'unit',
		unit: 'byte',
		unitDisplay: 'narrow'
	});
</script>

<BaseAttachment {attachment}>
	<div class="file">
		<div class="inner">
			<File />
			<div>
				<a target="_blank" href={attachment.access_url}>{attachment.filename}</a>
				<p class="filesize">{size_formatter.format(attachment.file_size)}</p>
			</div>
		</div>
	</div>
</BaseAttachment>

<style>
	.file {
		align-items: center;
		display: flex;
	}

	.filesize {
		font-size: small;
		opacity: 0.7;
	}

	.inner {
		display: flex;
		gap: 0.5rem;
		align-items: center;
		background-color: color-mix(in srgb, white 5%, transparent);
		border: 1px solid color-mix(in srgb, white 10%, transparent);
		border-radius: 0.25rem;
		padding: 0.25rem 1rem;
	}
</style>
