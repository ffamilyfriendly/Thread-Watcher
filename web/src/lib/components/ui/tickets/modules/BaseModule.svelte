<script lang="ts">
	import { ChevronDown, ChevronUp } from "@lucide/svelte";
	import type { PipelineModule } from "@watcher/shared";
	import type { Snippet } from "svelte";
	import { slide } from "svelte/transition";

    interface Props {
        module: PipelineModule,
        children: Snippet,
        title: string,
        accent: `#${string}`
    }

    

    const { module = $bindable(), children, accent, title }: Props = $props()

    function on_input(e: Event) {
        const input = e.target as HTMLInputElement;
        const val = input.value.replace(/\s/g, "_")
        .replace(/[^\w]/g, "")
        .slice(0, 20);

        module.id = val
    }

    let expanded = $state(true)

</script>

<div class="wrapper">
    <div style="--accent: {accent}" class="module {expanded ? "" : "hidden"}">
        {#if expanded}
        <div transition:slide={{duration: 300}} class="expansion_wrapper">
            <div class="head">
                <h3 class="space-grotesk">{title}</h3>
            </div>
    
            <div class="content">
                {@render children()}
            </div>
    
            <div class="footer">
                <div class="fella">
                    <p class="jetbrains-mono">ID</p>
                    <input class="jetbrains-mono" bind:value={module.id} oninput={on_input} spellcheck="false" pattern="\w+" maxlength="20" />
                </div>
            </div>
        </div>
        {:else}
            <div transition:slide={{duration: 300}}>
                <p class="space-grotesk">{title}</p>
                <small class="jetbrains-mono">{module.id}</small>
            </div>
        {/if}
    </div>
    <button class="expand" onclick={() => expanded = !expanded}>
        {#if expanded}
            <ChevronUp />
        {:else}
            <ChevronDown />
        {/if}
    </button>
</div>


<style lang="scss">

    :root {
        --padding: .5rem;
        --clr: #121212;
    }

    .wrapper {
        display: flex;
        width: 100%;
        gap: 1rem;
        align-items: start;
    }

    .expand {
        background-color: transparent;
        color: white;
        border: none;
    }

    .module {
        position: relative;
        flex-grow: 1;
        background-color: color-mix(in srgb, var(--clr) 95%, white);
        border-left: 3px solid var(--accent);
        outline: 2px solid rgba(255, 255, 255, 0.09);

        border-radius: .1rem;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);

        &.hidden {
            padding: var(--padding);
            border-radius: .1rem;

            small {
                opacity: .4;
            }
        }

        .content {
            padding: var(--padding);
        }

        .footer {
            border-top: 1px solid color-mix(in srgb, var(--clr) 80%, white);
            background-color: color-mix(in srgb, var(--clr) 90%, white);
            padding: .5rem var(--padding);
        }

        .head {
            border-bottom: 1px solid color-mix(in srgb, var(--clr) 80%, white);
            background-color: color-mix(in srgb, var(--clr) 90%, white);
            padding: .5rem var(--padding);
        }
    }

    .fella {
        display: inline-flex;
        align-items: center;
        gap: .5rem;
        outline: 2px solid color-mix(in srgb, var(--clr) 80%, white);

        p {
            background-color: color-mix(in srgb, var(--clr) 80%, white);
            padding: .15rem;
        }

        input {
            background-color: transparent;
            color: inherit;
            opacity: .9;
            border: none;
            padding: .15rem;
        }
    }
</style>