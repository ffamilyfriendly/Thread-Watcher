<script lang="ts" generics="T extends {  id: string, name?: string|null}">
	import btn_style from '$lib/style/button.module.scss';
	import { fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import type { Result } from 'neverthrow';
	import { ChevronDown, ChevronUp, Delete } from '@lucide/svelte';
	import { portal } from '$lib/client/attachments/portal';
	import { click_outside } from '$lib/client/attachments/click_outside';
	import Button from '../Button.svelte';
	import { add_toast_from_error } from '$lib/state/toasts.svelte';

	interface Props {
		items: T[];
		value?: string | string[] | null;
		multiple?: boolean;
		placeholder: string;
		fetcher?: (id: string) => Promise<Result<T, Error>> | Result<never, Error>;
		render_item: Snippet<[T]>;
		disabled?: boolean;
	}

	let {
		items,
		value = $bindable(),
		multiple = false,
		fetcher,
		render_item,
		placeholder,
		disabled = false
	}: Props = $props();

	const selected_ids = $derived(Array.isArray(value) ? value : value ? [value] : []);

	let fetched_items = $state<T[]>([]);

	const item_lookup = $derived(new Map([...items, ...fetched_items].map(i => [i.id, i])))

	const active_items_data = $derived(
		selected_ids.map(id => item_lookup.get(id)).filter((i): i is T => !!i)
	);

	let show_item_picker = $state(false);

	function toggle_item(id: string) {
		custom_item_id = ""
		if (multiple) {
			const current = Array.isArray(value) ? [...value] : value ? [value] : [];
			if (current.includes(id)) {
				value = current.filter((i) => i !== id);
			} else {
				value = [...current, id];
			}
		} else {
			value = id;
			show_item_picker = false;
		}
	}

	let custom_item_id = $state<string>()

	async function handle_custom_submit() {
		if(!custom_item_id || !fetcher) return
		if (!/^\d{17,21}$/.test(custom_item_id)) return console.error(`'custom_item_id' is not a valid snowflake.`, { got: custom_item_id })

		// If we've already got the item there's no need to fetch it again, just cuz the user asked nicely.
		// just toggle the item in that case.
		if([...fetched_items, ...items].map(i => i.id).includes(custom_item_id)) {
			return toggle_item(custom_item_id)
		}

		const item_res = await fetcher(custom_item_id)
		if(item_res.isErr()) return add_toast_from_error(item_res.error)

		fetched_items = [...fetched_items, item_res.value]

		if (/^\d{17,21}$/.test(custom_item_id)) {
			toggle_item(custom_item_id);
		}
	}

	let item_search_query = $state<string>('');
	const searched_items = $derived(
		item_search_query.trim() === ''
			? items
			: items.filter(
					(i) =>
						i.name?.toLowerCase().includes(item_search_query.toLowerCase()) ||
						i.id === item_search_query
				)
	);

	let container: HTMLDivElement | undefined = $state();

	$effect(() => {
		const current_ids = (Array.isArray(value) ? value : value ? [value] : []).filter(
			(str) => str.trim().length != 0
		);

		const missing = current_ids.filter(
			(id) => !items.some((i) => i.id === id) && !fetched_items.some((i) => i.id === id)
		);

		if (missing.length > 0 && fetcher) {
			missing.forEach(async (id) => {
				const res = await fetcher(id);
				if (res.isOk()) {
					fetched_items = [...fetched_items, res.value];
				}
			});
		}
	});
</script>

<div bind:this={container} class="picker">
	<div class="current_selection">
		<div class="selected_list">
			{#each active_items_data as item}
				<div class="item_chip">
					{@render render_item(item)}
					{#if multiple}
						<button class="remove_btn" onclick={() => toggle_item(item.id)}>×</button>
					{/if}
				</div>
			{:else}
				<p class="none">None selected</p>
			{/each}
		</div>

		{#if value}
			<button onclick={() => (value = '')} class="remove_button">
				<Delete />
			</button>
		{/if}

		{#if !disabled}
			<button
				class={[btn_style.button, 'chevron_btn']}
				onclick={() => (show_item_picker = !show_item_picker)}
			>
				{#if show_item_picker}
					<ChevronUp />
				{:else}
					<ChevronDown />
				{/if}
			</button>
		{/if}
	</div>

	{#if show_item_picker}
		<div
			{@attach portal(container, { force_anchor_width: true })}
			{@attach click_outside(() => show_item_picker = false)}
			class="options"
			in:fly={{ duration: 200, opacity: 0, y: -8 }}
			out:fly={{ duration: 200, opacity: 0, y: -8 }}
		>
			<input bind:value={item_search_query} class="search_roles" {placeholder} type="search" />
			<div class="roles_list">
				{#each searched_items as item}
					<button
						onclick={() => toggle_item(item.id)}
						class="btn_select_role"
						class:active={selected_ids.includes(item.id)}
					>
						{#if multiple}
							<div class="checkbox">
								{selected_ids.includes(item.id) ? '✓' : ''}
							</div>
						{/if}
						{@render render_item(item)}
					</button>
				{/each}
			</div>

			{#if fetcher}
				<hr />
				<div class="custom_id">
					<input bind:value={custom_item_id} pattern={'\\d{17,21}'} placeholder="ID (Snowflake)" name="custom_item_id" />
					<Button load_with={handle_custom_submit}>Add</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style lang="scss">
	.picker {
		position: relative;
		width: 100%;
	}

	.remove_button {
		background-color: transparent;
		border: none;
		color: white;
		cursor: pointer;
	}

	.current_selection {
		display: flex;
		align-items: center;
		padding: 0.1rem;
		margin: 0.5rem 0rem;
		outline: 1px solid rgba(128, 128, 128, 0.33);
		border-radius: 0.5rem;

		.chevron_btn {
			margin-left: auto;
		}
	}

	.selected_list {
		display: flex;
		max-width: 90%;
		flex-wrap: wrap;
		padding-left: 0.5rem;
		gap: 0.4rem;

		.none {
			opacity: 0.5;
			font-size: 0.9rem;
			margin: 0;
		}
	}

	.item_chip {
		display: flex;
		align-items: center;
		gap: 0.1rem;
		padding: 0.2rem 0.5rem;
		border-radius: 4px;

		.remove_btn {
			background: none;
			border: none;
			color: var(--error-400);
			cursor: pointer;
			font-weight: bold;
			padding: 0 0.2rem;
		}
	}

	.roles_list {
		gap: 0.2rem;
		max-height: 300px;
		overflow-y: auto;
		margin-top: 0.5rem;
	}

	.btn_select_role {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.4rem;
		border-radius: 4px;
		background: transparent;
		border: none;
		color: white;
		cursor: pointer;
		text-align: left;

		&:hover {
			background: rgba(255, 255, 255, 0.05);
		}
		&.active {
			background: rgba(var(--primary-rgb), 0.2);
		}
	}

	.checkbox {
		width: 1.2rem;
		height: 1.2rem;
		border: 1px solid rgba(255, 255, 255, 0.3);
		border-radius: 3px;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.8rem;
	}

	.options {
		z-index: 100;
		width: 100%;
		min-width: 280px;
		border-radius: 0.5rem;
		background-color: var(--background-600);
		padding: 0.75rem;
		position: absolute;
		top: 100%;
		margin-top: 0.5rem;
		box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
		outline: 1px solid rgba(255, 255, 255, 0.1);
	}

	.search_roles {
		width: 100%;
		margin-bottom: 0.5rem;
	}

	.custom_id {
		width: 100%;
		display: flex;
		input {
			flex-grow: 1;
			background-color: var(--background-700);

			border: none;

			color: white;

			padding: 0.5rem;

			border-radius: 0.5rem;

			outline: 1px solid rgba(128, 128, 128, 0.2);
		}
	}

	hr {
		margin-top: 0.5rem;

		margin-bottom: 0.5rem;

		opacity: 0.33;
	}

	input {
		background-color: var(--background-700);

		border: none;

		color: white;

		padding: 0.5rem;

		border-radius: 0.5rem;

		outline: 1px solid rgba(128, 128, 128, 0.2);
	}
</style>
