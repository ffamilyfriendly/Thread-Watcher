<script lang="ts">
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { fly } from 'svelte/transition';
	import style from '$lib/style/button.module.scss';
	import { fetch_as_json } from '$lib/client/fetch.js';
	import z from 'zod';
	import { invalidateAll } from '$app/navigation';
	import { use_guild_state } from '$lib/stores/guild.svelte.js';
	import { Settings, type GuildSettingsDict } from '@watcher/shared';
	import SettingBox from '$lib/components/ui/settings/SettingBox.svelte';

	const { data } = $props();

	const gs = use_guild_state()

	let settings = $state<GuildSettingsDict>();
	let compare_to = $state<GuildSettingsDict>();

	$effect(() => {
		settings = { ...data.settings }
		compare_to = data.settings
	})

	const is_dirty = $derived(JSON.stringify(settings) !== JSON.stringify(compare_to));
	let is_loading = $state(false);

	function reset_changes() {
		if(!settings) return
		Object.assign(settings, compare_to);
	}

	async function save_changes() {
		if(!settings || !compare_to) return
		is_loading = true;

		const patch: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(settings)) {
			if ((compare_to as any)[key] !== value) {
				patch[key] = value;
			}
		}

		if (Object.keys(patch).length === 0) {
			is_loading = false;
			return;
		}

		const save_res = await fetch_as_json(
			'/api/update_settings',
			{
				body: JSON.stringify({ updated_settings: patch, guild_id: gs.guild_id }),
				method: 'POST'
			},
			z.object({ code: z.number(), message: z.string() })
		);

		if (save_res.isErr()) {
			add_toast_from_error(save_res.error);
			is_loading = false;
			return;
		}

		await invalidateAll();
		Object.assign(compare_to, settings);
		is_loading = false;
		add_toast({
			message: 'Settings Saved!',
			label: 'Nice!',
			timeout: 5000,
			type: 'success'
		});
	}

	
</script>

<main class="main">
	<div class="settings">
		{#each Object.entries(Settings.SETTINGS) as [key, setting] }
			{#if Settings.is_setting_key(key) && settings}
			<SettingBox bind:value={settings[key]} setting_key={key} />
			{/if}
		{/each}
	</div>

	{#if is_dirty}
		<div class="save_cta_bar" transition:fly={{ y: 100, opacity: 0 }}>
			<p>You've unsaved changes</p>

			<div class="btn_row">
				<button disabled={is_loading} class={[style.button, style.tetriary]} onclick={reset_changes}
					>Reset</button
				>
				<button disabled={is_loading} class={[style.button, style.primary]} onclick={save_changes}
					>Save Changes</button
				>
			</div>
		</div>
	{/if}
</main>

<style lang="scss">
	.settings {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.main {
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		min-height: calc(100vh - var(--navbar_height) - (var(--main_padding) * 2));
	}

	.btn_row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.save_cta_bar {
		position: sticky;
		bottom: 1rem;
		margin-inline: auto;
		width: 90%;
		background-color: color-mix(in srgb, var(--primary-500) 30%, transparent);
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
		z-index: 1000;
		backdrop-filter: blur(10px);
		border: 1px solid color-mix(in srgb, var(--primary-500) 50%, transparent);

		@media (max-width: 500px) {
			width: 100%;
			padding: 0.5rem 0.5rem;
		}
	}
</style>
