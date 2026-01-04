<script lang="ts">
    import { page } from "$app/state"
    import { Activity, Cog, Eye, LayoutDashboard, PanelBottom, Skull, Spool, TicketCheck, TicketMinus, type Icon as IconType } from "@lucide/svelte"
	import { onDestroy, onMount, tick } from "svelte";
	import { browser } from "$app/environment";
	import { fly } from "svelte/transition";

    type MenuItem = {
        name: string;
        href: string;
        icon: typeof IconType
    }

    const guild_id = page.params.guild;

    function link_to(page: string) {
        // we dont prepend a slash to an empty page string as we want the matching to work for the dashboard page (/dashboard/guildid)
        let safe_page = !page.startsWith("/") && page ? "/" + page : page
        return `/dashboard/${guild_id}${safe_page}`
    }

    interface Props {
        open: boolean
    }

    let { open }: Props = $props();

    const other_items: MenuItem[] = [
        {
            name: "Dashboard",
            href: link_to(""),
            icon: LayoutDashboard
        },
        {
            name: "Settings",
            href: link_to("settings"),
            icon: Cog
        }
    ]

    const core_items: MenuItem[] = [
        {
            name: "Watch & Monitor",
            href: link_to("core"),
            icon: Activity
        },
        {
            name: "Watched Threads",
            href: link_to("threads"),
            icon: Spool
        },
        {
            name: "Channel Monitors",
            href: link_to("monitors"),
            icon: Eye
        }
    ]

    const ticket_items: MenuItem[] = [
        {
            name: "Panels",
            href: link_to("ticket-panels"),
            icon: PanelBottom
        },
        {
            name: "Open Tickets",
            href: link_to("open-tickets"),
            icon: TicketCheck
        },
        {
            name: "Closed Tickets",
            href: link_to("closed-tickets"),
            icon: TicketMinus
        },
    ]

    function is_active(item: MenuItem): boolean {
        const current_path = page.url.pathname
        return current_path === item.href
    }

    let sidebar_ref: HTMLElement | null = $state(null)

    function update_sidebar_height() {
        if(sidebar_ref) {
            const pos = sidebar_ref.getBoundingClientRect()

            const height = window.innerHeight - pos.top
            sidebar_ref.style.height = height + "px"
        }
    }

    onMount(async () => {
        await tick()
        update_sidebar_height()
        if(browser) window.addEventListener("resize", update_sidebar_height)
    })

    onDestroy(() => {
        if(browser) window.removeEventListener("resize", update_sidebar_height)
    })
</script>

{#if open}
<aside bind:this={sidebar_ref} class="sidebar {open ? "open" : ""}" in:fly={{ duration: 200, opacity: 0, x:-8 }} out:fly={{ duration: 200, opacity: 0, x: -8 }}>
    {#each other_items as item}
        {@const Icon = item.icon }
        <a class="module {is_active(item) ? "active" : ""}" href={item.href}>
            <Icon />
            <span>{item.name}</span>
        </a>
    {/each}
    <h3 class="header">Core</h3>
    {#each core_items as item}
        {@const Icon = item.icon }
        <a class="module {is_active(item) ? "active" : ""}" href={item.href}>
            <Icon />
            <span>{item.name}</span>
        </a>
    {/each}

    <h3 class="header">Tickets</h3>
    {#each ticket_items as item}
        {@const Icon = item.icon }
        <a class="module {is_active(item) ? "active" : ""}" href={item.href}>
            <Icon />
            <span>{item.name}</span>
        </a>
    {/each}
</aside>
{/if}

<style lang="scss">
    @use 'sass:color';
    @use "../../../lib/style/colours.scss";

    .container {
        display: flex;
        gap: 1rem;
    }

    .sidebar {
        @extend .bg-background-600;
        height: 100%;
        padding: 1em;
        min-width: min(25%, 20em);
        z-index: 1336;

        .module {
            transition: .3 ease-in-out;
            display: flex;
            align-items: center;
            gap: 1rem;
            text-decoration: none;
            color: color.adjust(white, $lightness: 25%);
            padding: .5rem;
            border-radius: .5rem;

            &:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }

            &.active {
                @extend .bg-background-800;
                color: white;
                font-weight: bold;
                box-shadow: rgba(0, 0, 0, 0.16) 0px 1px 4px;
            }
        }

        @media (max-width: 500px) {
            width: 100%;
            position: absolute;
        }
    }

    .header {
        margin-bottom: .5rem;
        margin-top: 1rem;
        font-size: smaller;
    }
</style>