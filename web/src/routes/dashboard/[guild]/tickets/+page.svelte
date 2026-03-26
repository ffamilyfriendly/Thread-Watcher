<script lang="ts">
	import type { PageProps } from "./$types";

    const { data }: PageProps = $props()
</script>

{#each data.tickets as ticket}
    <div>
        {ticket.name}
    </div>
{/each}