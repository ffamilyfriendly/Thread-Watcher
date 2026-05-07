import {
  InteractionDeferReplyOptions,
  InteractionEditReplyOptions,
  InteractionReplyOptions,
  InteractionResponse,
  InteractionUpdateOptions,
  Message,
  RepliableInteraction,
} from 'discord.js';
import { err, ok, ResultAsync } from 'neverthrow';
import { map_err } from './error';

/**
 * @description checks if a interaction has been replied to or deferred
 */
export function interaction_is_clean(int: RepliableInteraction) {
  return !int.replied && !int.deferred;
}

export function safe_defer(
  int: RepliableInteraction,
  opts: InteractionDeferReplyOptions = { flags: 'Ephemeral' },
) {
  return ResultAsync.fromPromise(int.deferReply(opts), map_err);
}

/**
 * @description Ensures a interaction is deferred. If it's already deferred this function will not try to deferr it again
 */
export function ensure_deferred(
  int: RepliableInteraction,
  opts: InteractionDeferReplyOptions = { flags: 'Ephemeral' },
) {
  if (interaction_is_clean(int)) return safe_defer(int, opts);
  return ok();
}

export async function safe_reply(
  interaction: RepliableInteraction,
  content: InteractionReplyOptions,
) {
  let promise: Promise<Message<boolean> | InteractionResponse<boolean>>;

  const { flags, ...rest } = content;

  if (interaction.isPrimaryEntryPointCommand()) return err(new Error('not supported'));
  if (interaction.replied || interaction.deferred) promise = interaction.editReply(rest);
  else promise = interaction.reply(content);

  return ResultAsync.fromPromise(promise, map_err);
}

export async function safe_edit_reply(
  interaction: RepliableInteraction,
  content: InteractionEditReplyOptions,
) {
  return ResultAsync.fromPromise(interaction.editReply(content), map_err);
}

export async function safe_reply_or_followup(
  interaction: RepliableInteraction,
  content: InteractionReplyOptions,
) {
  let promise: Promise<Message<boolean> | InteractionResponse<boolean>>;

  if (interaction.replied || interaction.deferred) promise = interaction.followUp(content);
  else promise = interaction.reply(content);

  return ResultAsync.fromPromise(promise, map_err);
}

export async function safe_update(
  interaction: RepliableInteraction,
  msg_content: InteractionUpdateOptions,
) {
  let promise: Promise<Message<boolean> | InteractionResponse<boolean>>;

  const { flags, ...rest } = msg_content;

  if (interaction.replied || interaction.deferred) promise = interaction.editReply(rest);
  else if ('update' in interaction) promise = interaction.update(msg_content);
  else {
    const { flags, content, ...rest } = msg_content;

    const msg_content_safe = content === null ? undefined : content;

    promise = interaction.reply({ ...rest, content: msg_content_safe });
  }

  return ResultAsync.fromPromise(promise, map_err);
}

export async function safe_delete(interaction: RepliableInteraction) {
  if (interaction_is_clean(interaction)) {
    if (interaction.isMessageComponent() || interaction.isModalSubmit()) {
      const ack = await ResultAsync.fromPromise(interaction.deferUpdate(), map_err);
      if (ack.isErr()) return err(ack.error);
    } else {
      const ack = await ResultAsync.fromPromise(
        interaction.deferReply({ flags: 'Ephemeral' }),
        map_err,
      );
      if (ack.isErr()) return err(ack.error);
    }
  }

  return ResultAsync.fromPromise(interaction.deleteReply(), map_err);
}
