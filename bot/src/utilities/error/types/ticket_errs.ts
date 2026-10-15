import { ActionRowBuilder, ButtonBuilder, EmbedBuilder, RepliableInteraction } from 'discord.js';
import EmbeddableError, { I18nType } from '../EmbeddableError';
import { TicketListData } from '@watcher/shared';

export class TicketNotFound extends EmbeddableError {
  constructor(readonly ticket_id: string) {
    super(`Ticket ${ticket_id} not found!`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setTitle(t('errors.ticket.ticket_not_found_title'));
    embed.setDescription(t('errors.ticket.ticket_not_found_body', { ticket_id: this.ticket_id }));
  }
}

export class PanelNotFound extends EmbeddableError {
  constructor(readonly panel_id: string) {
    super(`Panel ${panel_id} not found!`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setTitle(t('errors.ticket.panel_not_found_title'));
    embed.setDescription(t('errors.ticket.panel_not_found_body', { panel_id: this.panel_id }));
  }
}

export class ThreadIdNotFound extends EmbeddableError {
  constructor(readonly channel_id: string) {
    super(`Channel ${channel_id} is not related to any ticket!`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setTitle(t('errors.ticket.ticket_not_found_from_channel_title'));
    embed.setDescription(
      t('errors.ticket.ticket_not_found_from_channel_body', { channel_id: this.channel_id }),
    );
    embed.setFooter({ text: t('errors.ticket.ticket_not_found_from_channel_body_footer') });
  }
}

export class RequiresAssignedRole extends EmbeddableError {
  constructor(
    readonly assigned_roles: string[],
    readonly user_id: string,
  ) {
    super(`This action requires that ${user_id} has any of the assigned roles`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setTitle(t('errors.ticket.required_assigned_roles_title'));
    embed.setDescription(
      t('errors.ticket.required_assigned_roles_body', {
        assigned_roles: this.assigned_roles.map((r) => `<@&${r}>`).join(', '),
      }),
    );
  }
}

export class RequiresAssignedRoleOrOwnership extends EmbeddableError {
  constructor(
    readonly assigned_roles: string[],
    readonly user_id: string,
  ) {
    super(`This action requires that ${user_id} has any of the assigned roles`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setTitle(t('errors.ticket.required_assigned_roles_title'));
    embed.setDescription(
      t('errors.ticket.required_assigned_roles_body_or_ownership', {
        assigned_roles: this.assigned_roles.map((r) => `<@&${r}>`).join(', '),
      }),
    );
  }
}

export class TicketPipelineModuleError extends EmbeddableError {
  private original_error: EmbeddableError;
  constructor(
    readonly mod: { id: string },
    readonly inner_error: Error,
    readonly ticket_id: string,
  ) {
    super(`(ticket: ${ticket_id}) Module ${mod.id} failed: ${inner_error.message}`);
    this.original_error = EmbeddableError.from(inner_error);
  }

  protected configure_action_row(
    action_row: ActionRowBuilder<ButtonBuilder>,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    const { embeds, components } = this.original_error.get_obj(interaction);
    action_row = components.at(0) ?? action_row;

    const view_logs_btn = new ButtonBuilder();
    view_logs_btn.setLabel('View Logs');
    view_logs_btn.setEmoji('🪵');
    view_logs_btn.setURL(`https://cdn.threadwatcher.xyz/logs/${this.ticket_id}_pipeline.txt`);

    action_row.addComponents(view_logs_btn);
    this.embeds.push(...embeds);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    embed.setTitle(t('errors.ticket.pipeline_failed_title'));
    embed.setDescription(t('errors.ticket.pipeline_failed_desc', { module_id: this.mod.id }));
  }
}

export class TicketTooManyOpenError extends EmbeddableError {
  constructor(
    private tickets_open: number,
    private limit: number,
    private tickets: TicketListData[],
  ) {
    super(`Too many tickets open! ${tickets_open} (limit: ${limit})`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    const ticket_list = this.tickets
      .map(
        (t) =>
          `- [${t.name}](https://discord.com/channels/${t.guild_id}/${t.discord_channel_id}/${t.start_message_id})`,
      )
      .join('\n');

    embed.setTitle(t('errors.ticket.ticket_too_many_open_title'));
    embed.setDescription(
      t('errors.ticket.ticket_too_many_open_desc', { limit: this.limit, ticket_list }),
    );
  }
}

export class TicketTimeoutError extends EmbeddableError {
  constructor(
    private last_ticket_opened: Date,
    private timeout_seconds: number,
  ) {
    super(`You opened a ticket too recently!`);
  }

  protected configure_embed(
    embed: EmbedBuilder,
    interaction: RepliableInteraction,
    t: I18nType,
  ): void {
    const can_try_again = new Date(this.last_ticket_opened.getTime() + this.timeout_seconds * 1000);
    const can_try_again_epoch_seconds = can_try_again.getTime() / 1000;
    const timestamp = `<t:${Math.round(can_try_again_epoch_seconds)}:R>`;
    embed.setTitle(t('errors.ticket.ticket_too_recent_title'));
    embed.setDescription(t('errors.ticket.ticket_too_recent_body', { timestamp }));
  }
}
