<script lang="ts">
	import { PUBLIC_PREMIUM_SKU_STORE_LINK } from '$env/static/public';
    import btn_style from '$lib/style/button.module.scss';
	import { Crown, ExternalLink, Rocket, ShieldCheck } from '@lucide/svelte';
    
    // Update this with your actual Discord App Directory / Store link
    const DISCORD_STORE_URL = PUBLIC_PREMIUM_SKU_STORE_LINK;
</script>

<div class="upsell_container">
    <div class="info_box">
        <p class="text">
            This server is currently on the <strong>Free Tier</strong>. 
            Upgrade to <strong>Thread-Watcher Premium</strong> to unlock:
        </p>
        
        <ul class="benefits">
			<li><ShieldCheck size={16} /> Server-Wide monitors & batch watching</li>
            <li><ShieldCheck size={16} /> Extended ticket message archival</li>
            <li><ShieldCheck size={16} /> AI-powered thread summaries</li>
			<li><ShieldCheck size={16} /> ...and more!</li>
        </ul>
    </div>

    <div class="actions">
        <a 
            href={DISCORD_STORE_URL} 
            target="_blank" 
            class="{btn_style.primary} premium_btn"
        >
            <Rocket size={18} />
            Upgrade on Discord
            <ExternalLink size={14} />
        </a>
    </div>

    <p class="footer_note">
        Subscriptions are managed securely via Discord.
    </p>
</div>

<style lang="scss">
    .upsell_container {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        padding: 2rem 1.5rem;
		padding-top: 0;
        background: var(--bg-100);
        border-radius: 1rem;
    }

    .head {
        color: var(--premium-500);
        font-size: 1.5rem;
        font-weight: 900;
        margin: 0;
        text-transform: uppercase;
        letter-spacing: 0.1rem;
    }

    .info_box {
        margin: 1.5rem 0;
        
        .text {
			text-align: left;
            max-width: 40ch;
            line-height: 1.5;
            opacity: 0.9;
            margin-bottom: 1rem;
            
            strong {
                color: var(--premium-300);
            }
        }
    }

    .benefits {
        list-style: none;
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
        font-size: 0.95rem;
        opacity: 0.8;

        li {
			width: 100%;
			flex: 1;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            color: var(--text-100);
            
            :global(svg) {
                color: var(--premium-400);
            }
        }
    }

    .actions {
        width: 100%;
        margin-top: 1rem;

        .premium_btn {
            background-color: var(--premium-500);
			color: black;
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            padding: 1rem 2rem;
            font-weight: bold;
            font-size: 1.1rem;
            transition: all 0.2s ease;
            text-decoration: none;
            border-radius: 0.5rem;

            &:hover {
                transform: translateY(-2px);
                background-color: var(--premium-400);
                box-shadow: 0 4px 15px color-mix(in srgb, var(--premium-500) 40%, transparent);
            }
        }
    }

    .footer_note {
        margin-top: 1.5rem;
        font-size: 0.8rem;
        opacity: 0.4;
    }
</style>