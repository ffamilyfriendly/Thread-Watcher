<script lang="ts">
    import { get_all_toasts as get_all_toasts, remove_toast as remove_toast } from "$lib/state/toasts.svelte";
    import { flip } from 'svelte/animate';
    import { fly } from 'svelte/transition';
    import btn_style from "$lib/style/button.module.scss"
</script>

<div class="toast_container">
    {#each get_all_toasts() as toast (toast.id)}
        <div class="toast {toast.type}" animate:flip={{ duration: 300 }} transition:fly={{ x: 100, opacity: 0 }}>
            {#if toast.icon}
                {@const Icon = toast.icon}
                <Icon color="var(--accent)" />
            {/if}
            <div class="text">
                {#if toast.label} <small>{toast.label}</small> {/if}
                <p>{toast.message}</p>
            </div>
            <button class={[btn_style.button, "dismiss"]} onclick={() => remove_toast(toast.id)}>×</button>
        </div>    
    {/each}
</div>

<style lang="scss">

    .dismiss {
        position: absolute;
        top: .5rem;
        right: .5rem;
    }

    .text {
        p {
            margin: 0;
            word-break: break-word;
        }
    }

    .toast_container {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        z-index: 9999;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: flex-end;
    }

    .toast {
        position: relative;
        padding: 1rem;
        border-radius: 0.5rem;
        background: color-mix(in srgb, var(--accent) 20%, transparent);
        border-left: 4px solid var(--accent);
        display: flex;
        gap: .5rem;
        align-items: center;
        min-width: 250px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        backdrop-filter: blur(10px);

        max-width: min(500px, 90%);
        width: fit-content;

        small {
            font-weight: 500;
            opacity: .7;
        }

        &.info { --accent: var(--primary-900) }
        &.error { --accent: var(--error-500); }
        &.success { --accent: var(--success-900); }
    }
</style>