<script lang="ts">
	import btn_style from '$lib/style/button.module.scss';
	import type { Monitor } from '@watcher/shared';
	import { CirclePause, CirclePower, PenLine, Trash } from '@lucide/svelte';
	import { safe_fetch } from '$lib/client/fetch';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import Modal from '../Modal.svelte';
	import Guild from '../discord/Guild.svelte';
	import MonitorConfiguration from './MonitorConfiguration.svelte';
	import Role from '../discord/Role.svelte';
	import Emoji from '../discord/Emoji.svelte';
	import { PUBLIC_SKU_STORE } from '$env/static/public';
	import FallBackChannel from '../discord/FallBackChannel.svelte';
	import { use_guild_state } from '$lib/stores/guild.svelte';

	const guild_state = use_guild_state()

	interface Props {
		monitor: Monitor;
		monitors: Monitor[];
	}

	let { monitors = $bindable(), ...rest }: Props = $props();
	let monitor = $state(rest.monitor);

	const channel_obj = $derived(guild_state.channels.find((c) => c.id === monitor.target_id));
	let edit_data = $state<Monitor>();

	$effect(() => {
		edit_data = { ...monitor };
	});

	async function set_suspended_status() {
		const value_to_set = !monitor.is_suspended;
		monitor.is_suspended = value_to_set;

		const data = {
			guild_id: guild_state.guild_id,
			monitor_id: monitor.target_id,
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

	function get_edit_object(item?: Monitor) {
		return {
			guild_id: guild_state.guild_id,
			monitor_id: monitor.target_id,
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
			`/api/monitor?monitor_id=${monitor.target_id}&guild_id=${guild_state.guild_id}`,
			{
				method: 'DELETE'
			}
		);
		if (res.isErr()) {
			console.error(res.error);
			return add_toast_from_error(res.error);
		}

		monitors = monitors.filter((m) => m.target_id !== monitor.target_id);
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


	const is_global_monitor = $derived(monitor.target_id === monitor.guild_id)

	const is_paused = $derived(is_global_monitor && !(guild_state.has_active_vote || guild_state.is_subscribed))
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

<div id="focus_{monitor.target_id}" class="monitor">
	<div class="head_thing">
		<div class="mimimimi">
			<p>Monitor in</p>
			{#if monitor.target_id == monitor.guild_id}
				{#if guild_state.guild}
					<Guild guild={guild_state.guild} />
				{:else}
					GUILD
				{/if}
			{:else}
				<FallBackChannel clickable={true} channel_id={monitor.target_id} channel={channel_obj} />
			{/if}
		</div>
		<div class="status {monitor.is_suspended ? 'suspended' : 'active'} {is_paused ? 'paused' : ''}">
			{#if monitor.is_suspended}
				Suspended
			{:else if is_paused}
				<p>
					Paused
					<small
						>Temporarily paused. Global monitors are a premium feature. <a
							data-premium="true"
							href={PUBLIC_SKU_STORE}>View Tiers</a
						>
					</small>
				</p>
			{:else}
				<p>
					Active
					<small>
						Keeping <b>{monitor.manages_threads_count}</b> threads open!
						<a class="active_count_text" href="./threads?monitor={monitor.target_id}">(view)</a>
					</small>
				</p>
			{/if}
		</div>
	</div>

	<div class="container">
		<div class="filter_container">
			{#if active_filters.length === 0}
				Will watch all threads
			{:else}
				{#each active_filters as filter, i}
					<div class="filter_row_SCJ_MENTION_BEST_CULT">
						<p class="name">{filter.id}</p>

						<div class="items">
							{#if filter.id === 'regex'}
								<code>{monitor.regex}</code>
							{:else if filter.id === 'roles' && monitor.role_whitelist}
								{#each monitor.role_whitelist as role_id}
									{@const role = guild_state.get_role_sync(role_id)}
									{#if role}
										<Role {role} />
									{/if}
								{/each}
							{:else if filter.id === 'tags' && monitor.tags}
								{#each monitor.tags as tag_id}
									{@const tag = get_tag(tag_id)}
									{#if tag}
										<div class="d_tag">
											{#if tag.emoji}
												<Emoji id={tag.emoji.id} name={tag.emoji.name} />
											{/if}
											{tag.name}
										</div>
									{/if}
								{/each}
							{/if}
						</div>
					</div>
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

	.filter_container {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.guy {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.active_count_text {
		color: inherit;
	}

	.filter_row_SCJ_MENTION_BEST_CULT {
		--padding: 0.5rem;
		overflow: hidden;
		display: flex;
		align-items: stretch;
		gap: 0.5rem;
		outline: 1px solid var(--secondary-500);
		border-radius: 0.5rem;

		.name {
			display: flex;
			justify-content: center;
			align-items: center;
			padding: var(--padding);
			min-width: 75px;
			background-color: var(--secondary-500);
		}

		.items {
			align-items: center;
			padding: var(--padding);
			display: flex;
			flex-wrap: wrap;
			column-gap: 0.5rem;
			row-gap: 0.25rem;
			flex-grow: 1;
		}
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
		padding: var(--padding);
		background-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
		border-bottom: 1px solid color-mix(in srgb, var(--primary-500), transparent);
		display: flex;
		align-items: center;
		gap: 0.5rem;
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
		transition: 0.2s;

		&:target {
			animation-name: attention;
			animation-timing-function: ease-in-out;
			animation-duration: 1s;
			animation-iteration-count: 3;
		}
	}

	.mimimimi {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	@keyframes attention {
		0% {
			transform: scale(0.99);
		}
		50% {
			transform: scale(1.01);
		}

		100% {
			transform: scale(0.99);
		}
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

		&.paused {
			--status_clr: var(--premium-500);
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

		.head_thing {
			flex-direction: column;
			align-items: start;
		}
	}
</style>
