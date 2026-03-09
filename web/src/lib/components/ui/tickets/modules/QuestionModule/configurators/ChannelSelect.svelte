<script lang="ts">
	import type { TypedComponent } from '@watcher/shared';
	import SelectWrapper from './SelectWrapper.svelte';
	import {
		ChevronDown,
		ChevronUp,
		Folder,
		FolderArchive,
		Group,
		Hash,
		Image,
		Megaphone,
		MessageCircle,
		MessageSquare,
		Mic,
		Spool
	} from '@lucide/svelte';
	import EditableAttribute from '../../../EditableAttribute.svelte';
	import { fly } from 'svelte/transition';
	import common from '$lib/style/common.module.scss';
	import { portal } from '$lib/client/attachments/portal';
	import { click_outside } from '$lib/client/attachments/click_outside';

	interface Props {
		data: TypedComponent<'CHANNEL_SELECT'>;
		this_uid: string;
	}

	let { data = $bindable(), this_uid }: Props = $props();

	const channeltypes = [
		{
			id: 0,
			icon: Hash,
			label: 'text channel within server'
		},
		{
			id: 1,
			icon: MessageCircle,
			label: 'direct message between users'
		},
		{
			id: 2,
			icon: Mic,
			label: 'voice channel within a server'
		},
		{
			id: 3,
			icon: Group,
			label: 'direct message group chat between multiple users'
		},
		{
			id: 4,
			icon: Folder,
			label: 'an organizational category'
		},
		{
			id: 5,
			icon: Megaphone,
			label: 'a channel that users can follow and crosspost into their own server'
		},
		{
			id: 10,
			icon: Spool,
			label: 'announcement thread'
		},
		{
			id: 11,
			icon: Spool,
			label: 'public thread'
		},
		{
			id: 12,
			icon: Spool,
			label: 'private thread'
		},
		{
			id: 13,
			icon: Mic,
			label: 'Guild Stage voice chat'
		},
		{
			id: 14,
			icon: FolderArchive,
			label: 'guild directory'
		},
		{
			id: 15,
			icon: MessageSquare,
			label: 'guild forum'
		},
		{
			id: 16,
			icon: Image,
			label: 'guild media'
		}
	];

	function has_channel_type(type_id: number) {
		return !!data.channel_types?.find((chan_type) => chan_type === type_id);
	}

	function toggle_type(type_id: number) {
		if (has_channel_type(type_id)) {
			data.channel_types = data.channel_types?.filter((ct) => ct !== type_id);
			if (data.channel_types && data.channel_types.length === 0) data.channel_types = null;
		} else {
			if (!data.channel_types) data.channel_types = [];
			data.channel_types = [type_id, ...data.channel_types];
		}
	}

	let is_expanded = $state(false);

	let select_ref = $state<HTMLDivElement>();
</script>

<SelectWrapper bind:data>
	<div class="container">
		<div bind:this={select_ref} class="select">
			<EditableAttribute max={150} bind:value={data.placeholder}>
				{#snippet display(v)}
					<p class="placeholder">{v}</p>
				{/snippet}
			</EditableAttribute>

			<button class="expand_btn" onclick={() => (is_expanded = !is_expanded)}>
				{#if is_expanded}
					<ChevronUp size={16} />
				{:else}
					<ChevronDown size={16} />
				{/if}
			</button>
		</div>

		{#if is_expanded && select_ref}
			<div
				{@attach portal(select_ref, { force_anchor_width: true })}
				{@attach click_outside(() => (is_expanded = false))}
				transition:fly={{ duration: 400, y: -30, opacity: 0.2 }}
				class="options"
			>
				{#each channeltypes as ct}
					{@const Icon = ct.icon}
					{@const is_active = has_channel_type(ct.id)}
					<div class="grid_row">
						<Icon />
						<p>{ct.label}</p>
						<input checked={is_active} onclick={() => toggle_type(ct.id)} type="checkbox" />
					</div>
				{/each}
			</div>
		{/if}
	</div>
</SelectWrapper>

<style lang="scss">
	.grid_row {
		display: grid;
		grid-template-columns: 20px 1fr 30px;
		gap: 1.5rem;
		align-items: center;
		padding: 0.75rem 1rem;
	}

	.container {
		display: flex;
		flex-direction: column;
		width: 400px;
		gap: 1rem;
		position: relative;
	}

	.select {
		background-color: #131416;
		border: 1px solid #2d2e32;
		border-radius: 8px;
		align-items: center;
		cursor: pointer;
		display: grid;
		gap: 8px;
		grid-template-columns: 1fr auto;
		padding-block: 8px;
		padding-inline: 12px 8px;

		.placeholder {
			opacity: 0.6;
		}

		.expand_btn {
			color: inherit;
			background-color: transparent;
			border: none;
			cursor: pointer;
		}
	}

	.options {
		overflow: hidden;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.5rem;
		z-index: 1;
		top: 3rem;
		width: 400px;
		border-radius: 8px;
		background-color: #131416;
		border: 1px solid #2d2e32;
		position: absolute;
	}
</style>
