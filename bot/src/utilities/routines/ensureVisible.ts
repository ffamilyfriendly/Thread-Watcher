import { PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { client, logger, threads } from "../../bot";
import { ThreadData } from "../../interfaces/database";
import { bumpAutoTime } from "../threadActions";

const queue: ThreadData[] = [];
let running = false;

const makeVisible = () => {
  const t = queue.shift();
  if (!t) return (running = false);

  client.channels
    .fetch(t?.id)
    .then(async (thread) => {
      if (!thread?.isThread()) return;

      if (thread.archived && thread.unarchivable)
        await thread.setArchived(false);

      if (!thread.locked && thread.manageable) {
        /**
         * Previous behaviour was to set the autoarchiveduration to 4320 then directly set it back to 10080.
         * This worked but is not great for ratelimits. This has been changed to setting it to 4320 if it is 10080
         * or setting it to 10080 if it is anything else.
         */

        // CHECK BEHAVIOUR SETTING HERE

        if (thread.autoArchiveDuration === 10080) {
          thread.setAutoArchiveDuration(4320).catch(() => {
            logger.error(
              `could not set thread ${thread.id} to 4320 autoArchiveDuration`,
            );
          });
        } else {
          thread.setAutoArchiveDuration(10080).catch(() => {
            logger.error(
              `could not bump thread ${thread.id} failed to set autoArchiveDuration`,
            );
          });
        }
      } else if (!thread.manageable && thread.sendable && !thread.archived) {
        if (
          thread
            .permissionsFor(thread.client.user.id)
            ?.has(PermissionFlagsBits.EmbedLinks)
        ) {
          const e = new EmbedBuilder().setTitle("Bumping Thread").setFields([
            {
              name: "Why?",
              value:
                "this message is sent to bump activity so this thread does not get hidden.",
            },
            {
              name: "Tired of these messages?",
              value: `give me \`manage threads\` in <#${thread.parentId}>.`,
            },
          ]);
          thread.send({ embeds: [e] });
        } else {
          thread.send(
            `**Bumping thread**\nDont mind me, i'm just making sure this thread is visible under your channel 👉😎👉\n\n*prefer silent bumps? Give me \`manage threads\` in <#${thread.parentId}>*`,
          );
        }
      } else {
        logger.error(`could not bump thread ${thread.id} due to perms`);
      }

      bumpAutoTime(thread);
    })
    .catch((e) => {
      logger.error(
        `could not get thread with id ${t.id} thus not bumping it (dump below)`,
      );
      console.error(e);
    });

  if (queue.length !== 0) setTimeout(makeVisible, 1000 / 4);
  else {
    running = false;
  }
};

export default function bumpThreads(t: ThreadData[]) {
  queue.push(...t);
  if (!running) makeVisible();
}

/**
 * @description Given an array of threads this function will return threads whos dueArchive property is in the past
 * @param threads
 */
export function getPossiblyArchivedThreads(threads: ThreadData[]) {
  const MaybeArchived: ThreadData[] = [];
  for (const thread of threads) {
    const bigger = thread.dueArchive < Date.now() / 1000;
    if (bigger && thread.watching) MaybeArchived.push(thread);
  }
  return MaybeArchived;
}

export function bumpThreadsRoutine() {
  const needsBump = getPossiblyArchivedThreads([...threads.values()]);
  if (needsBump.length === 0) return logger.info("no threads to bump");
  logger.info(`Bumping ${needsBump.length} threads`);
  bumpThreads(needsBump);
}
