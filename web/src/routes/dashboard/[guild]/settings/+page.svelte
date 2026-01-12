<script lang="ts">
	import ChannelPicker from '$lib/components/ui/settings/ChannelPicker.svelte';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import SettingsBox from '$lib/components/ui/settings/SettingBox.svelte';
	import StringPicker from '$lib/components/ui/settings/StringPicker.svelte';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { fly } from 'svelte/transition';
    import style from "$lib/style/button.module.scss"
	import { fetch_as_json } from '$lib/client/fetch.js';
	import z from 'zod';

    const { data } = $props()

    const settings = $state({...data.guild.guild_settings})
    let compare_to = $state(data.guild.guild_settings)
    const is_dirty = $derived(JSON.stringify(settings) !== JSON.stringify(compare_to))
    let is_loading = $state(false)

    function reset_changes() {
        Object.assign(settings, compare_to)
    }

    async function save_changes() {
        is_loading = true

        const patch: Record<string, unknown> = {};
        for(const [key, value] of Object.entries(settings)) {
            if((compare_to as any)[key] !== value) {
                patch[key] = value
            }
        }

        if(Object.keys(patch).length === 0){
            is_loading = false;
            return
        }

        console.log("PATCH", patch)

        const save_res = await fetch_as_json("/api/update_settings", { body: JSON.stringify({updated_settings: patch, guild_id: data.guild_id}), method: "POST" }, z.object({ code: z.number(), message: z.string() }))

        if(save_res.isErr()) {
            add_toast_from_error(save_res.error)
            is_loading = false
            return
        }

        Object.assign(compare_to, settings)
        is_loading = false;
        add_toast({
            message: "Settings Saved!",
            label: "Nice!",
            timeout: 5000,
            type: "success"
        })
    }
</script>

<main class="main">
    <div class="settings">
    <SettingsBox name="Bot Master" description="Select the role that can access the bot dashboard." disclaimer="Any roll with Administrator will be considered a Bot Master">
        <RolePicker guild_id={data.guild_id} roles={data.roles} bind:value={settings.BOT_MASTER_ROLE} />
    </SettingsBox>
    
    <SettingsBox name="Logging Channel" description="Choose the channel where Thread-Watcher will send its logs.">
        <ChannelPicker guild_id={data.guild_id} channels={data.channels} bind:value={settings.LOGGING_CHANNEL} />
    </SettingsBox>
    
    <SettingsBox name="Bump Behaviour" description="Determine how the bot should handle threads that are becoming inactive.">
        <StringPicker bind:value={settings.BUMP_BEHAVIOUR} placeholder="Search Options" items={[
            { name: "Bump and Un-Archive", value: "BUMP_AND_UNARCHIVE", description: "keep thread un-archived and active" },
            { name: "Un-Archive", value: "UNARCHIVE_ONLY", description: "Only un-archive the thread" }
            ]} />
    </SettingsBox>
    </div>
    
    {#if is_dirty}
        <div class="save_cta_bar" transition:fly={{ y: 100, opacity: 0 }}>
            <p>You've unsaved changes</p>
    
            <div class="btn_row">
                <button disabled={is_loading} class={[style.button, style.tetriary]} onclick={reset_changes}>Reset</button>
                <button disabled={is_loading} class={[style.button, style.primary]} onclick={save_changes}>Save Changes</button>
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
        gap: .5rem;
    }

    .save_cta_bar {
        position: sticky;
        bottom: 1rem;
        margin-inline: auto;
        width: 90%;
        background-color: var(--background-800);
        padding: 0.75rem 1.5rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
        z-index: 1000;
        backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.1);

        @media (max-width: 500px) {
            width: 100%;
            padding: 0.5rem 0.5rem;
        }
    }
</style>