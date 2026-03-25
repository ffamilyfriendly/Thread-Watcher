<script lang="ts">
	import TWMarkdown from '$lib/components/ui/Markdown/TWMarkdown.svelte';
	import type { NativeDiscordEmbed } from '@watcher/shared';

	interface Props {
		embed: NativeDiscordEmbed;
	}

	const { embed }: Props = $props();
</script>

<div style="--embed_clr: {embed.hexColor}" class="embed">
	<b class="embed_title"><TWMarkdown md={embed.title ?? ''} /></b>

	{#if embed.description}
		<TWMarkdown md={embed.description} />
	{/if}

	{#if embed.fields.length > 0}
		<div class="fields">
			{#each embed.fields as field}
				<div class="field">
					<b class="title">{field.name}</b>
					<div class="field_value_markdown">
						<TWMarkdown md={field.value ?? ''} />
					</div>
				</div>
			{/each}
		</div>
	{/if}

	{#if embed.thumbnail}
		<img src={embed.thumbnail.proxyURL ?? embed.thumbnail.url} alt="thumbnail" />
	{/if}
</div>

<style lang="scss">
	.add_field {
		background-color: transparent;
		border: none;
		color: color-mix(in srgb, var(--embed_clr) 40%, white);
		cursor: pointer;
		width: fit-content;
	}

	.footer {
		opacity: 0.5;
		align-items: center;
		display: flex;
		grid-column: 1 / 1;
		grid-row: auto / auto;
	}

	.clr_picker {
		cursor: pointer;
		width: 1rem;
		height: 1rem;
		border: none;
		outline: none;
		border-radius: 50%;
		background-color: var(--embed_clr);
		outline: 1px solid color-mix(in srgb, var(--embed_clr) 30%, transparent);
	}

	.description {
		white-space: pre-line;
		max-width: 65ch;

		&.placeholder {
			opacity: 0.5;
			text-decoration: dashed underline;
		}
	}

	.label {
		opacity: 0.5;
	}

	.fields {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 8px;
		margin-top: 8px;

		.field {
			position: relative;
			grid-column: span 3;

			&.inline {
				grid-column: span 1;
			}

			.remove_btn {
				background-color: transparent;
				border: none;
				color: var(--error-500);
				cursor: pointer;

				&:hover {
					color: var(--error-700);
				}
			}

			&:hover {
				.inline_sel {
					opacity: 0.8;
				}
			}
		}
	}

	.field_value_markdown {
		opacity: 0.75;
	}

	.embed {
		font-size: 14px;
		gap: 0.5rem;
		min-height: 100px;
		background-color: #131416;

		border: 1px solid #2d2e32;
		border-inline-start: 4px solid var(--embed_clr);

		border-radius: 0.25rem;

		/* straight up stole this from discord lol. Sorry John Discord */
		max-width: max-content;
		word-wrap: break-word;
		display: grid;
		grid-template-columns: auto;
		grid-template-rows: auto;
		padding-block: 0.5rem 1rem;
		padding-inline: 0.75rem 1rem;
		padding-top: 0.125rem;

		.embed_title {
			font-size: 16px;
		}
	}

	.inline_sel {
		opacity: 0.2;
		transition: 0.2s ease-in;
	}

	.row {
		gap: 0.5rem;
		display: flex;
		align-items: center;
	}
</style>
