<script lang="ts">
    import logo from "$lib/assets/thread_watcher_icon.png"
    import { page } from "$app/stores"
</script>

<nav class="top_nav">
    <div class="branding">
        <img alt="Logo" src={logo} />
        <span>Thread-Watcher</span>
    </div>

    <div class="account">
        <img src={$page.data.session?.user?.image} alt="profile pic" />
        <span>{$page.data.session?.user?.name}</span>
    </div>
</nav>

<slot />

<style lang="scss">
    @import "../../lib/style/colours.scss";

    .top_nav {
        @extend .bg-background-100;
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