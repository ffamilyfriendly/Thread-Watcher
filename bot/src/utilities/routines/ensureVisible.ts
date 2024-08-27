import { PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { client, logger, settings, threads } from "../../bot";
import { ThreadData } from "../../interfaces/database";
import { bumpAutoTime } from "../threadActions";

const queue: ThreadData[] = [];
const summary = {
  worked: 0,
  fail_unknown_channel: 0,
  fail_could_not_edit: 0,
  failed_perms: 0,
};

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

      // If user only wants the bot to unarchive the thread without keeping it "active" we can just return here
      if (
        (await settings.getSetting(thread.guildId, "BEHAVIOUR")) ===
        "UNARCHIVE_ONLY"
      ) {
        bumpAutoTime(thread);
        return;
      }

      if (!thread.locked && thread.manageable) {
        /**
         * Previous behaviour was to set the autoarchiveduration to 4320 then directly set it back to 10080.
         * This worked but is not great for ratelimits. This has been changed to setting it to 4320 if it is 10080
         * or setting it to 10080 if it is anything else.
         */
        if (thread.autoArchiveDuration === 10080) {
          thread.setAutoArchiveDuration(4320).catch(() => {
            summary.fail_could_not_edit++;
          });
          summary.worked++;
        } else {
          thread.setAutoArchiveDuration(10080).catch(() => {
            summary.fail_could_not_edit++;
          });
          summary.worked++;
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
          summary.worked++;
        } else {
          thread.send(
            `**Bumping thread**\nDont mind me, i'm just making sure this thread is visible under your channel 👉😎👉\n\n*prefer silent bumps? Give me \`manage threads\` in <#${thread.parentId}>*`,
          );
          summary.worked++;
        }
      } else {
        summary.failed_perms++;
      }

      bumpAutoTime(thread);
    })
    .catch(() => {
      summary.fail_unknown_channel++;
    });

  if (queue.length !== 0) setTimeout(makeVisible, 1000 / 4);
  else {
    running = false;
    logger.done(
      `ensureVisible routine completed.\nSummary:\n- worked: ${summary.worked} (${(summary.worked / (summary.worked + summary.failed_perms + summary.fail_unknown_channel + summary.fail_could_not_edit)) * 100}%)\n- cant get channel: ${summary.fail_unknown_channel}\n- no perms: ${summary.failed_perms}\n- could not edit: ${summary.fail_could_not_edit}`,
    );
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
