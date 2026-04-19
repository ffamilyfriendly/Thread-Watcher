import { Module } from '#/interfaces/Module';
import { map_err } from '#/utilities/error';
import { config } from '@providers/config';
import { setting_service } from '@providers/services/setting_service';
import { thread_service } from '@providers/services/thread_service';
import { ThreadChannel } from 'discord.js';
import { err, ok, ResultAsync } from 'neverthrow';
import { Logger } from 'tslog';

async function on_thread_create(new_thread: ThreadChannel, l: Logger<unknown>) {
  if (!config.modules.thread_create_bots.includes(new_thread.ownerId)) {
    l.silly(`Did not watch thread as owner is not configured thread creator`, {
      thread_owner: new_thread.ownerId,
      creator_list: config.modules.thread_create_bots,
      guild_id: new_thread.guildId,
    });
    return ok();
  }

  const should_handle_thread = await setting_service.get_setting(
    new_thread.guildId,
    'NEEDLE_INTEGRATION',
  );

  if (should_handle_thread.isErr()) return err(should_handle_thread.error);
  if (!should_handle_thread.value) {
    l.silly('not configured to watch threads by creator bots', { guild_id: new_thread.guildId });
    return ok();
  }

  const bot_username = await ResultAsync.fromPromise(new_thread.fetchOwner(), map_err)
    .map((member) => member?.user?.username ?? new_thread.ownerId)
    .unwrapOr(new_thread.ownerId);

  return thread_service.watch_thread(new_thread, {
    executor_id: config.clientID,
    guild_id: new_thread.guildId,
    reason: `Automatically watching threads created by '${bot_username}' due to 'NEEDLE_INTEGRATION' setting.`,
  });
}

const module: Module = {
  name: 'Needle',
  on_thread_create,
};

export default module;
