<script lang="ts">
	interface Props {
		user_id: string;
	}

	const { user_id }: Props = $props();
</script>

<b>
	{user_id} (element)
</b>
