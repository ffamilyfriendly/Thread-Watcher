<script lang="ts">
	import type { AuditLog, DiscordChannel, DiscordRole } from "$lib/types/internal_api";
	import Role from "./discord/Role.svelte";
    interface Props {
        log: AuditLog,
        roles: DiscordRole[],
        channels: DiscordChannel[]
    }

    const { log, roles, channels }: Props = $props()
    const { audit_type, executor_id, timestamp, old_value, new_value, reason, ...rest } = log


    type RenderOption = "ROLE" | "CHANNEL" | "NULL" | "STRING"
    function render_as(value: string): RenderOption {
        if(value === "null") return "NULL"
         if(value.startsWith("<@&")) {
            const role_id = value.substring(3, value.length - 1)
            
            if(role_id === "null") {
                return "NULL"
            }

            if(!roles.find(r => r.id === role_id)) {
                return "STRING"
            }

            return "ROLE"
        }

        if(value.startsWith("<#")) {
            const channel_id = value.substring(2, value.length - 1)
            
            if(channel_id === "null") {
                return "NULL"
            }

            if(!channels.find(c => c.id === channel_id)) {
                return "STRING"
            }

            return "CHANNEL"
        }

        return "STRING"
    }

    function get_role_from_id(value: string) {
        const role_id = value.substring(3, value.length - 1)
        return roles.find(r => r.id === role_id)
    }

    function get_channel_from_id(value: string) {
        const channel_id = value.substring(2, value.length - 1)
        return channels.find(c => c.id === channel_id)
    }

    let render_old_as = old_value ? render_as(old_value) : false
    let render_new_as = new_value ? render_as(new_value) : false
</script>

{#snippet render_value(render_as: RenderOption | false, value?: string|null)}
    {#if !value}
        <p>null</p>
    {:else if (render_as === "ROLE")}
        <Role role={get_role_from_id(value)!} />
    {:else}
        {value}
    {/if}
{/snippet}

<div class="audit">
    {#if (audit_type == "CONFIG_UPDATE")}
        <h3>{reason}</h3>
        <div class="changes">
            <div>
                <p>From</p>
                {@render render_value(render_old_as, old_value)}
            </div>
            <div>
                <p>To</p>
                {@render render_value(render_new_as, new_value)}
            </div>
        </div>
    {/if}

    <div>
        <time>{timestamp}</time> {rest.id}
    </div>
</div>

<style lang="scss">
    .audit {
        outline: 1px solid rgba(128, 128, 128, 0.3);
        padding: .5rem;
    }
    .changes {
        display: flex;
        gap: 1rem;
    }
</style>