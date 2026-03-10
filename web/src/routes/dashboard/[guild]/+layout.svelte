<script>
	import { init_guild_state } from '$lib/stores/guild.svelte';

	let { children, data } = $props();

	// svelte-ignore state_referenced_locally
	const gs = init_guild_state(data.guild_id);

	$effect(() => {
		gs.init(data.roles, data.channels, data.guild);
	});
</script>

{@render children()}
