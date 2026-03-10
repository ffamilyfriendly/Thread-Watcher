import {
  InteractionReplyOptions,
  InteractionResponse,
  InteractionUpdateOptions,
  Message,
  RepliableInteraction,
} from 'discord.js';
import { err, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';

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
  content: InteractionUpdateOptions,
) {
  if (!('update' in interaction))
    return err(
      new Error(`safe_update cannot be used for interaction of type '${interaction.type}'`),
    );
  let promise: Promise<Message<boolean> | InteractionResponse<boolean>>;

  const { flags, ...rest } = content;

  if (interaction.replied || interaction.deferred) promise = interaction.editReply(rest);
  else promise = interaction.update(content);

  return ResultAsync.fromPromise(promise, map_err);
}
