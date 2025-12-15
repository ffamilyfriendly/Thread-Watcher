<script lang="ts">
    import logo from "$lib/assets/thread_watcher_icon.png"
    import { page } from "$app/stores"
    import DropDown from "$lib/components/ui/DropDown.svelte";
    import { signIn, signOut } from "@auth/sveltekit/client";
    import list_style from "$lib/style/list.module.scss"
</script>
<nav class="top_nav">
    <div class="branding">
        <img alt="Logo" src={logo} />
        <span>Thread-Watcher</span>
    </div>

    <DropDown>
        {#snippet parent_item()}
            <div class="account">
                <img src={$page.data.session?.user?.image} alt="profile pic" />
                <span>{$page.data.session?.user?.name}</span>
            </div>
        {/snippet}

        {#snippet child_item()}
            <div class={list_style.list}>
                <h3 class={list_style.heading}>Account</h3>
                <a href="/dashboard">My Servers</a>
                <button onclick={() => signOut()}>Log Out</button>

                <h3 class={list_style.heading}>Links</h3>
                <a href="https://botsuite.co/join">Support Server</a>
                <a href="https://botsuite.co/privacy-policy">Privacy Policy</a>
                <a href="https://botsuite.co/terms-of-service">Terms of Service</a>
            </div>
        {/snippet}
    </DropDown>
</nav>

<slot />


<style lang="scss">
    @use "../../lib/style/colours.scss";



    .top_nav {
        @extend .bg-background-600;
        display: flex;
        width: 100%;
        padding: 1em;
        justify-content: space-between;
    }

    @mixin font {
        font-family: 'Changa One', sans-serif;
        font-weight: 400;
        font-style: normal;
        font-size: large;
    }

    .account {
        display: flex;
        align-items: center;
        gap: .5rem;

        img {
            height: 30px;
            border-radius: 50%;
        }
    }

    .branding {
        display: flex;
        align-items: center;
        gap: .5rem;

        img {
            height: 30px;
            width: 30px;
        }

        span {
            @include font;
            font-size: large;
        }
    }
</style>