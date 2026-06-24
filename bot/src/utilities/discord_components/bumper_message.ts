import {
  MessageCreateOptions,
  PrivateThreadChannel,
  PublicThreadChannel,
  SectionBuilder,
  TextDisplayBuilder,
  ThumbnailBuilder,
} from 'discord.js';

function get_componentv2_bumper(): MessageCreateOptions {
  const section = new SectionBuilder()
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent('🔼 **Keeping this thread alive!**'),
      new TextDisplayBuilder().setContent(
        "Thread-Watcher just bumped this thread so it doesn't get hidden. Grant the `Manage Threads` permission to stop these messages!",
      ),
    )
    .setThumbnailAccessory(
      new ThumbnailBuilder({
        media: { url: 'https://cdn.threadwatcher.xyz/images/manage_threads_gif.gif' },
      }),
    );

  return {
    flags: 'IsComponentsV2',
    components: [section],
  };
}

export default function get_bumper_message(
  thread: PublicThreadChannel<boolean> | PrivateThreadChannel,
): MessageCreateOptions {
  const send_pretty_message =
    thread.guild.members.me && thread.permissionsFor(thread.guild.members.me).has('EmbedLinks');

  if (send_pretty_message) return get_componentv2_bumper();

  return {
    content: `**Keeping this thread alive!**\nThread-Watcher just bumped <#${thread.id}> so it doesn't get archived.\n-# Want to stop these? Give Thread-Watcher \`Manage Threads\` permission!`,
  };
}
