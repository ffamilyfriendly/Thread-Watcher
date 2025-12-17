<script lang="ts"> 
    import bstyle from "$lib/style/button.module.scss";

    function sort_by_boolean_prop(g1: DiscordGuildExpanded, g2: DiscordGuildExpanded) {
        return (g1.guild_has_bot === g2.guild_has_bot)? 0 : g1.guild_has_bot ? -1 : 1
    }

    interface Props {
        data: {
            guilds: DiscordGuildExpanded[]
        }
    }

    let { data }: Props = $props()

    function handle_click(link: string, guild_id: string) {
        if(link.startsWith("/")) window.location.href = link

        const popup = window.open(link, "_blank", "width=500, height=800")
        
        const chk_close_int = setInterval(() => {
            if(popup?.closed) {
                clearInterval(chk_close_int)

                window.location.href = `/dashboard/${guild_id}`
            }
        }, 500)
    }
</script>

<main>
    <h1>Select a server</h1>
    <div class="guild_list">
        {#each data.guilds.sort(sort_by_boolean_prop) as guild}
        {@const icon = `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
            <div class="guild">
                <div class="hero">
                    <div style="--icon_link: url({icon})"></div>
                    <img src="{icon}" alt="guild icon" />
                </div>

                <div class="meta">
                    {guild.name}
                    <a class={bstyle.button} href={guild.action_link}> { guild.guild_has_bot ? "Go" : "Setup" } </a>
                </div>
            </div>
        {/each}
    </div>
</main>

<style lang="scss">
    @use 'sass:color';
    @use "../../lib/style/colours.scss";

    main {
        max-width: clamp(2%, 1000px, 60%);
        margin-inline: auto;
    }

    .guild {
        width: 20rem;
        .hero {
            position: relative;
            width: 100%;
            height: 152px;
            display: flex;
            justify-content: center;
            align-items: center;
            overflow: hidden;
            border-radius: .5rem;
            
            div {
                position: absolute;
                inset: 0px;
                z-index: -1;
                background: var(--icon_link) center center / cover no-repeat;
                transform: scale(1.4);
                filter: blur(10px);
                opacity: 0.3;
            }

            img {
                width: 80px;
                height: auto;
                border-radius: 50%;
                outline: 2px solid rgba(128, 128, 128, 0.2);
                aspect-ratio: 1/1;
            }
        }

        .meta {
            display: flex;
            justify-content: space-between;
        }
    }

    .guild_list {
        display: grid;
        gap: 1rem;
        grid-template-columns: 1fr 1fr 1fr;
    }
</style>