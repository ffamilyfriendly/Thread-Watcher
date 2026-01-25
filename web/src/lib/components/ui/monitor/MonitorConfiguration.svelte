<script lang="ts">
	import type { ChannelDataWithFilters } from '@watcher/shared';
	import RolePicker from '../settings/RolePicker.svelte';
	import { guild_state } from '$lib/stores/guild.svelte';
	import safe_regex from 'safe-regex';
	import { Result } from 'neverthrow';
	import { map_err } from '$lib/error_helper';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import StringPicker from '../settings/StringPicker.svelte';
	import type { DiscordTag } from '$lib/types/internal_api';
	import TagPicker from '../settings/TagPicker.svelte';

	interface Props {
		data: Omit<ChannelDataWithFilters, 'is_suspended'>;
	}

	let { data = $bindable() }: Props = $props();
	let regex_str = $state(data.regex?.source ?? '');

	const regex_is_safe = $derived(safe_regex(regex_str ?? ''));

	let entity_name = $state('thread');
	let avail_tags: DiscordTag[] = $state([]);

	$effect(() => {
		if (data.server === data.id) return;
		guild_state.get_channel(data.id).then((ch_res) => {
			if (ch_res.isErr()) {
				add_toast_from_error(ch_res.error);
				return;
			}
			const channel = ch_res.value;
			console.log('CHANNEK', channel);

			if (channel.availableTags) {
				avail_tags = channel.availableTags;
				entity_name = 'post';
			}
		});
	});

	$effect(() => {
		if (!regex_str) {
			data.regex = undefined;
		}

		if (regex_str && safe_regex(regex_str ?? '')) {
			const str_reg_as_regexp = Result.fromThrowable(() => new RegExp(regex_str ?? ''), map_err)();
			if (str_reg_as_regexp.isErr()) {
				add_toast_from_error(str_reg_as_regexp.error);
				return;
			}
			data.regex = str_reg_as_regexp.value;
		}
	});
</script>

<div class="thingie">
	<small>User needs any of these roles</small>
	<RolePicker multiple={true} bind:value={data.role_whitelist} roles={guild_state.roles} />
</div>

<div class="thingie">
	<small>{entity_name} name needs to match this regex</small>
	<input
		class={regex_is_safe ? 'safe' : 'unsafe'}
		placeholder="hi"
		type="text"
		bind:value={regex_str}
	/>
	{#if !regex_is_safe}
		<small class="unsafe_regex"
			>This regex is <a
				href="https://docs.threadwatcher.xyz/usage/advanced-filtering#rejected-regex">unsafe</a
			> and therefore not allowed</small
		>
	{/if}
</div>

{#if avail_tags.length != 0}
	<div class="thingie">
		<small>{entity_name} needs to have any of these tags</small>
		<TagPicker bind:value={data.tags} multiple={true} options={avail_tags} />
	</div>
{/if}

<style lang="scss">
	.thingie {
		input {
			width: 100%;
			color: inherit;
			padding: 0.1rem;
			margin: 0.5rem 0rem;
			background-color: transparent;
			border: none;
			border-radius: 0.5rem;
			font-size: 0.9rem;
			padding: 1rem;
			margin: 0.5rem 0rem;
			outline: 1px solid rgba(128, 128, 128, 0.33);

			&.unsafe {
				outline: 1px solid color-mix(in srgb, var(--error-500) 50%, transparent);
			}
		}
	}

	.unsafe_regex {
		color: var(--error-500);
	}
</style>
