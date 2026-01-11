<script lang="ts">
    import btn_style from "$lib/style/button.module.scss"
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import type { Result } from "neverthrow";

    interface SettingsOption {
        name: string,
        description: string,
        value: string
    }
    interface Props {
        items: SettingsOption[]
        value?: string|null,
        placeholder: string
    }

    let {items, value = $bindable(), placeholder}: Props = $props()

    const item = $derived(items.find(i => i.value === value) ?? null)

    let show_item_picker = $state(false)

    let item_search_query = $state<string>("")
    const searched_items = $derived(
        item_search_query.trim() === "" 
            ? items 
            : items.filter(i => 
                i.name?.toLowerCase().includes(item_search_query.toLowerCase()) || i.description.toLowerCase().includes(item_search_query.toLowerCase()) ||
                i.value === item_search_query
              )
    );

    function handle_search_change(e: KeyboardEvent) {
        if(!(e.target instanceof HTMLInputElement)) return
        item_search_query = e.target.value
    }

    let container: HTMLDivElement | undefined = $state();
    $effect(() => {
        if(!show_item_picker) return

        function handle_click_outside(e: MouseEvent) {
            if(container && !container.contains(e.target as Node)) {
                show_item_picker = false
            }
        }

        window.addEventListener("click", handle_click_outside)

        return () => {
            return window.removeEventListener("click", handle_click_outside)
        }
    })
</script>

{#snippet render_item(item: SettingsOption)}
    <div class="settings_option">
        <p class="name">{item.name}</p>
        <p class="description">{item.description}</p>
    </div>
{/snippet}

<div bind:this={container} class="picker">
    <b>Current</b>
    <div class="current_selection">
        <div class="info">
            {#if item}
                {@render render_item(item)}
            {:else}
                <p>{value}</p>
            {/if}
            <button class={[btn_style.button, btn_style.tetriary]} onclick={() => show_item_picker = !show_item_picker}>Select</button>
        </div>
    </div>

    {#if show_item_picker}
    <div class="options" in:fly={{ duration: 200, opacity: 0, y:-8 }} out:fly={{ duration: 200, opacity: 0, y: -8 }}>
       <div class="roles_list">
            <input value={item_search_query} onkeyup={handle_search_change} class="search_roles" placeholder={placeholder} type="search" />
            {#each searched_items as item }
            <button onclick={() => {
                    show_item_picker = false;
                    value = item.value
                }} class="btn_select_role">
                {@render render_item(item)}
            </button>
            {/each}
        </div>
    </div>
    {/if}
</div>

<style lang="scss">
    @use '../../../style/colours.scss';

    .btn_select_role {
        display: block;
        background-color: transparent;
        border: none;
        text-align: inherit;
        font-size: inherit;
        cursor: pointer;
    }

    .settings_option {
        color: white;

        & .description {
            font-size: smaller;
            opacity: .7;
        }
    }

    .picker {
        position: relative;
        max-width: 300px;
    }

    .current_selection {
        max-width: 300px;
        padding: .5rem;
        outline: 1px solid rgba(128, 128, 128, 0.33);
        border-radius: .5rem;
    }

    .info {
        display: flex;
        align-items: center;
        justify-content: space-between;

        & p {
            flex-grow: 1;
        }
    }

    .roles_list {
        display: flex;
        flex-direction: column;
        gap: .3rem;
        max-height: 500px;
        overflow-y: scroll;
    }

    .options {
        z-index: 1;
        border-radius: .5rem;
        background-color: var(--background-600);
        padding: .5rem;
        position: absolute;
    }

    input {
        background-color: var(--background-700);
        border: none;
        color: white;
        padding: .5rem;
        border-radius: .5rem;
        outline: 1px solid rgba(128, 128, 128, 0.2);
    }
</style>