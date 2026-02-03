<script lang="ts">
    import bstyle from '$lib/style/button.module.scss';
    import img1 from "$lib/assets/secret_page_thing_dont_open_please_it_would_ruin_the_surprise/easter_egg.png"
    import img2 from "$lib/assets/secret_page_thing_dont_open_please_it_would_ruin_the_surprise/bomboclaaat_edited.jpg"
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

    const username = $derived(data.session?.user.name)
    const entitlement = $derived(data.guild.entitlements)
    let clicked = $state(0)

    function handle_ended() {
        ref?.remove()
        clicked = -1337
    }

    function handle_click() {
        clicked = clicked + 1

        if(clicked == 200 && ref) {
            ref.play()
            ref.style.opacity = "1"

            ref.addEventListener("ended", handle_ended)
        }
    }

    let ref = $state<HTMLVideoElement>()
</script>

<main>

    <!-- svelte-ignore a11y_media_has_caption -->
    <video class="idk_lol" bind:this={ref} src="https://images.threadwatcher.xyz/SECRETSHITFORREAL/gnomed.mp4">

    </video>

    <div class="section">
        <div>
            <h1>Easter Egg</h1>
            Heya there, <span class="user"><b>{username}</b></span>! Fancy seeing you here...
            <p class="text">
                This page was <i>originally</i> created so you can watch threads and stuff in your server thru the dashboard. 
                However, I decided against that (at least for now) to keep a V3 launch as soon as possible. 
                This page <b>might</b> return as a place to watch threads from the web similar to <code>/watch</code> or <code>/batch</code>. We'll see
            </p>
            <small>
                In the meantime, enjoy whatever this is?
            </small>
        </div>

        <img alt="really nicely drawn img of an easter egg" src={img1} />
    </div>

    <div class="section">
        <img alt="cant even describe this one. Sorry friend" src={img2} />
        <div>
            <h1>I'm surprised</h1>
            <p class="text">
                I created this bot as a snarky little prototype when discord launched threads. 
                You see, {username}, way back then in the olden times of 2021, you had to boost the server to keep threads from getting archived after more than one day.
                I figured <i>"hey I could probably keep 'em open forever with the API"</i>. I could and apperently others wanted that too. So here we are :D
            </p>
        </div>
    </div>

    <div class="section">
        <div>
            <h1>Anyways...</h1>
            <p class="text">
                Was great having you here, {username}! I should probably return to making features for the bot so I can launch <b>version 3</b>.
                If you see this, I've likely already launched it! In that case, I solemnly hope you're happy with it. 
                In that case you're not, please holler at me in <a href="https://botsuite.co/join">the support server</a>.
            </p>

            {#if entitlement !== "NONE" || true}
            <p class="text">
                Also wanted to give you a heartfelt thanks for supporting the bot!
                It means a lot to me that you felt this silly project was worth your hard earned money. 
                I will do my best to make sure it's worth it! 
            </p>
            {/if}

            <p class="text">
                I figured this would be a pretty useless easter egg page without something for you to do. 
                I've taken the liberty to add a little button to the right. Feel free to click it
            </p>
        </div>

        <div class="easter_egg_div">
            <b>Click It</b>
            <button onclick={handle_click} class={[bstyle.button, bstyle.primary]}>{ clicked === 0 ? "Click Me" : `Clicked ${clicked}x` }</button>

            {#if clicked > 10}
                <p>Not like it will do much...</p>
            {/if}
            {#if clicked > 50}
                <p>I hope you're having fun</p>
            {/if}
            {#if clicked == 67}
                <p>haha so funny</p>
            {/if}
            {#if clicked > 100}
                <p>100 times! Nicely done :D</p>
            {/if}
            {#if clicked > 150}
                <p>I'm just going to put a rick roll at 200 I think</p>
            {/if}
            {#if clicked > 175}
                <p>Dont say I did not warn you</p>
            {/if}
            {#if clicked > 190}
                <p>WARNING!! Rick roll in <b>{200 - clicked}</b> clicks!</p>
            {/if}
        </div>
    </div>
</main>


<style lang="scss">

    .idk_lol {
        pointer-events: none;
        opacity: 0;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        z-index: 420420;
        height: 100vh;
        transition: 1s;
    }

    main {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2rem;
    }

    .user {
        color: var(--error-900);
    }

    .section {
        max-width: 90ch;
        margin-bottom: 2rem;
        width: 100%;
        display: flex;
        justify-content: space-between;
        align-items: center;

        img {
            height: 200px;
        }
    }

    .text {
        max-width: 60ch;
        margin-bottom: .5rem;
    }

    .easter_egg_div {
        --clr1: color-mix(in srgb, var(--primary-500) 60%, transparent);
        --clr2: color-mix(in srgb, var(--primary-500) 40%, transparent);
        
        background: radial-gradient(circle, var(--clr1) 0%, var(--clr2) 60%);
        padding: 1rem;
        border-radius: .5rem;
        outline: 1px solid var(--clr1);
    }
</style>