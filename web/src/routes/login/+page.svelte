<script>
	import { signIn, signOut } from "@auth/sveltekit/client";
	import { page } from "$app/stores"
</script>

<h1>Sign in cuh</h1>

<button on:click={() => signIn("discord")}>Sign In with Discord</button>
