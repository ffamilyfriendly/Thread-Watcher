<script lang="ts">
    import type { PageProps } from './$types';
    import Button from '$lib/components/ui/Button.svelte';
    import { LayoutPanelLeft, Plus, Settings2, Trash2 } from "@lucide/svelte";
	import { use_guild_state } from '$lib/stores/guild.svelte';
	import { safe_fetch } from '$lib/client/fetch';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';

    const { data }: PageProps = $props();

	
	// svelte-ignore state_referenced_locally
	let panels = $state(data.panels)

	const gs = use_guild_state()

	const is_premium = $derived(gs.is_subscribed ?? false)

    const PANEL_LIMIT_FREE = 3;
    const current_count = $derived(panels.length);
    const is_at_limit = $derived(current_count >= PANEL_LIMIT_FREE && !is_premium);
    const progress_pct = $derived(Math.min((current_count / PANEL_LIMIT_FREE) * 100, 100));

    function str_to_vibrant_clr(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return `hsl(${Math.abs(hash) % 360}, 70%, 60%)`;
    }

	async function delete_panel(panel_id: string) {
		const could_delete = await safe_fetch(`/api/guild/${gs.guild_id}/panels/${panel_id}`, { method: "DELETE" })
		if(could_delete.isErr()) return add_toast_from_error(could_delete.error)
		panels = panels.filter(p => p.panel_id !== panel_id)
	}
</script>

<div class="dashboard-header">
    <div class="title-section">
        <h1>Ticket Panels</h1>
        <p class="subtitle">Deploy specialized entry points for your community.</p>
    </div>

    <div class="usage-card" class:premium={is_premium}>
        <div class="usage-info">
            <span>{current_count} / {is_premium ? '∞' : PANEL_LIMIT_FREE} Panels</span>
            {#if !is_premium}
                <a href="./premium" class="upgrade-link">Upgrade for more</a>
            {/if}
        </div>
        <div class="progress-bar">
            <div class="fill" style="width: {is_premium ? 100 : progress_pct}%"></div>
        </div>
    </div>
</div>

<div class="panels-grid">
    {#each panels as panel (panel.panel_id)}
        {@const color = str_to_vibrant_clr(panel.panel_id)}
        <div class="panel-card" style="--accent: {color}">
            <div class="card-glow"></div>
            <div class="card-content">
                <div class="icon-box">
                    <LayoutPanelLeft size={24} color={color} />
                </div>
                <div class="text">
                    <h3>{panel.name || 'Unnamed Panel'}</h3>
                    <p>{panel.description || 'No description provided.'}</p>
                </div>
                <div class="card-actions">
					<Button load_with={() => delete_panel(panel.panel_id)} confirmation={{title: "Delete Panel", body: "This cannot be undone", proceed_btn_text: "Delete", cancel_btn_text: "Cancel"}} variant="error">
                        <Trash2 size={16} /> Delete
                    </Button>
                    <Button disabled={is_at_limit} variant="tetriary" href="./ticket-panels/{panel.panel_id}">
                        <Settings2 size={16} /> Edit
                    </Button>
                </div>
            </div>
        </div>
    {/each}

    {#if !is_at_limit}
        <a href="./ticket-panels/create-new" class="create-card">
            <Plus size={32} />
            <span>Create New Panel</span>
        </a>
    {/if}
</div>

<style lang="scss">
    .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-end;
        margin-bottom: 2.5rem;
        gap: 2rem;

        @media (max-width: 768px) { flex-direction: column; align-items: flex-start; }
    }

    .usage-card {
        background: var(--background-800);
        padding: 1rem;
        border-radius: 12px;
        min-width: 250px;
        border: 1px solid color-mix(in srgb, var(--background-800) 90%, white);

        .usage-info {
            display: flex;
            justify-content: space-between;
            font-size: 0.85rem;
            margin-bottom: 0.5rem;
            font-weight: 600;
        }
        
        .upgrade-link { color: var(--premium-400); text-decoration: none; font-size: 0.75rem; }

        .progress-bar {
            height: 6px;
            background: #111214;
            border-radius: 10px;
            overflow: hidden;
            .fill { height: 100%; background: var(--primary-500); transition: width 0.3s ease; }
        }

        &.premium .fill { background: linear-gradient(90deg, #ff73fa, #5865f2); }
    }

    .panels-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
    }

    .panel-card {
        position: relative;
        background: var(--background-800);
        border: 1px solid color-mix(in srgb, var(--background-800) 90%, white);
        border-radius: 16px;
        overflow: hidden;
        transition: transform 0.2s, border-color 0.2s;

        &:hover {
            transform: translateY(-4px);
            border-color: var(--accent);
            .card-glow { opacity: 0.1; }
        }

        .card-glow {
            position: absolute;
            inset: 0;
            background: radial-gradient(circle at top left, var(--accent), transparent 70%);
            opacity: 0.03;
            pointer-events: none;
            transition: opacity 0.2s;
        }

        .card-content {
            padding: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 1rem;
            height: 100%;
        }

        .icon-box {
            width: 45px;
            height: 45px;
            background: color-mix(in srgb, var(--accent) 15%, transparent);
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        h3 { margin: 0; font-size: 1.25rem; }
        p { margin: 0; font-size: 0.9rem; color: var(--text-muted); line-height: 1.4; flex-grow: 1; }
    }

    .create-card {
        border: 2px dashed var(--border, #2b2d31);
        border-radius: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 1rem;
        color: var(--text-muted);
        text-decoration: none;
        transition: all 0.2s;
        min-height: 200px;

        &:hover {
            border-color: var(--primary-500);
            color: var(--text-bright);
            background: rgba(255,255,255,0.02);
        }
    }
</style>