<script lang="ts">
    import "$lib/style/app.scss"
    import logo from "$lib/assets/thread_watcher_icon.png"

    import { page } from "$app/stores"
    import { Activity, Cog, Eye, LayoutDashboard, PanelBottom, Skull, Spool, TicketCheck, TicketMinus, type Icon as IconType } from "@lucide/svelte"

    type MenuItem = {
        name: string;
        href: string;
        icon: typeof IconType
    }

    const other_items: MenuItem[] = [
        {
            name: "Dashboard",
            href: "./",
            icon: LayoutDashboard
        },
        {
            name: "Settings",
            href: "./settings",
            icon: Cog
        }
    ]

    const core_items: MenuItem[] = [
        {
            name: "Watch & Monitor",
            href: "./core",
            icon: Activity
        },
        {
            name: "Watched Threads",
            href: "./threads",
            icon: Spool
        },
        {
            name: "Channel Monitors",
            href: "./monitors",
            icon: Eye
        }
    ]

    const ticket_items: MenuItem[] = [
        {
            name: "Panels",
            href: "./ticket-panels",
            icon: PanelBottom
        },
        {
            name: "Open Tickets",
            href: "./open-tickets",
            icon: TicketCheck
        },
        {
            name: "Closed Tickets",
            href: "./closed-tickets",
            icon: TicketMinus
        },
    ]

    function is_active(item: MenuItem): boolean {
        const current_path = "." + /\/dashboard\/\d*(\/(.*)|$)/gm.exec($page.url.pathname)?.[1]
        return current_path === item.href
    }
</script>

<div class="container">
    <nav class="sidebar">
        {#each other_items as item}
            { @const Icon = item.icon }
            <a class="module {is_active(item) ? "active" : ""}" href={item.href}>
                <Icon />
                <span>{item.name}</span>
            </a>
        {/each}
        <h3 class="header">Core</h3>
        {#each core_items as item}
            { @const Icon = item.icon }
            <a class="module {is_active(item) ? "active" : ""}" href={item.href}>
                <Icon />
                <span>{item.name}</span>
            </a>
        {/each}

        <h3 class="header">Tickets</h3>
        {#each ticket_items as item}
            { @const Icon = item.icon }
            <a class="module {is_active(item) ? "active" : ""}" href={item.href}>
                <Icon />
                <span>{item.name}</span>
            </a>
        {/each}
    </nav>
    
    <main>
        <slot />
    </main>
</div>

<style lang="scss">
    @use 'sass:color';
    @use "../../../lib/style/colours.scss";

    .container {
        display: flex;
        gap: 1rem;
    }

    main {
        flex-grow: 1;
        padding: 1em;
    }

    .sidebar {
        @extend .bg-background-100;
        padding: 1em;
        height: 100vh;
        min-width: min(25%, 20em);

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
                @extend .bg-background-300;
                color: white;
                font-weight: bold;
            }
        }
    }

    .header {
        margin-bottom: .5rem;
        margin-top: 1rem;
        font-size: smaller;
    }
</style>