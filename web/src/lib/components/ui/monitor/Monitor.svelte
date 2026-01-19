<script lang="ts">
	import btn_style from '$lib/style/button.module.scss';
	import type { DiscordChannel } from '$lib/types/internal_api';
	import type { ChannelDataWithFilters } from '@watcher/shared';
	import FallBackChannel from '../discord/FallBackChannel.svelte';
	import { CirclePause, CirclePower, Trash } from '@lucide/svelte';
	import { safe_fetch } from '$lib/client/fetch';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import Modal from '../Modal.svelte';
	import RolePicker from '../settings/RolePicker.svelte';
	import { guild_state } from '$lib/stores/guild.svelte';
	import StringPicker from '../settings/StringPicker.svelte';
	import Guild from '../discord/Guild.svelte';

	interface Props {
		monitor: ChannelDataWithFilters;
		monitors: ChannelDataWithFilters[];
	}

	let { monitors = $bindable(), ...rest }: Props = $props();
	const monitor = $state(rest.monitor);
	let regex = $state(rest.monitor.regex?.source);

	const channel_obj = $derived(guild_state.channels.find((c) => c.id === monitor.id));

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

		const res = await safe_fetch(`/api/update_monitor`, {
			body: JSON.stringify(data),
			method: 'PATCH'
		});

		if (res.isErr()) {
			monitor.is_suspended = !value_to_set;
			console.error(res.error);
			return add_toast_from_error(res.error);
		}
	}

	async function delete_monitor() {
		const res = await safe_fetch(
			`/api/delete_monitor?monitor_id=${monitor.id}&guild_id=${guild_state.guild_id}`,
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

	let show_delete_modal = $state(false);
</script>

{#if show_delete_modal}
	{#snippet buttons()}
		<button onclick={delete_monitor} class={[btn_style.button, btn_style.error]}>Delete</button>
	{/snippet}
	<Modal {buttons} title="Delete Monitor" bind:set_open={show_delete_modal}>
		<p>This <b>cannot</b> be undone.</p>
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
			{:else}
				Active
			{/if}
		</div>
	</div>

	<div class="container">
		<div>
			<h4>Conditions</h4>
			<div class="thingie">
				<small>User needs any of these roles</small>
				<RolePicker multiple={true} value={monitor.role_whitelist} roles={guild_state.roles} />
			</div>

			<div class="thingie">
				<small>Thread name needs to match this regex</small>
				<input placeholder="hi" type="text" bind:value={regex} />
			</div>

			<div class="thingie">
				<small>Post needs to have any of these tags</small>
			</div>
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
		padding-bottom: 2rem;
		justify-content: space-between;
	}

	.thingie {
		display: flex;
		align-items: center;
		gap: 1rem;

		input {
			color: inherit;
			padding: 0.1rem;
			margin: 0.5rem 0rem;
			background-color: transparent;
			border: none;
			border-radius: 0.5rem;
			font-size: 0.9rem;
			padding: 1rem;
			margin: 0.5rem 0rem;
			outline: 1px solid rgba(128, 128, 128, 0.33);
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
		display: flex;
		align-items: center;
		gap: 0.3rem;

		--status_clr: var(--success-500);

		padding: 0.25rem 0.5rem;
		border-radius: 0.5rem;
		width: fit-content;

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
</style>
