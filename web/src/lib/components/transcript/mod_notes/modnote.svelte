<script lang="ts">
	import { map_err } from '$lib/error_helper';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import type { DiscordUser, TicketNote } from '@watcher/shared';
	import common from '$lib/style/common.module.scss';
	import TWMarkdown from '$lib/components/ui/Markdown/TWMarkdown.svelte';
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import { Delete, Trash, Trash2 } from '@lucide/svelte';

	interface Props {
		note: TicketNote;
	}

	const { note }: Props = $props();
	let user = $state<DiscordUser>();

	const ts = use_ticket_state();
	const gs = use_guild_state();

	let user_pfp = $derived.by(() => {
		if (!user) return 'https://cdn.discordapp.com/embed/avatars/3.png';
		if (user.avatar) return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}?size=80`;
		return user.defaultAvatarURL;
	});

	$effect(() => {
		gs.get_user(note.created_by).then((r) => {
			if (r.isErr()) return add_toast_from_error(map_err(r.error));
			user = r.value;
		});
	});

	async function delete_note() {
		const could_delete = await ts.delete_note(note.note_id);
		if (could_delete.isErr()) add_toast_from_error(could_delete.error);
	}
</script>

<div class="note">
	<div class={[common.row, common.gap_medium]}>
		<img height="24px" src={user_pfp} alt="Avatar of {user?.username}" />
		<p>{user?.globalName ?? user?.username}</p>
	</div>
	<TWMarkdown md={note.text} />

	<div class={[common.row, common.gap_medium]}>
		<button onclick={delete_note} class="delete"> Delete Note </button>
	</div>
</div>

<style lang="scss">
	.note {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		img {
			border-radius: 50%;
		}

		&:hover {
			.delete {
				opacity: 1;
			}
		}
	}

	.delete {
		background-color: transparent;
		border: none;
		color: var(--error-500);
		cursor: pointer;
		opacity: 0.3;
	}
</style>
