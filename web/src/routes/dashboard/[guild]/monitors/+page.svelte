<script lang="ts">
	import { safe_fetch } from '$lib/client/fetch.js';
	import FallBackChannel from '$lib/components/ui/discord/FallBackChannel.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Monitor from '$lib/components/ui/monitor/Monitor.svelte';
	import MonitorConfiguration from '$lib/components/ui/monitor/MonitorConfiguration.svelte';
	import PremiumButton from '$lib/components/ui/premium/PremiumButton.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { use_guild_state } from '$lib/stores/guild.svelte.js';
	import btn_styles from '$lib/style/button.module.scss';
	import { CAN_BE_MONITOR_TARGET } from '$lib/types/discord.js';
	import { Eye } from '@lucide/svelte';
	import { ZMonitor, type Monitor as dMonitor } from '@watcher/shared';

	const guild_state = use_guild_state()

	const { data } = $props();
	let monitors = $derived(data.monitors);
	let selected_channel = $state<string>();
	let allowed_new_targets = $derived(
		guild_state.channels.filter(
			(ch) =>
				!monitors.find((mn) => mn.target_id == ch.id) && CAN_BE_MONITOR_TARGET.includes(ch.type)
		)
	);

	let create_monitors_modal = $state(false);
	let monitor_configuration = $state<Omit<dMonitor, 'is_suspended' | 'manages_threads_count'>>();
	function start_monitor_process(id?: string) {
		create_monitors_modal = true;

		if (id && guild_state.guild_id) {
			monitor_configuration = {
				target_id: id,
				guild_id: guild_state.guild_id,
				tags: null,
				role_whitelist: null,
				regex: undefined
			};
		}
	}

	async function create_new_monitor() {
		if (!monitor_configuration) return;

		// DOing this just to ensure our serializers are attached
		const safe_parse = ZMonitor.omit({ manages_threads_count: true }).safeParse(
			monitor_configuration
		);
		if (!safe_parse.success) {
			return add_toast_from_error(safe_parse.error);
		}

		const res = await safe_fetch('/api/monitor', {
			method: 'POST',
			body: JSON.stringify(safe_parse.data)
		});

		if (res.isErr()) {
			add_toast_from_error(res.error);
		}

		const parsed = ZMonitor.safeParse(monitor_configuration);
		if (parsed.success) monitors = [...monitors, parsed.data];

		monitor_configuration = undefined;
		selected_channel = undefined;
		create_monitors_modal = false;
	}
</script>

{#if create_monitors_modal}
	{@const show_advanced = !!monitor_configuration}
	<Modal bind:set_open={create_monitors_modal} title="Create Monitor">
		{#snippet buttons()}
			{#if show_advanced}
				<button class={[btn_styles.button, btn_styles.primary]} onclick={create_new_monitor}>
					Create
				</button>
			{:else}
				<button
					disabled={!selected_channel}
					class={[btn_styles.button, btn_styles.primary]}
					onclick={() => start_monitor_process(selected_channel)}
				>
					Select Channel
				</button>
			{/if}
		{/snippet}

		{#if show_advanced}
			<MonitorConfiguration data={monitor_configuration!} />
		{:else if guild_state.guild_id}
			<ChannelPicker
				guild_id={guild_state.guild_id}
				channels={allowed_new_targets}
				bind:value={selected_channel}
			/>
		{/if}
	</Modal>
{/if}

<div class="btn_row">
	<PremiumButton on_click={() => start_monitor_process(guild_state.guild_id)}>
		Create Server-Wide
	</PremiumButton>
	<button class={[btn_styles.button, btn_styles.primary]} onclick={() => start_monitor_process()}>
		<Eye />
		Create Monitor
	</button>
</div>

<h2>Your Monitors</h2>
<div class="monitors">
	{#each monitors as monitor (monitor.target_id)}
		<Monitor bind:monitors {monitor} />
	{/each}
	{#if monitors.length === 0}
		<p>No monitors found!</p>
	{/if}
</div>

<style lang="scss">
	.btn_row {
		display: flex;
		align-items: center;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.monitors {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.create_new_channel {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
</style>
