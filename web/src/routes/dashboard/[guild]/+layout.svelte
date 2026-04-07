<script lang="ts">
	import NavSection from '$lib/components/ui/DashNav/NavSection.svelte';
	import { init_guild_state } from '$lib/stores/guild.svelte';
	import {
		ExternalLink,
		Eye,
		House,
		LayoutPanelLeft,
		Logs,
		Settings,
		Spool,
		Ticket
	} from '@lucide/svelte';

	let { children, data } = $props();

	// svelte-ignore state_referenced_locally
	const gs = init_guild_state(data.guild_id);

	$effect(() => {
		gs.init(data.roles, data.channels, data.guild);
	});
</script>

<NavSection
	id="HOME"
	section={{
		name: 'Home',
		base: `/dashboard/${data.guild_id}`,
		items: [
			{ name: 'Home', href: ``, icon: House },
			{ name: 'Settings', href: `/settings`, icon: Settings },
			{ name: 'Logs', href: `/logs`, icon: Logs },
			{ name: 'Docs', href: 'https://docs.threadwatcher.xyz', icon: ExternalLink }
		]
	}}
/>

<NavSection
	id="CORE"
	section={{
		name: 'Core',
		base: `/dashboard/${data.guild_id}`,
		items: [
			{ name: 'Watched Threads', href: `/threads`, icon: Spool },
			{ name: 'Channel Monitors', href: `/monitors`, icon: Eye }
		]
	}}
/>

<NavSection
	id="TICKETS"
	section={{
		name: 'Tickets',
		base: `/dashboard/${data.guild_id}`,
		items: [
			{ name: 'Panels', href: `/ticket-panels`, icon: LayoutPanelLeft },
			{ name: 'Tickets', href: `/tickets`, icon: Ticket }
		]
	}}
/>

{@render children()}
