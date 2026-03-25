<script lang="ts">
	import { nav_state, type MenuSection } from "$lib/stores/navbar.svelte";

    let { section, id }: { section: MenuSection, id: string } = $props()

    $effect(() => {
        const cleanup = nav_state.register_section(id,section)
        return cleanup
    })
</script>
