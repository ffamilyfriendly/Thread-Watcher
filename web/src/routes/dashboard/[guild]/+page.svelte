<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { fetch_as_json } from '$lib/client/fetch.js';
	import RolePicker from '$lib/components/ui/settings/RolePicker.svelte';
	import SettingBox from '$lib/components/ui/settings/SettingBox.svelte';
	import { add_toast, add_toast_from_error } from '$lib/state/toasts.svelte.js';
	import { EyeIcon, SailboatIcon, SpoolIcon } from '@lucide/svelte';
	import z from 'zod';

    const { data } = $props()
    const guild = data.guild

    let bot_master_role = $state<string|null>()

    async function update_bot_master_role() {
        const save_res = await fetch_as_json("/api/update_settings", { body: JSON.stringify({updated_settings: { BOT_MASTER_ROLE: bot_master_role }, guild_id: data.guild_id}), method: "POST" }, z.object({ code: z.number(), message: z.string() }))
    
        if(save_res.isErr()) return add_toast_from_error(save_res.error)
        
        await invalidateAll()
        add_toast({
            label: "Good Job!",
            message: "Added Bot Master",
            timeout: 5000,
            type: "success"
        })
    }

    $effect(() => {
        if(!bot_master_role) return
        const timeout = setTimeout(update_bot_master_role, 1500)
        return () => clearTimeout(timeout)
    })
</script>
<div class="card_container">
    <div class="card">
        <SpoolIcon />
        <div>
            <span>{guild.threads_watched}</span>
            <small>Threads Watched</small>
        </div>
    </div>
    <div class="card">
        <EyeIcon />
        <div>
            <span>{guild.monitors_active}</span>
            <small>Active Monitors</small>
        </div>
    </div>
    <div class="card">
        <SailboatIcon />
        <div>
            <span>{guild.owned_by_shard}</span>
            <small>Your Shard</small>
        </div>
    </div>
</div>

{#if !guild.guild_settings.BOT_MASTER_ROLE}
    <SettingBox name="Bot Master" description="Select the role that can access the bot dashboard." disclaimer="Any role with Administrator will be considered a Bot Master">
        <RolePicker bind:value={bot_master_role} roles={data.roles} guild_id={data.guild_id} />
    </SettingBox>
{/if}

hello

<style lang="scss">
    .card {
        display: flex;
        gap: 1rem;
        flex-grow: 1;

        border-radius: .5rem;
        outline: 1px solid rgba(128, 128, 128, 0.3);
        padding: 1.5rem;
        padding-top: 1rem;
        padding-bottom: 1rem;

        & div {
            display: flex;
            flex-direction: column;
        }

        & small {
            opacity: .5;
        }

        @media (max-width: 500px) {
            flex-direction: column;
            
            & svg {
                display: none;
            }
        }
    }

    .card_container {
        display: flex;
        justify-content: space-evenly;
        padding-top: 2%;
        padding-bottom: 2%;
        gap: max(2%, 5px);
    }
</style>