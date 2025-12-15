<script>
	import { signIn, signOut } from "@auth/sveltekit/client";
	import { page } from "$app/stores"
</script>

<div id="cum">
	<div>
		<h1>Sign in cuh</h1>
		<button on:click={() => signIn("discord")}>Sign In with Discord</button>
	</div>
</div>

<style lang="scss">

#cum {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100vh;

	background-image: url(https://media.discordapp.net/attachments/1411007366584860834/1438529114964234461/affinity_img_1.png?ex=694014a3&is=693ec323&hm=81e401bd827ba5ae58cb8557c8dd5ae932bbbccfc7e48c104971acdc6b9333c8&=&format=webp&quality=lossless&width=743&height=525);
	background-position: center;
	background-size: cover;

	div {
		padding: 2em;
		border-radius: .2em;
		background: #2A7B9B;
		background: radial-gradient(circle, rgba(42, 123, 155, 1) 0%, rgba(87, 199, 133, 1) 50%, rgba(237, 221, 83, 1) 100%);
	}
}

</style>