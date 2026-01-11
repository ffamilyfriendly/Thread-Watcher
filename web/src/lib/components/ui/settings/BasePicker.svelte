<script lang="ts" generics="T extends {  id: string, name?: string|null}">
    import btn_style from "$lib/style/button.module.scss"
	import { fly } from "svelte/transition";
	import type { Snippet } from "svelte";
	import type { Result } from "neverthrow";

    interface Props {
        items: T[]
        value?: string|null,
        placeholder: string
        fetcher: (id: string) => Promise<Result<T, Error>>
        render_item: Snippet<[T]>
    }

    let {items, value = $bindable(), fetcher, render_item, placeholder}: Props = $props()

    const local_item = $derived(items.find(i => i.id === value) ?? null)

    let fetched_item = $state<T|null>(null)

    $effect(() => {
        if(value && !local_item) {
            fetcher(value)
            .then(res => {
                if(res.isErr()) {
                    console.error("Could not fetch item", res.error)
                    return
                }

                fetched_item = res.value
            })
        } else {
            fetched_item = null
        }
    })

    const active_item_data = $derived(local_item ?? fetched_item)
    let show_item_picker = $state(false)

    function handle_custom_submit(e: SubmitEvent) { 
        e.preventDefault()
        if(!(e.target instanceof HTMLFormElement)) return
        const form_data = new FormData(e.target)
        const item_id = form_data.get("custom_item_id") as string

        if (item_id && /^\d{17,21}$/.test(item_id)) {
            value = item_id;
            show_item_picker = false;
        }
    }

    let item_search_query = $state<string>("")
    const searched_items = $derived(
        item_search_query.trim() === "" 
            ? items 
            : items.filter(i => 
                i.name?.toLowerCase().includes(item_search_query.toLowerCase()) || 
                i.id === item_search_query
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

<div bind:this={container} class="picker">
    <b>Current</b>
    <div class="current_selection">
        <div class="info">
            {#if active_item_data}
                {@render render_item(active_item_data)}
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
                    value = item.id
                }} class="btn_select_role">
                {@render render_item(item)}
            </button>
            {/each}
        </div>

        <hr/>

        <form onsubmit={handle_custom_submit} class="custom_id">
            <input pattern={"\\d{17,21}"} placeholder="874566715701358632" name="custom_item_id" />
            <input value="Select" type="submit" />
        </form>
    </div>
    {/if}
</div>

<style lang="scss">
    @use '../../../style/colours.scss';

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

    .btn_select_role {
        display: block;
        background-color: transparent;
        border: none;
        text-align: inherit;
        font-size: inherit;
        cursor: pointer;
    }

    input {
        background-color: var(--background-700);
        border: none;
        color: white;
        padding: .5rem;
        border-radius: .5rem;
        outline: 1px solid rgba(128, 128, 128, 0.2);
    }

    .custom_id {
        input {
            background-color: var(--background-700);
            border: none;
            color: white;
            padding: .5rem;
            border-radius: .5rem;
            outline: 1px solid rgba(128, 128, 128, 0.2);
        }
    }

    hr {
        margin-top: .5rem;
        margin-bottom: .5rem;
        opacity: .33;
    }
</style>