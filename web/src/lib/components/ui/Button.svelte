<script lang="ts">
	import { Hourglass, Loader, Loader2, LoaderPinwheel } from "@lucide/svelte";
	import type { Result, ResultAsync } from "neverthrow";
	import type { Snippet } from "svelte";

    interface Props {
        on_click?: () => void
        variant?: "primary" | "error" | "tetriary" | "premium"
        load_with?: () => Promise<unknown>
        children: Snippet
        disabled?: boolean
        class?: string
    }

    const { on_click, load_with, children, disabled, variant = "primary", class: className = "" }: Props = $props()

    let is_loading = $state(false)

    async function handle_on_click() {
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

<button class="{variant} {className}" disabled={is_disabled} onclick={handle_on_click}>
    {#if is_loading}
    <div class="loader">
        <Loader size={16} class="ICON" />
    </div>
    {/if}

    {@render children()}
</button>

<style lang="scss">

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

    button {
        all: unset; // Reset default styles
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
        box-sizing: border-box;

        &:hover:not(:disabled) {
            transform: scale(1.04);
            background-color: color-mix(in srgb, var(--bg) 90%, white);
        }

        &:disabled {
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