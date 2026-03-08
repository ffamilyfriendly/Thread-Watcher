import { client } from '@providers/client';
import { ticket_service } from '@providers/services/ticket_service';
import { ButtonStart, Embed, EmbedField, SelectionStart, TicketPanel } from '@watcher/shared';
import {
  ActionRow,
  ActionRowBuilder,
  APIEmbedField,
  ButtonBuilder,
  ButtonStyle,
  ColorResolvable,
  EmbedBuilder,
  Message,
  RestOrArray,
  SendableChannels,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from 'discord.js';
import {
  CallbackResponse,
  define_secure_event,
  SecurePrivateEvent,
} from 'interfaces/PrivateEvents';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

function field_thing(data: Embed['fields']): APIEmbedField[] {
  const fields: APIEmbedField[] = [];

  for (const field of data) {
    fields.push({ inline: field.is_inline ?? false, value: field.text, name: field.title });
  }

  return fields;
}

function commencement_to_embed(data: Embed): EmbedBuilder {
  const e = new EmbedBuilder();

  e.setTitle(data.title);
  e.setColor(data.colour as ColorResolvable);
  e.setFields(field_thing(data.fields));
  if (data.description) e.setDescription(data.description);

  return e;
}

function get_string_select(
  data: SelectionStart,
  id: string,
): ActionRowBuilder<StringSelectMenuBuilder> {
  const row = new ActionRowBuilder<StringSelectMenuBuilder>();
  const str_sel = new StringSelectMenuBuilder();
  str_sel.setRequired(true);
  str_sel.setCustomId(id);
  str_sel.setPlaceholder(data.placeholder);

  for (const opt of data.options) {
    const option = new StringSelectMenuOptionBuilder();
    if (opt.description) option.setDescription(opt.description);
    option.setValue(opt.option_id);
    option.setLabel(opt.title);
    str_sel.addOptions(option);
  }

  row.addComponents(str_sel);

  return row;
}

function get_button_start(data: ButtonStart, id: string): ActionRowBuilder<ButtonBuilder> {
  const row = new ActionRowBuilder<ButtonBuilder>();
  const btn = new ButtonBuilder();
  btn.setCustomId(id);
  btn.setStyle(ButtonStyle.Primary);
  btn.setLabel(data.button_text);

  row.addComponents(btn);
  return row;
}

function get_init_row(
  data: TicketPanel['commencement_method'],
  id: string,
): ActionRowBuilder<ButtonBuilder> | ActionRowBuilder<StringSelectMenuBuilder> {
  return data.type === 'SELECTION' ? get_string_select(data, id) : get_button_start(data, id);
}

function get_start_id(panel_id: string) {
  return `start:${panel_id}`;
}

async function update_existing_message(
  message: Message,
  embed: EmbedBuilder,
  row: ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>,
): Promise<CallbackResponse<{ message_id: string }>> {
  const d_message = await ResultAsync.fromPromise(
    message.edit({ embeds: [embed], components: [row] }) as Promise<Message<true>>,
    map_err,
  );

  if (d_message.isErr()) return err(d_message.error);

  return ok({ message_id: d_message.value.id });
}

async function send_new_message(
  channel: SendableChannels,
  embed: EmbedBuilder,
  row: ActionRowBuilder<StringSelectMenuBuilder> | ActionRowBuilder<ButtonBuilder>,
): Promise<CallbackResponse<{ message_id: string }>> {
  const d_message = await ResultAsync.fromPromise(
    channel.send({ embeds: [embed], components: [row] }) as Promise<Message<true>>,
    map_err,
  );

  if (d_message.isErr()) return err(d_message.error);

  return ok({ message_id: d_message.value.id });
}

export default define_secure_event('send_embed', async (data) => {
  const panel_response = await ticket_service.get_panel(data.panel_id);
  if (panel_response.isErr()) return err(panel_response.error);
  if (!panel_response.value) return err(new Error('Panel not found'));
  const panel = panel_response.value;

  const d_channel = await ResultAsync.fromPromise(
    client.channels.fetch(panel.initial_channel_id),
    map_err,
  );
  if (d_channel.isErr()) return err(d_channel.error);
  if (!d_channel.value) return err(new Error('channel not found'));
  if (!d_channel.value?.isSendable()) return err(new Error('Channel is not sendable'));

  const channel = d_channel.value;

  const message = panel.discord_message_id
    ? ResultAsync.fromPromise(channel.messages.fetch(panel.discord_message_id), map_err)
    : null;

  const embed = commencement_to_embed(panel.commencement_embed);

  const actionrow = get_init_row(panel.commencement_method, get_start_id(panel.panel_id));

  if (message) {
    const msg = await message;
    if (msg.isErr()) return send_new_message(channel, embed, actionrow); // if we're getting an err on the message it most likely means it's deleted.
    return await update_existing_message(msg.value, embed, actionrow);
  } else {
    return await send_new_message(channel, embed, actionrow);
  }
});
