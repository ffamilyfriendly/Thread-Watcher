<script lang="ts">
	import { safe_fetch } from '$lib/client/fetch.js';
	import FallBackChannel from '$lib/components/ui/discord/FallBackChannel.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';
	import Monitor from '$lib/components/ui/monitor/Monitor.svelte';
	import MonitorConfiguration from '$lib/components/ui/monitor/MonitorConfiguration.svelte';
	import PremiumButton from '$lib/components/ui/premium/PremiumButton.svelte';
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { guild_state } from '$lib/stores/guild.svelte.js';
	import btn_styles from '$lib/style/button.module.scss';
	import { CAN_BE_MONITOR_TARGET } from '$lib/types/discord.js';
	import { Eye } from '@lucide/svelte';
	import { ZChannelDataWithFilters, type ChannelDataWithFilters } from '@watcher/shared';

	const { data } = $props();
	let monitors = $derived(data.monitors);
	let selected_channel = $state<string>();
	let allowed_new_targets = $derived(
		guild_state.channels.filter((ch) => !monitors.find((mn) => mn.id == ch.id))
	);

	let create_monitors_modal = $state(false);
	let monitor_configuration = $state<Omit<ChannelDataWithFilters, 'is_suspended'>>();
	function start_monitor_process(id: string) {
		create_monitors_modal = true;

		monitor_configuration = {
			id: id,
			server: guild_state.guild_id,
			tags: null,
			role_whitelist: null,
			regex: undefined
		};
	}

	async function create_new_monitor() {
		if (!monitor_configuration) return;

		const res = await safe_fetch('/api/monitor', {
			method: 'POST',
			body: JSON.stringify(monitor_configuration)
		});

		if (res.isErr()) {
			console.error(res.error);
			return add_toast_from_error(res.error);
		}

		const parsed = ZChannelDataWithFilters.safeParse(monitor_configuration);
		if (parsed.success) monitors = [...monitors, parsed.data];

		monitor_configuration = undefined;
		selected_channel = undefined;
		create_monitors_modal = false;
	}
</script>

{#if create_monitors_modal && monitor_configuration}
	<Modal bind:set_open={create_monitors_modal} title="Create Monitor">
		{#snippet buttons()}
			<button class={[btn_styles.button, btn_styles.primary]} onclick={create_new_monitor}>
				Create
			</button>
		{/snippet}
		<MonitorConfiguration data={monitor_configuration} />
	</Modal>
{/if}

<div class="btn_row">
	<PremiumButton require_level="BASIC" on_click={() => start_monitor_process(guild_state.guild_id)}
		>Create Server-Wide</PremiumButton
	>
	<div class="create_new_channel">
		<ChannelPicker
			only_with_types={CAN_BE_MONITOR_TARGET}
			bind:value={selected_channel}
			guild_id={guild_state.guild_id}
			channels={allowed_new_targets}
		/>

		<button
			disabled={!selected_channel}
			class={[btn_styles.button, btn_styles.primary]}
			onclick={() => start_monitor_process(selected_channel!)}
		>
			<Eye />
			{#if selected_channel}
				Create in
				<FallBackChannel channel_id={selected_channel} />
			{:else}
				Please select a channel
			{/if}
		</button>
	</div>
</div>

<h2>Active Monitors</h2>
<div class="monitors">
	{#each monitors as monitor (monitor.id)}
		<Monitor bind:monitors {monitor} />
	{/each}
</div>

<style lang="scss">
	.btn_row {
		display: flex;
		align-items: center;
		gap: 1rem;
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
