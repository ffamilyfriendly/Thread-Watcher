<script>
	import { browser } from "$app/environment";
	import NavBar from "$lib/components/ui/NavBar.svelte";
    import { sidebar_open } from "$lib/stores/sidebar";
	import { onMount } from "svelte";

    let should_be_open = $state(false)
    let { children} = $props();

    onMount(() => {
        if(browser) {
            const unsub = sidebar_open.subscribe((open) => {
                should_be_open = open || (window.innerWidth > 500)
            })

            const handle_resize = () => {
                should_be_open = $sidebar_open || (window.innerWidth > 500)
            }

            window.addEventListener("resize", handle_resize)

            return () => {
                unsub()
                window.removeEventListener("resize", handle_resize)
            }
        }
    })
    
</script>

<div class="container">
    <NavBar open={should_be_open} />
    
    <main>
        {@render children()}
    </main>
</div>

<style lang="scss">
    @use 'sass:color';
    @use "../../../lib/style/colours.scss";

    .container {
        display: flex;
        gap: 1rem;
        align-items: stretch;
        height: calc(100vh - 62px);
    }

    main {
        flex-grow: 1;
        padding: 1em;
        overflow-y: scroll;
    }
</style>