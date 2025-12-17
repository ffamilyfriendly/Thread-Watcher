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
        {@const icon = guild.icon && `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
            <div class="guild">
                <div class="hero">
                    <div style="--icon_link: url({icon})"></div>
                    {#if icon}
                        <img src="{icon}" class="icon" alt="guild icon" />
                    {:else}
                        <p class="icon">a</p>
                    {/if}
                </div>

                <div class="meta">
                    <div>
                        <p>{guild.name}</p>
                    </div>
                    {#if guild.guild_has_bot}
                        <a class={[bstyle.button, "bg-primary-700", "cta_button"]} href={guild.action_link}> Go </a>
                    {:else}
                        <a class={[bstyle.button, bstyle.tetriary, "cta_button"]} href={guild.action_link}> Invite </a>
                    {/if}
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
        .hero {
            position: relative;
            width: 100%;
            height: 130px;
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
                background-color: var(--secondary-700);
                transform: scale(1.5);
                filter: blur(10px);
                opacity: 0.33;
            }

            $size: 80px;

            .icon {
                width: $size;
                height: auto;
                border-radius: 50%;
                outline: 2px solid rgba(128, 128, 128, 0.2);
                aspect-ratio: 1/1;
            }

            p.icon {
                background-color: var(--secondary-700);
                text-align: center;
                line-height: $size;
            }
        }

        .meta {
            padding-top: .75rem;
            gap: .5rem;
            display: flex;
            justify-content: space-between;
        }
    }

    .guild_list {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
        gap: 2rem;
    }
</style>