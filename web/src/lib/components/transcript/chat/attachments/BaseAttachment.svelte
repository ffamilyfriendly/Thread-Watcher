<script lang="ts">
	import HoverButton from '$lib/components/ui/HoverButton.svelte';
	import type { PublicTicketMessageAttachment } from '@watcher/shared';
	import type { Snippet } from 'svelte';
	import btn_style from '$lib/style/button.module.scss';
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import { Download, Flag } from '@lucide/svelte';
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte';

	interface Props {
		attachment: PublicTicketMessageAttachment;
		children: Snippet;
	}

	const { attachment, children }: Props = $props();

	const ts = use_ticket_state()
	let ref_div = $state<HTMLDivElement>();
	let was_flagged = $state(false)

	const download_link = $derived(attachment.access_url);

	async function flag_attachment() {
		const could_flag = await ts.flag_attachment(attachment.attachment_id)
		if(could_flag.isErr()) return add_toast_from_error(could_flag.error)
		add_toast({ label: "Flagged", message: "Attachment was flagged", type: "success" })
		was_flagged = true
	}
</script>

{#if !was_flagged}
<HoverButton colour="#121212" target={ref_div}>
	<button onclick={flag_attachment} {@attach s_tooltip('Flag')} class={[btn_style.button, btn_style.naked, btn_style.small]}>
		<Flag color="var(--error-500)" />
	</button>
	<a
		{@attach s_tooltip('Download')}
		class={[btn_style.button, btn_style.naked, btn_style.small]}
		href={download_link}
		target="_blank"
	>
		<Download size={16} />
	</a>
</HoverButton>
{/if}

<div class="attachment" class:flagged={was_flagged} bind:this={ref_div}>
	{@render children()}
</div>

<style>
	.attachment {
		display: inline-block;
		position: relative;
	}

	.flagged {
		transition: .2s;
		filter: grayscale(1);

		&:hover {
			filter: grayscale(.1);
		}
	}
</style>
