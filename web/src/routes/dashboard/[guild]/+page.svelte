<script lang="ts">
	import { EyeIcon, SailboatIcon, SpoolIcon } from '@lucide/svelte';

    const { data } = $props()
    const guild = data.guild
</script>

{#if guild}

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