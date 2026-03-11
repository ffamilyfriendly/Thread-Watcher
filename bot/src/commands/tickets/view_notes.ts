import { audit_service } from '@providers/services/audit_service';
import { channel_service } from '@providers/services/channel_service';
import { ticket_service } from '@providers/services/ticket_service';
import {
  ChannelType,
  ChatInputCommandInteraction,
  ContainerBuilder,
  SectionBuilder,
  SeparatorSpacingSize,
  SlashCommandSubcommandBuilder,
} from 'discord.js';
import { RegistrationScope } from 'interfaces/BaseCommandInterface';
import { type SubCommand } from 'interfaces/Command';
import { delete_note_btn } from 'modules/ticket/_actions/components/embeds';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import { CommandContext } from 'utilities/command_context';
import { map_err } from 'utilities/error';
import { CommandError } from 'utilities/error/def';
import EmbeddableError from 'utilities/error/EmbeddableError';
import {
  ensure_deferred,
  safe_defer,
  safe_reply_or_followup,
  safe_update,
} from 'utilities/interaction_helpers';

function create_container(sections: Map<string, SectionBuilder>): ContainerBuilder {
  const c = new ContainerBuilder();
  for (const section of sections.values()) {
    c.addSectionComponents(section);
    c.addSeparatorComponents((sep) => sep.setDivider(true).setSpacing(SeparatorSpacingSize.Small));
  }

  c.components.pop();

  return c;
}

async function run(
  interaction: ChatInputCommandInteraction,
  ctx: CommandContext,
): Promise<Result<void, CommandError>> {
  await ensure_deferred(interaction);
  const ticket = await ticket_service.get_ticket_from_thread_id(interaction.channelId);
  if (ticket.isErr()) return err(ticket.error);
  if (!ticket.value) return err(new Error('ticket was null!'));

  const notes = await ticket_service.get_ticket_notes(ticket.value.ticket_id, 25, 0);
  if (notes.isErr()) return err(notes.error);

  const sections: Map<string, SectionBuilder> = new Map();

  for (const note of notes.value) {
    const fetched_user = await ResultAsync.fromPromise(
      interaction.client.users.fetch(note.created_by),
      map_err,
    );
    if (fetched_user.isErr()) return err(fetched_user.error);
    const n_sec = new SectionBuilder();

    n_sec.setThumbnailAccessory((tn) => tn.setURL(fetched_user.value.displayAvatarURL()));
    n_sec.addTextDisplayComponents(
      (td) => td.setContent(`## ${fetched_user.value.username}`),
      (td) => td.setContent(`> ${note.text}`),
      (td) => td.setContent(`-# ${note.created_at.toISOString()}`),
    );

    sections.set(note.note_id, n_sec);
  }

  const msg_res = await safe_reply_or_followup(interaction, {
    flags: ['Ephemeral', 'IsComponentsV2'],
    components: [create_container(sections)],
  });
  if (msg_res.isErr()) return err(msg_res.error);
  return ok();
}

export const command_data = new SlashCommandSubcommandBuilder()
  .setName('view-notes')
  .setDescription('view notes associated with this ticket');

const command: SubCommand = {
  command_scope: RegistrationScope.GLOBAL,
  access_control: {},
  command_data,
  parent_command: 'ticket',
  run,
};

export default command;
