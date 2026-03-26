<script lang="ts">
	import { Loader } from "@lucide/svelte";
	import type { Snippet } from "svelte";
	import Modal from "./Modal.svelte";

    interface Props {
        on_click?: () => void
        variant?: "primary" | "error" | "tetriary" | "premium",
        shape?: "rect" | "circle"
        load_with?: () => Promise<unknown>
        children: Snippet
        disabled?: boolean
        class?: string
        href?: string
        confirmation?: {
            title: string,
            body: string,
            proceed_btn_text: string,
            cancel_btn_text: string
        }
    }

    const { on_click, load_with, children, disabled, variant = "primary", class: className = "", href, confirmation, shape = "rect" }: Props = $props()

    let is_loading = $state(false)
    let confirmation_given = $state(false)
    let show_confirmation_modal = $state(false)

    async function handle_on_click(e: MouseEvent) {
        
        if(confirmation && !confirmation_given && !e.shiftKey) {
            show_confirmation_modal = true
            return
        }

        if(on_click) return on_click()
        if(!load_with) return
        is_loading = true

        try {
            await load_with()
        } finally {
            is_loading = false
        }
    }

    const is_disabled = $derived(disabled || is_loading)
</script>

{#if show_confirmation_modal && confirmation}
    <Modal title={confirmation.title} bind:set_open={show_confirmation_modal}>
        <p class="confirmation_text">{confirmation.body}</p>
        {#snippet buttons()}
            <button onclick={() => show_confirmation_modal = false} class="tetriary button">
                {confirmation.cancel_btn_text}
            </button>
            <button onclick={(e) => { confirmation_given = true; show_confirmation_modal = false; handle_on_click(e) }} class="error button">
                {confirmation.proceed_btn_text}
            </button>
        {/snippet}
    </Modal>
{/if}

{#if href}
<a aria-disabled={is_disabled} class:disabled={disabled} class="{variant} {className} {shape} button" href={href}>
    {@render children()}
</a>
{:else}
<button class="{variant} {className} {shape} button" disabled={is_disabled} onclick={handle_on_click}>
    {#if is_loading}
    <div class="loader">
        <Loader size={16} class="ICON" />
    </div>
    {/if}

    {@render children()}
</button>
{/if}

<style lang="scss">

    .confirmation_text {
        max-width: 35ch;
    }

    .primary {
        --bg: var(--primary-500);
        --text: white;
    }

    .tetriary {
        --bg: rgba(255, 255, 255, 0.087);
        --text: white;
        background-color: transparent !important;
    }

    .premium {
        --bg: var(--premium-500);
        --text: white;
    }

    .error {
        --bg: var(--error-500);
        --text: white;
    }

    .button {
        all: unset; 
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.6rem 1.2rem;
        font-size: 0.875rem;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        position: relative;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        user-select: none;
        background-color: var(--bg);
        border: 1px solid color-mix(in srgb, var(--bg) 90%, white);
        color: var(--text);
        overflow: hidden;

        &.rect {
            border-radius: .25rem;
        }

        &.circle {
            border-radius: 50%;
            padding: 0.6rem 0.6rem;
        }

        &:hover:not(:disabled) {
            transform: scale(1.04);
            background-color: color-mix(in srgb, var(--bg) 90%, white);
        }

        &:disabled, &.disabled {
            pointer-events: none;
            opacity: .6;
            cursor: unset;
        }
    }

    :global(.ICON) {
        animation-name: loader;
        animation-duration: 1s;
        animation-iteration-count: infinite;
        color: var(--text);
    }

    .loader {
        position: absolute;
        left: 0;
        top: 0;
        right: 0;
        bottom: 0;
        background-color: var(--bg);

        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    @keyframes loader {
        0% {
            transform: rotateZ(0deg);
        }
        100% {
            transform: rotateZ(360deg);
        }
    }
</style>