import { ThreadChannel } from "discord.js";
import { db, logger } from "../bot";
import { addThread, dueArchiveTimestamp } from "../utilities/threadActions";
import { strToRegex } from "../utilities/regex";
import { ChannelData } from "src/interfaces/database";

export function regMatch(str: string, reg: RegExp, inverted: boolean) {
  return reg.test(str) === !inverted;
}

export async function threadShouldBeWatched(
  auto: ChannelData,
  thread: ThreadChannel,
) {
  auto.roles = auto.roles.filter((s) => !(s?.trim() == ""));
  auto.tags = auto.tags.filter((s) => !(s?.trim() == ""));
  const reg = auto.regex.length != 0 ? strToRegex(auto.regex) : false;
  let passes = true;

  if (thread.locked) return false;

  if (auto.roles && auto.roles.length !== 0) {
    let rolePasses = false;
    for (const role of auto.roles) {
      const owner = thread.ownerId
        ? await thread.guild.members
            .fetch({ force: true, user: thread.ownerId })
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            .catch(() => {})
        : null;
      if (!role) break;
      if (owner?.roles.cache.has(role)) rolePasses = true;
    }
    if (!rolePasses) passes = false;
  }

  if (auto.tags && auto.tags.length !== 0) {
    let tagPasses = false;
    for (const tag of auto.tags) {
      if (!tag) break;
      if (thread.appliedTags.includes(tag)) tagPasses = true;
    }
    if (!tagPasses) passes = false;
  }

  if (reg) {
    if (!regMatch(thread.name, reg.regex, reg.inverted)) {
      passes = false;
    }
  }

  return passes;
}

export default async function (thread: ThreadChannel) {
  // Here we check if the threads parent or the threads grandparent has an auto rule
  // This is kinda ugly and not performant as we do 2 queries but I do not care
  const auto =
    (await db.getChannels(thread.guildId)).find(
      (t) => t.id == thread.parentId,
    ) ||
    (await db.getChannels(thread.guildId)).find(
      (t) => t.id == thread.parent?.parentId,
    );

  if (!auto) return;

  if (await threadShouldBeWatched(auto, thread)) {
    logger.info(
      `Automatically adding thread "${thread.id}" in ${thread.guildId}`,
    );
    addThread(
      thread.id,
      dueArchiveTimestamp(thread.autoArchiveDuration || 0) as number,
      thread.guildId,
    ).catch((err) => {
      logger.error(
        `could not add thread "${thread.id}" in ${thread.guildId}: ${err.toString()}`,
      );
    });
  } else {
    logger.info(
      `Not adding thread "${thread.id}" in ${thread.guildId} as filters prevent it`,
    );
  }
}
