<script lang="ts">
	import btn_style from '$lib/style/button.module.scss';
	import type { ChannelDataWithFilters } from '@watcher/shared';
	import FallBackChannel from '../discord/FallBackChannel.svelte';
	import { CirclePause, CirclePower, PenLine, Trash } from '@lucide/svelte';
	import { safe_fetch } from '$lib/client/fetch';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import Modal from '../Modal.svelte';
	import RolePicker from '../settings/RolePicker.svelte';
	import { guild_state } from '$lib/stores/guild.svelte';
	import Guild from '../discord/Guild.svelte';
	import MonitorConfiguration from './MonitorConfiguration.svelte';
	import TagPicker from '../settings/TagPicker.svelte';
	import Expandable from '../Expandable.svelte';
	import Role from '../discord/Role.svelte';
	import Emoji from '../discord/Emoji.svelte';

	interface Props {
		monitor: ChannelDataWithFilters;
		monitors: ChannelDataWithFilters[];
	}

	let { monitors = $bindable(), ...rest }: Props = $props();
	let monitor = $state(rest.monitor);

	const channel_obj = $derived(guild_state.channels.find((c) => c.id === monitor.id));
	let edit_data = $state<ChannelDataWithFilters>();

	$effect(() => {
		edit_data = { ...monitor };
	});

	async function set_suspended_status() {
		const value_to_set = !monitor.is_suspended;
		monitor.is_suspended = value_to_set;

		const data = {
			guild_id: guild_state.guild_id,
			monitor_id: monitor.id,
			edit: {
				is_suspended: value_to_set
			}
		};

		const res = await safe_fetch(`/api/monitor`, {
			body: JSON.stringify(data),
			method: 'PATCH'
		});

		if (res.isErr()) {
			monitor.is_suspended = !value_to_set;
			console.error(res.error);
			return add_toast_from_error(res.error);
		}
	}

	function get_edit_object(item?: ChannelDataWithFilters) {
		return {
			guild_id: guild_state.guild_id,
			monitor_id: monitor.id,
			edit: {
				tags: item?.tags?.filter((str) => str.trim().length != 0) ?? null,
				role_whitelist: item?.role_whitelist?.filter((str) => str.trim().length != 0) ?? null,
				regex: item?.regex?.source ?? null
			}
		};
	}

	async function edit_monitor() {
		if (!edit_data) return;
		const data = get_edit_object(edit_data);

		const res = await safe_fetch('/api/monitor', {
			method: 'PATCH',
			body: JSON.stringify(data)
		});

		if (res.isErr()) {
			console.error(res.error);
			return add_toast_from_error(res.error);
		}

		show_edit_modal = false;
		monitor = edit_data;
	}

	async function delete_monitor() {
		const res = await safe_fetch(
			`/api/monitor?monitor_id=${monitor.id}&guild_id=${guild_state.guild_id}`,
			{
				method: 'DELETE'
			}
		);
		if (res.isErr()) {
			console.error(res.error);
			return add_toast_from_error(res.error);
		}

		monitors = monitors.filter((m) => m.id !== monitor.id);
	}

	const is_not_edited = $derived(
		JSON.stringify(get_edit_object(edit_data)) == JSON.stringify(get_edit_object(monitor))
	);

	let show_delete_modal = $state(false);
	let show_edit_modal = $state(false);

	const active_filters = $derived(
		[
			{ id: 'regex', active: !!monitor.regex },
			{ id: 'roles', active: !!monitor.role_whitelist?.length },
			{ id: 'tags', active: !!monitor.tags?.length }
		].filter((f) => f.active)
	);

	function get_tag(tag_id: string) {
		return channel_obj?.availableTags?.find((t) => t.id == tag_id);
	}
</script>

{#if show_delete_modal}
	{#snippet buttons()}
		<button onclick={delete_monitor} class={[btn_style.button, btn_style.error]}>Delete</button>
	{/snippet}
	<Modal {buttons} title="Delete Monitor" bind:set_open={show_delete_modal}>
		<p>This <b>cannot</b> be undone.</p>
	</Modal>
{/if}

{#if show_edit_modal}
	{#snippet buttons()}
		<button
			disabled={is_not_edited}
			onclick={edit_monitor}
			class={[btn_style.button, btn_style.primary]}>Save</button
		>
	{/snippet}

	<Modal {buttons} title="Edit Monitor" bind:set_open={show_edit_modal}>
		{#if edit_data}
			<MonitorConfiguration bind:data={edit_data} />
		{/if}
	</Modal>
{/if}

<div class="monitor">
	<div class="head_thing">
		<p>Monitor in</p>
		{#if monitor.id == monitor.server}
			{#if guild_state.guild}
				<Guild guild={guild_state.guild.guild} />
			{:else}
				GUILD
			{/if}
		{:else}
			<FallBackChannel channel_id={monitor.id} channel={channel_obj} />
		{/if}
		<div class="status {monitor.is_suspended ? 'suspended' : 'active'}">
			{#if monitor.is_suspended}
				Suspended
			{:else if guild_state.guild?.entitlements === 'NONE'}
				<p>
					Paused
					<small
						>Temporarily paused. Global monitors are a premium feature. <a href="/links/subscribe"
							>View Tiers</a
						>
					</small>
				</p>
			{:else}
				Active
			{/if}
		</div>
	</div>

	<div class="container">
		<div>
			{#if active_filters.length === 0}
				Will watch all threads
			{:else}
				{#each active_filters as filter, i}
					{#if i > 0}
						<p class="and">AND</p>
					{/if}

					{#if filter.id === 'regex'}
						name matches <code>{monitor.regex?.source}</code>
					{/if}

					{#if filter.id === 'roles' && monitor.role_whitelist}
						<p>
							Where the creator has any of these roles
							<Expandable initial_items={1} inline={true} items={monitor.role_whitelist}>
								{#snippet render_item(id)}
									{@const role = guild_state.get_role_sync(id)}
									{#if role}
										<Role {role} />
									{/if}
								{/snippet}
							</Expandable>
						</p>
					{/if}

					{#if filter.id === 'tags' && monitor.tags}
						<p class="guy">
							Where the post has any of these tags
							<Expandable initial_items={1} inline={true} items={monitor.tags}>
								{#snippet render_item(id)}
									{@const tag = get_tag(id)}
									{#if tag}
										<div class="d_tag">
											{#if tag.emoji}
												<Emoji id={tag.emoji.id} name={tag.emoji.name} />
											{/if}
											{tag.name}
										</div>
									{/if}
								{/snippet}
							</Expandable>
						</p>
					{/if}
				{/each}
			{/if}
		</div>

		<div class="buttons">
			<button onclick={set_suspended_status} class={[btn_style.button, btn_style.tetriary]}>
				{#if monitor.is_suspended}
					<CirclePower />
				{:else}
					<CirclePause />
				{/if}
			</button>
			<button
				onclick={() => (show_edit_modal = true)}
				class={[btn_style.button, btn_style.tetriary]}
			>
				<PenLine />
			</button>
			<button
				onclick={() => (show_delete_modal = true)}
				class={[btn_style.button, btn_style.tetriary]}
			>
				<Trash />
			</button>
		</div>
	</div>
</div>

<style lang="scss">
	:root {
		--padding: 1rem;
	}

	.guy {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.d_tag {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.25rem;
		border-radius: 0.25rem;
		outline: 1px solid var(--secondary-500);
		background-color: var(--secondary-200);
	}

	.and {
		text-align: center;
		margin: 0.5rem;
		opacity: 0.7;
	}

	.head_thing {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: var(--padding);
		background-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--primary-500), transparent);
	}

	.container {
		display: flex;
		justify-content: space-between;
		padding: var(--padding);
	}

	.monitor {
		position: relative;
		outline: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		justify-content: space-between;
	}

	.buttons {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.pill {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background-color: color-mix(in srgb, var(--primary-500) 20%, transparent);
		width: fit-content;
		padding: 0.5rem 1rem;
		border-radius: 0.75rem;
		outline: 1px solid var(--primary-500);
	}

	.status {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.3rem;

		--status_clr: var(--success-500);

		padding: 0.25rem 0.5rem;
		border-radius: 0.5rem;
		width: fit-content;

		p {
			position: relative;
			display: flex;
			flex-direction: column;

			small {
				opacity: 0.5;
			}
		}

		&.suspended {
			--status_clr: var(--error-500);
		}

		&::before {
			content: '';
			display: block;
			width: 0.5rem;
			height: 0.5rem;
			background-color: var(--status_clr);
			border-radius: 50%;
		}
	}

	@media (max-width: 500px) {
		.container {
			flex-direction: column-reverse;
		}

		.buttons {
			flex-direction: row;
			width: 100%;
			margin-bottom: 0.5rem;

			& * {
				flex-grow: 1;
			}
		}
	}
</style>
