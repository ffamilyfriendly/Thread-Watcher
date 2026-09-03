<script lang="ts">
	/*
    
    (alias) type NativeDiscordEmbed = {
 fields: {
 name: string;
 value: string;
 inline?: boolean | undefined;
 }[];
 title?: string | null | undefined;
 description?: string | null | undefined;
 hexColor?: string | null | undefined;
 footer?: {
 text: string;
 iconURL?: string | undefined;
 proxyIconURL?: string | undefined;
 } | null | undefined;
 author?: {
 name: string;
 iconURL?: string | undefined;
 proxyIconURL?: string | undefined;
 url?: string | undefined;
 } | null | undefined;
 thumbnail?: {
 height?: number | undefined;
 proxyURL?: string | undefined;
 url?: string | undefined;
 width?: number | undefined;
 } | null | undefined;
 timestamp?: string | ... 1 more ... | undefined;
 url?: string | ... 1 more ... | undefined;
 video?: {
 height?: number | undefined;
 proxyURL?: string | undefined;
 url?: string | undefined;
 width?: number | undefined;
 } | ... 1 more ... | undefined;
}
import NativeDiscordEmbed
    
    */

	import Embed from '$lib/components/transcript/chat/Embed.svelte';
	import type { NativeDiscordEmbed } from '@watcher/shared';
	import Modal from '../Modal.svelte';
	import Button from '../Button.svelte';

	let is_editing = $state(true);

	let title = $state('test');
	let description = $state('desc');
	let colour = $state<string>();

	const native_embed = $derived.by<NativeDiscordEmbed>(() => {
		return {
			title: title,
			hexColor: colour,
			description: description,
			fields: []
		};
	});
</script>

<Embed embed={native_embed} />
<Button on_click={() => (is_editing = true)}>Edit</Button>

{#if is_editing}
	<Modal bind:set_open={is_editing} title="">
		<div class="container">
			<div class="configure">
				<h3>TITLE</h3>
				<input bind:value={title} placeholder="Embed Title" />

				<h3>DESCRIPTION</h3>
				<textarea bind:value={description}></textarea>
			</div>
			<div>
				<Embed embed={native_embed} />
			</div>
		</div>
	</Modal>
{/if}

<style lang="scss">
	.container {
		gap: 1rem;
		display: flex;
		justify-content: space-between;
	}
</style>
