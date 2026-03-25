<script lang="ts">
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import type { PublicTicketMessage } from '@watcher/shared';
	import AttachmentsContainer from './attachments/AttachmentsContainer.svelte';
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import HoverButton from '$lib/components/ui/HoverButton.svelte';
	import btn_style from '$lib/style/button.module.scss';
	import { s_tooltip } from '$lib/client/attachments/tooltip';
	import { MessageCircle } from '@lucide/svelte';
	import TWMarkdown from '$lib/components/ui/Markdown/TWMarkdown.svelte';
	import Embed from './Embed.svelte';

	interface Props {
		message: PublicTicketMessage;
	}
	const { message }: Props = $props();
	const gs = use_guild_state();
	const ts = use_ticket_state();

	const user = $derived(gs.get_user_cached(message.author_id));

	let user_pfp = $derived.by(() => {
		if (!user) return 'https://cdn.discordapp.com/embed/avatars/3.png';
		if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=80`;
		return user.defaultAvatarURL;
	});

	const date_formatted = $derived(
		new Intl.DateTimeFormat('en-GB', { dateStyle: 'short', timeStyle: 'short' }).format(
			message.created_at
		)
	);

	let message_element = $state<HTMLDivElement>();
	const message_link = $derived(
		`https://discord.com/channels/${ts.ticket?.guild_id}/${
			ts.ticket?.discord_channel_id
		}/${message.message_id}`
	);
</script>

<HoverButton colour="#121212" target={message_element}>
	<a
		{@attach s_tooltip('Open Message')}
		class={[btn_style.button, btn_style.naked, btn_style.small]}
		href={message_link}
		target="_blank"
	>
		<MessageCircle size={16} />
	</a>
</HoverButton>

<div id={message.message_id} bind:this={message_element} class="message">
	<img class="avatar" alt="Icon of discord user {message.author_id}" src={user_pfp} />
	<div>
		<div class="meta">
			<span>{user?.globalName ?? user?.username ?? '<unknown user>'}</span>
			{#if user?.bot}
				<span class="app_badge">APP</span>
			{/if}
			{#if user?.id === ts.ticket?.owner}
				<span class="app_badge">OP</span>
			{/if}
			<span class="time">{date_formatted}</span>
		</div>

		{#if message.text_content}
			<TWMarkdown md={message.text_content} />
		{/if}

		{#each message.embeds as embed}
			<Embed {embed} />
		{/each}

		{#if message.attachments.length > 0}
			<AttachmentsContainer attachments={message.attachments} />
		{/if}
	</div>
</div>

<style lang="scss">
	.message {
		display: flex;
		gap: 0.5rem;

		&:hover {
			background-color: rgba(255, 255, 255, 0.1);
		}
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;

		.time {
			opacity: 0.5;
			font-size: small;
		}

		.app_badge {
			padding: 0.1rem 0.25rem;
			font-weight: bold;
			font-size: smaller;
			border-radius: 0.25rem;
			background-color: #5865f2;
		}
	}

	.avatar {
		width: 40px;
		height: 40px;
		border-radius: 50%;
	}
</style>
