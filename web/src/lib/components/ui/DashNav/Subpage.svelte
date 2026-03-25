<script lang="ts">
	import { nav_state } from "$lib/stores/navbar.svelte";
	import type { Snippet } from "svelte";

    let { children }: { children: Snippet } = $props()

    $effect(() => {
        const cleanup = nav_state.register_subpage(children)
        return cleanup
    })
</script>
