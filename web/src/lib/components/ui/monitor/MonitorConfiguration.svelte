<script lang="ts">
	import { ZAiRegexResponse, type Monitor } from '@watcher/shared';
	import RolePicker from '../settings/RolePicker.svelte';;
	import safe_regex from 'safe-regex';
	import { Result } from 'neverthrow';
	import { map_err } from '$lib/error_helper';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';
	import type { DiscordTag } from '$lib/types/internal_api';
	import TagPicker from '../settings/TagPicker.svelte';
	import PremiumButton from '../premium/PremiumButton.svelte';
	import { Sparkles } from '@lucide/svelte';
	import style from './monitorconfig.module.scss';
	import { fetch_as_json, safe_fetch } from '$lib/client/fetch';
	import { use_guild_state } from '$lib/stores/guild.svelte';

	const guild_state = use_guild_state()

	interface Props {
		data: Omit<Monitor, 'is_suspended'|"manages_threads_count">;
	}

	let { data = $bindable() }: Props = $props();
	let regex_str = $state(data.regex?.source ?? '');

	const regex_is_safe = $derived(safe_regex(regex_str ?? ''));

	let entity_name = $state('thread');
	let avail_tags: DiscordTag[] = $state([]);

	$effect(() => {
		if (data.guild_id === data.target_id) return;
		guild_state.get_channel(data.target_id).then((ch_res) => {
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

	async function try_generate_regex_from_prompt() {
		const regex_response = await fetch_as_json(
			`/api/regex`,
			{
				body: JSON.stringify({
					guild_id: guild_state.guild_id,
					prompt: regex_str
				}),
				method: 'POST'
			},
			ZAiRegexResponse
		);

		if (regex_response.isErr()) {
			return add_toast_from_error(regex_response.error);
		}

		regex_str = regex_response.value.prompt;
	}
</script>

<div class="thingie">
	<h4>Role Whitelist</h4>
	<p class="info">
		The creator of the {entity_name} needs to have one or more of these roles for the {entity_name} to
		be watched.
	</p>
	<RolePicker multiple={true} bind:value={data.role_whitelist} roles={guild_state.roles} />
</div>

<div class="thingie">
	<h4>Regex</h4>
	<p class="info">
		The name of this {entity_name} needs to match this <i>regex</i> to be watched. If you're unsure
		what you should put here, please read
		<a href="https://docs.threadwatcher.xyz/usage/advanced-filtering#regex">the docs</a>
	</p>
	<div class="regex_input">
		<input
			maxlength="100"
			class={regex_is_safe ? 'safe' : 'unsafe'}
			placeholder="Regex or prompt"
			type="text"
			bind:value={regex_str}
		/>
		<PremiumButton
			class_name={style.ai_button}
			require_level="BASIC"
			on_click={try_generate_regex_from_prompt}
		>
			{#snippet icon()}
				<Sparkles size={16} />
			{/snippet}
		</PremiumButton>
	</div>
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
		<h4>Tags</h4>
		<p class="info">
			The {entity_name} needs to have one or more of these tags to be watched.
		</p>
		<TagPicker bind:value={data.tags} multiple={true} options={avail_tags} />
	</div>
{/if}

<style lang="scss">
	.thingie {
		.info {
			max-width: 60ch;
		}

		.regex_input {
			position: relative;
			display: flex;
			align-items: center;
			outline: 1px solid rgba(128, 128, 128, 0.33);
			border-radius: 0.5rem;
			width: 100%;
			padding: 0.5rem;

			input {
				width: 100%;
				color: inherit;
				padding: 0.1rem;
				margin: 0.5rem 0rem;
				background-color: transparent;
				border: none;
				font-size: 0.9rem;
				margin: 0.5rem 0rem;

				&:focus {
					outline: 0;
				}

				&.unsafe {
					outline: 1px solid color-mix(in srgb, var(--error-500) 50%, transparent);
				}
			}
		}
	}

	.unsafe_regex {
		color: var(--error-500);
	}
</style>
