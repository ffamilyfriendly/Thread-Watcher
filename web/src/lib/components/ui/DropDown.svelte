<script lang="ts">
    import { onDestroy, type Snippet } from 'svelte';
    import { ChevronDown } from "@lucide/svelte";
	import {  fly } from 'svelte/transition';
	import { browser } from '$app/environment';
    let show_content = $state(false);

    interface Props {
        parent_item: Snippet;
        child_item: Snippet
    }

    let btn_elem: HTMLButtonElement;
    let child_elem: HTMLDivElement | null = $state(null);

    let { parent_item, child_item }: Props = $props();

    let position: { x: number, y: number } = $state({ x: 0, y: 0 })

    function calc_position() {
        if(btn_elem && child_elem) {
            console.log("hi")
            const btn = btn_elem.getBoundingClientRect();
            const child = child_elem.getBoundingClientRect();

            position = {
                x: btn.right - child.width,
                y: btn.bottom,
            };
        }
    }

    function check_should_close_click_outside(ev: PointerEvent) {
        if(!child_elem) return
        const btn = btn_elem.getBoundingClientRect();
        const child = child_elem.getBoundingClientRect();
        
        const is_within_x_range = ev.x < btn.right && child.left < ev.x
        const is_within_y_range = ev.clientY >= btn.top && ev.clientY <= child.bottom;
        const within_allowed_box = is_within_x_range && is_within_y_range

        if(!within_allowed_box) {
            show_content = false
            window.removeEventListener("click", check_should_close_click_outside)
        }
    }

    function toggle_dropdown() {
        show_content = !show_content;
        if(browser && show_content) window.addEventListener("click", check_should_close_click_outside)

        setTimeout(() => {
            calc_position()
        }, 0)
    }

    onDestroy(() => {
        if(browser) window.removeEventListener("click", check_should_close_click_outside)
    })
</script>

<div>
    {@render parent_item()}
    <button bind:this={btn_elem} class="arrow {show_content ? "dropped" : ""}" onclick={toggle_dropdown}><ChevronDown /></button>

    {#if show_content}
        <div bind:this={child_elem} style="left: {position.x}px; top: calc({position.y}px + 1rem)" class="child_container" in:fly={{ duration: 200, opacity: 0, y:-8 }} out:fly={{ duration: 200, opacity: 0, y: -8 }}>
            {@render child_item()}
        </div>
    {/if}
</div>

<style lang="scss">
    @use "../../style/colours.scss";

    div {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .child_container {
        @extend .bg-background-700;
        min-width: 15em;
        border-radius: .5rem;
        position: absolute;
        box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;
    }

    .arrow {
        cursor: pointer;
        transition: .3s;
        background-color: transparent;
        border: none;
        color: inherit;

        &.dropped {
            transform: rotateX(180deg);
        }
    }
</style>