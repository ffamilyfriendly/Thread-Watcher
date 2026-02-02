<script lang="ts">
	import { guild_state } from "$lib/stores/guild.svelte";
import type { ExpandedAuditLog } from "$lib/types/internal_api";
	import { ArrowRight } from "@lucide/svelte";
	import type { NarrowedLog } from "@watcher/shared";
	import Channel from "../discord/Channel.svelte";
	import Role from "../discord/Role.svelte";

    interface Props {
        log: NarrowedLog<"CONFIG", ExpandedAuditLog>
    }

    const { log }: Props = $props()

    const resolved_old = $derived(guild_state.resolve_snowflake(log.data.old_value));
    const resolved_new = $derived(guild_state.resolve_snowflake(log.data.new_value));
    type ResolvedReturn = ReturnType<typeof guild_state.resolve_snowflake>
</script>
{#snippet display_nice(val: ResolvedReturn)}
    {#if val.entity_type === "CHANNEL"}
        <Channel channel={val.data} />
    {:else if val.entity_type === "ROLE"}
        <Role role={val.data} />
    {:else if val.data === null}
        <p class="val_null">No Value</p>
    {:else}
        <code>{val.data}</code>
    {/if}
{/snippet}


Setting <code>{log.data.setting_key}</code> changed.

<div class="change_breakdown">
    {@render display_nice(resolved_old)}
    <ArrowRight />
    {@render display_nice(resolved_new)}
</div>

<style lang="scss">
    .change_breakdown {
        display: flex;
        align-items: center;
        gap: .5rem;
        margin-top: .5rem;
    }

    .val_null {
        border: 1px dashed white;
        padding: .25rem;
        border-radius: .5rem;
        opacity: .5;
        font-weight: 100;
    }
</style>