<script lang="ts">
	import { goto } from "$app/navigation";
	import { fetch_as_json } from "$lib/client/fetch";
	import Button from "$lib/components/ui/Button.svelte";
import ChannelPicker from "$lib/components/ui/settings/ChannelPicker.svelte";
	import RolePicker from "$lib/components/ui/settings/RolePicker.svelte";
	import { add_toast_from_error } from "$lib/state/toasts.svelte";
	import { use_guild_state } from "$lib/stores/guild.svelte";
	import { CAN_HOLD_THREADS } from "$lib/types/discord";
	import { DEFAULT_TICKET_PANEL, TW_PANEL_NAME_MAX, TW_PANEL_NAME_MIN, type TicketPanel } from "@watcher/shared";
	import z from "zod";
    const gs = use_guild_state()

    async function create_panel() {
        if(!gs.guild_id) return
        if(!name || !channel || !roles) return

        const default_panel = DEFAULT_TICKET_PANEL(gs.guild_id)

        const new_panel: TicketPanel = { ...default_panel, initial_assigned_roles: roles, initial_channel_id: channel, name }

        const res = await fetch_as_json(
			`/api/panel`,
			{
				body: JSON.stringify(new_panel),
				method: "POST"
			},
			z.object({ panel_id: z.string() })
		);

        if(res.isErr()) {
            return add_toast_from_error(res.error)
        }

        goto(`/dashboard/${gs.guild_id}/ticket-panels/${res.value.panel_id}`)
    }

    let name = $state<string>()
    let channel = $state<string>()
    let roles = $state<string[]>()

    const can_create = $derived(name && channel && (roles?.length ?? 0) > 0)
</script>

<div class="container">
    <header>
        <h1>Create Ticket Panel</h1>
        <p class="subtitle">Set up a new entry point for your community support.</p>
    </header>

    <div class="form-grid">
        <section class="card">
            <div class="header">
                <h3>Panel Identity</h3>
                <p>This name helps you identify the panel in the dashboard.</p>
            </div>
            <div class="content">
                <div class="input-group">
                    <label for="panel-name">Display Name</label>
                    <input 
                        id="panel-name"
                        bind:value={name} 
                        type="text" 
                        placeholder="e.g. Technical Support"
                        maxlength={TW_PANEL_NAME_MAX} 
                    />
                    <span class="char-count" class:limit={name?.length === TW_PANEL_NAME_MAX}>
                        {name?.length ?? 0} / {TW_PANEL_NAME_MAX}
                    </span>
                </div>
            </div>
        </section>

        <section class="card">
            <div class="header">
                <h3>Routing & Access</h3>
                <p>Configure where tickets land and who has the keys.</p>
            </div>
            <div class="content">
                <div class="input-group">
                    <label>Destination Channel</label>
                    <ChannelPicker 
                        bind:value={channel} 
                        channels={gs.channels} 
                        guild_id={gs.guild_id ?? ""} 
                        only_with_types={CAN_HOLD_THREADS} 
                    />
                </div>

                <div class="input-group">
                    <label>Support Staff Roles</label>
                    <RolePicker 
                        bind:value={roles} 
                        roles={gs.roles} 
                        multiple={true} 
                    />
                </div>
            </div>
        </section>
    </div>

    <footer class="actions">
        <Button 
            variant="primary" 
            disabled={!can_create} 
            load_with={create_panel}
        >
            Create Panel
        </Button>
    </footer>
</div>

<style lang="scss">
    .container {
        max-width: 800px;
        margin: 2rem auto;
        padding: 0 1rem;
    }

    header {
        margin-bottom: 2.5rem;
        h1 { font-size: 2rem; font-weight: 700; color: var(--text-bright); margin: 0; }
        .subtitle { color: var(--text-muted); margin-top: 0.5rem; }
    }

    .form-grid {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
    }

    .card {
        background: var(--bg-card, #1e1f22); // Discord-ish card bg
        border: 1px solid var(--border, #2b2d31);
        border-radius: 12px;
        overflow: hidden;

        .header {
            padding: 1.5rem;
            background: rgba(0,0,0,0.1);
            border-bottom: 1px solid var(--border, #2b2d31);
            
            h3 { margin: 0; font-size: 1.1rem; font-weight: 600; }
            p { margin: 0.25rem 0 0; font-size: 0.875rem; color: var(--text-muted); }
        }

        .content {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1.25rem;
        }
    }

    .input-group {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        position: relative;

        label {
            font-size: 0.75rem;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-muted);
            letter-spacing: 0.05em;
        }

        input[type="text"] {
            background: var(--bg-input, #111214);
            border: 1px solid var(--border, #2b2d31);
            border-radius: 6px;
            padding: 0.75rem;
            color: var(--text-normal);
            transition: border-color 0.2s;

            &:focus {
                outline: none;
                border-color: var(--brand, #5865f2);
            }
        }
    }

    .char-count {
        position: absolute;
        right: 0;
        top: 0;
        font-size: 0.7rem;
        color: var(--text-muted);
        &.limit { color: var(--error, #ed4245); }
    }

    .actions {
        margin-top: 2rem;
        display: flex;
        justify-content: flex-end;
        padding-bottom: 5rem;
    }
</style>