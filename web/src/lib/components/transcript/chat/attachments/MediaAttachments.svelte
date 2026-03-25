<script lang="ts">
	import type { PublicTicketMessageAttachment } from '@watcher/shared';
	import { ArrowLeft, ArrowRight } from '@lucide/svelte';
	import MediaAttachment from './MediaAttachment.svelte';

	interface Props {
		attachments: PublicTicketMessageAttachment[];
	}

	const { attachments }: Props = $props();

	let dialog_ref = $state<HTMLDialogElement>();
	let dialog_open = $state(false);
	let viewing_attachment = $state(0);

	$effect(() => {
		if (!dialog_ref) return;
		if (dialog_open) dialog_ref.showModal();
		else if (dialog_ref.open) dialog_ref.close();
	});

	function handle_click(e: MouseEvent) {
		if (e.target === dialog_ref) dialog_open = false;
	}

	const selected_attachment = $derived(attachments.at(viewing_attachment));

	const VIDEO_FILETYPES = new Set(['mp4', 'mov']);
	const selected_is_video = $derived(
		VIDEO_FILETYPES.has(selected_attachment?.filename.split('.').at(-1)?.toLowerCase() ?? '')
	);
</script>

{#if selected_attachment}
	<dialog bind:this={dialog_ref} onclick={handle_click} onclose={() => (dialog_open = false)}>
		<button
			disabled={viewing_attachment == 0}
			onclick={() => (viewing_attachment -= 1)}
			class="navbtn"
		>
			<ArrowLeft />
		</button>

		{#if selected_is_video}
			<!-- svelte-ignore a11y_media_has_caption -->
			<video controls class="preview" src={selected_attachment.access_url}></video>
		{:else}
			<img class="preview" src={selected_attachment.access_url} alt="yeah" />
		{/if}

		<button
			disabled={viewing_attachment === attachments.length - 1}
			onclick={() => (viewing_attachment += 1)}
			class="navbtn"
		>
			<ArrowRight />
		</button>
	</dialog>
{/if}

<div class="attachment">
	{#each attachments as atc, idx}
		<MediaAttachment
			on_click={() => {
				dialog_open = true;
				viewing_attachment = idx;
			}}
			height={300}
			square={attachments.length > 1}
			attachment={atc}
		/>
	{/each}
</div>

<style lang="scss">
	dialog {
		width: 100%;
		display: flex;
		border-radius: 0.5rem;
		background-color: transparent;
		justify-content: space-between;
		padding: 1rem 1.5rem;
		margin: auto;
		border: none;
		color: inherit;
		gap: 1rem;

		&::backdrop {
			backdrop-filter: blur(5px);
			background: rgba(0, 0, 0, 0.5);
		}
	}

	dialog:not([open]) {
		display: none;
	}

	.preview {
		width: 60%;
	}

	.navbtn {
		color: white;
		background-color: transparent;
		border: none;
		cursor: pointer;

		&:disabled {
			opacity: 0.2;
			cursor: not-allowed;
		}
	}
</style>
