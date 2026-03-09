<script lang="ts">
	import { type TypedComponent } from '@watcher/shared';
	import SelectWrapper from './SelectWrapper.svelte';
	import EditableAttribute from '../../../EditableAttribute.svelte';
	import { AtSign, Flag, User } from '@lucide/svelte';
	import { s_tooltip } from '$lib/client/attachments/tooltip';

	interface Props {
		data: TypedComponent<'USER_SELECT' | 'ROLE_SELECT' | 'MENTIONABLE_SELECT'>;
		this_uid: string;
	}

	let { data = $bindable() }: Props = $props();

	const meta = {
		USER_SELECT: {
			tooltip_text: 'User Select',
			icon: User
		},
		ROLE_SELECT: {
			tooltip_text: 'Role Select',
			icon: Flag
		},
		MENTIONABLE_SELECT: {
			tooltip_text: 'Mentionable Select',
			icon: AtSign
		}
	};

	const d = $derived(meta[data.type]);
	const Icon = $derived(d.icon);
</script>

<SelectWrapper bind:data>
	<div class="container">
		<div class="select">
			<Icon {@attach s_tooltip(d.tooltip_text)} />
			<EditableAttribute max={150} bind:value={data.placeholder}>
				{#snippet display(v)}
					<p class="placeholder">{v}</p>
				{/snippet}
			</EditableAttribute>
		</div>
	</div>
</SelectWrapper>

<style lang="scss">
	.container {
		display: flex;
		flex-direction: column;
		width: 400px;
		gap: 1rem;
		position: relative;
	}

	.select {
		background-color: #131416;
		border: 1px solid #2d2e32;
		border-radius: 8px;
		align-items: center;
		cursor: pointer;
		display: flex;
		gap: 8px;
		padding-block: 8px;
		padding-inline: 12px 8px;

		.placeholder {
			opacity: 0.6;
		}
	}
</style>
