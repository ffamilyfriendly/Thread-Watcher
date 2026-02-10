<script lang="ts" generics="T extends {  id: string, name?: string|null}">
	import btn_style from '$lib/style/button.module.scss';
	import { fly } from 'svelte/transition';
	import type { Snippet } from 'svelte';
	import type { Result } from 'neverthrow';
	import { ChevronDown, ChevronUp, Delete } from '@lucide/svelte';

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

	const local_selected_items = $derived(items.filter((i) => selected_ids.includes(i.id)));

	let fetched_items = $state<T[]>([]);

	const active_items_data = $derived(
		[...local_selected_items, ...fetched_items].filter((i) => selected_ids.includes(i.id))
	);

	let show_item_picker = $state(false);

	function toggle_item(id: string) {
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

	function handle_custom_submit(e: SubmitEvent) {
		e.preventDefault();
		if (!(e.target instanceof HTMLFormElement)) return;
		const form_data = new FormData(e.target);
		const item_id = form_data.get('custom_item_id') as string;

		if (item_id && /^\d{17,21}$/.test(item_id)) {
			toggle_item(item_id);
			(e.target as HTMLFormElement).reset();
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
		if (!window || !show_item_picker) return;

		function handle_click(ev: PointerEvent) {
			if (!ev.target || !(ev.target instanceof HTMLElement)) return;

			const target_is_child = container?.contains(ev.target);
			if (!target_is_child) {
				show_item_picker = false;
			}
		}
		window.addEventListener('click', handle_click);

		return () => {
			window.removeEventListener('click', handle_click);
		};
	});

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
			<button class={[btn_style.button]} onclick={() => (show_item_picker = !show_item_picker)}>
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
				<form onsubmit={handle_custom_submit} class="custom_id">
					<input pattern={'\\d{17,21}'} placeholder="ID (Snowflake)" name="custom_item_id" />
					<input value="Add" type="submit" />
				</form>
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
		justify-content: space-between;
		align-items: center;
		padding: 0.1rem;
		margin: 0.5rem 0rem;
		outline: 1px solid rgba(128, 128, 128, 0.33);
		border-radius: 0.5rem;
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
		input {
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
