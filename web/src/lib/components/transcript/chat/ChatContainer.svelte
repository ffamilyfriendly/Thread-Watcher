<script lang="ts">
	import Message from './Message.svelte';
	import { use_ticket_state } from '$lib/stores/ticket.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	const ts = use_ticket_state();
	let scroll_container = $state<HTMLDivElement>();

	let is_loading = $state(false);
	let have_reached_top = $state(false);

	$effect(() => {
		if (!scroll_container) return;
		scroll_container.scrollTop = scroll_container.scrollHeight;
	});

	async function load_more_messages() {
		if (is_loading) {
			console.warn("Tried loading more messages when 'is_loading' is set");
			return;
		}

		is_loading = true;
		const earliest_message = ts.messages.at(0);
		if (!earliest_message) return;
		const messages = await ts.get_messages({
			before_id: earliest_message?.message_id,
			limit: 50
		});
		is_loading = false;
		if (messages.isErr()) return add_toast_from_error(messages.error);

		if (messages.value.length === 0) have_reached_top = true;

		const last_message = messages.value.at(-1);
		if (last_message) {
			const last_message_elem = document.getElementById(last_message.message_id);
			last_message_elem?.scrollIntoView();
		}
	}

	let button_ref = $state<HTMLButtonElement>();

	$effect(() => {
		if (!button_ref) return;

		const observer = new IntersectionObserver((entries) => {
			if (entries[0].isIntersecting) {
				console.log('trying to get messages...');
				load_more_messages();
			}
		});
		observer.observe(button_ref);

		return () => {
			observer.disconnect();
		};
	});
</script>

<div bind:this={scroll_container} class="container">
	{#if !have_reached_top}
		<button disabled={is_loading} bind:this={button_ref} onclick={load_more_messages}
			>load more messages.</button
		>
	{/if}

	{#each ts.messages as message (message.message_id)}
		<Message {message} />
	{/each}
</div>

<style lang="scss">
	.container {
		min-width: 50%;
		padding: 1rem;
		background-color: #121212;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		overflow-y: scroll;
		height: 100vh;
		min-height: 0;
	}
</style>
