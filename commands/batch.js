const getText = require('../utils/getText');
const { addThread, removeThread } = require('../utils/threadActions');
const { CommandInteraction, Permissions } = require('discord.js');
const { threads } = require('../index');

/**
 * @param {string} action
 * @param {*} parent
 * @param {RegExp} pattern_regex
 * @param {boolean} pattern_inverted
 * @param {*} bot_member
 * @param {*} user_member
 * @param {string} server_locale
 */
const runBatchActions = async (action, parent, pattern_regex, pattern_inverted, bot_member, user_member, server_locale) => {
  const channels = parent.isText() ? [parent] : parent.children.values();

  const results = {
    failed: {
      bot_cannot_fetch: 0,
      bot_cannot_unarchive: 0,
      error: 0,
      locked: 0,
      user_access_denied: 0
    },
    succeed: 0
  };

  for (const channel of channels) {
    if (!(channel.viewable && bot_member.permissionsIn(channel).has(Permissions.FLAGS.READ_MESSAGE_HISTORY))) {
      results.failed.bot_cannot_fetch++;
      continue;
    }

    for (const thread of channel.threads.cache.values()) {
      if (pattern_regex !== null) {
        const pattern_match = pattern_regex.test(thread.name);

        if (pattern_inverted ? pattern_match : !pattern_match) {
          continue;
        }
      }

      if (!user_member.permissionsIn(thread).has([
        Permissions.FLAGS.MANAGE_THREADS,
        Permissions.FLAGS.READ_MESSAGE_HISTORY,
        Permissions.FLAGS.VIEW_CHANNEL
      ])) {
        results.failed.user_access_denied++;
        continue;
      }
      else if (threads.has(thread.id)) {
        if (action === 'unwatch') {
          try {
            removeThread(thread.id);
            results.succeed++;
          }
          catch {
            results.failed.error++;
          }
        }

        continue;
      }
      else if (thread.locked) {
        results.failed.locked++;
        continue;
      }
      // No need to check for thread.viewable
      else if (!thread.sendable) {
        results.failed.bot_cannot_unarchive++;
        continue;
      }

      try {
        addThread(thread.id, thread.guildId, (Date.now() / 1000) + (thread.autoArchiveDuration * 60));

        if (thread.archived) {
          const unarchive_reason = getText('unarchive-reason-watch-archived', server_locale);
          thread.setArchived(false, unarchive_reason);
        }

        results.succeed++;
      }
      catch {
        results.failed.error++;
      }
    }
  }

  return results;
};

/**
 * @param {*} client
 * @param {CommandInteraction} interaction
 * @param {function} handleBaseEmbed
 */
const run = async (client, interaction, handleBaseEmbed) => {
  const action = interaction.options.getString('action');
  const parent = interaction.options.getChannel('parent') ?? interaction.channel;
  const pattern = interaction.options.getString('pattern');

  if (parent.isThread()) {
    const description = getText('batch-channel-type-not-allowed', interaction.locale);
    const title = getText('channel-type-not-allowed', interaction.locale);
    handleBaseEmbed(title, description, false, '#dd3333', true, true);
    return;
  }

  let pattern_inverted;
  let pattern_regex = null;

  if (!(pattern === null || pattern === '')) {
    const invalid_pattern_description = getText('batch-invalid-pattern-description', interaction.locale);
    const invalid_pattern_title = getText('batch-invalid-pattern-title', interaction.locale);

    if (pattern === '!') {
      handleBaseEmbed(invalid_pattern_title, invalid_pattern_description, false, '#dd3333', true, true);
      return;
    }

    pattern_inverted = pattern.startsWith('!');
    const parsed_pattern = pattern_inverted ? pattern.replace('!', '') : pattern;

    if (!/^[\w!*]{0,100}$/gm.test(parsed_pattern)) {
      handleBaseEmbed(invalid_pattern_title, invalid_pattern_description, false, '#dd3333', true, true);
      return;
    }

    pattern_regex = new RegExp(parsed_pattern.replace('*', '\\w*'));
  }

  await interaction.deferReply();
  const results = await runBatchActions(action, parent, pattern_regex, pattern_inverted, interaction.guild.me, interaction.member, interaction.guildLocale);
  let failed_channel_amount = 0;
  let failed_thread_amount = 0;
  const fields = [];
  const title_locale_string = (action === 'watch') ? 'batch-watch-done' : 'batch-unwatch-done';
  const title = getText(title_locale_string, interaction.locale);

  if (results.failed.bot_cannot_fetch > 0) {
    const field_name = getText('batch-field-bot-cannot-fetch-name', interaction.locale, {
      'channel-amount': results.failed.bot_cannot_fetch
    });

    const field_value = getText('batch-field-bot-cannot-fetch-value', interaction.locale);
    fields.push([field_name, field_value]);
    failed_channel_amount += results.failed.bot_cannot_fetch;
  }

  if (results.failed.bot_cannot_unarchive > 0) {
    const field_name = getText('batch-field-bot-cannot-unarchive-name', interaction.locale, {
      'thread-amount': results.failed.bot_cannot_unarchive
    });

    const field_value = getText('batch-field-bot-cannot-unarchive-value', interaction.locale);
    fields.push([field_name, field_value]);
    failed_thread_amount += results.failed.bot_cannot_unarchive;
  }

  if (results.failed.error > 0) {
    const field_name_locale_string = (action === 'watch') ? 'batch-watch-field-error' : 'batch-unwatch-field-error';

    const field_name = getText(field_name_locale_string, interaction.locale, {
      'thread-amount': results.failed.error
    });

    const field_value = getText('unknown-error-occurred', interaction.locale);
    fields.push([field_name, field_value]);
    failed_thread_amount += results.failed.error;
  }

  if (results.failed.locked > 0) {
    const field_name = getText('batch-field-locked-name', interaction.locale, {
      'thread-amount': results.failed.locked
    });

    const field_value = getText('batch-field-locked-value', interaction.locale);
    fields.push([field_name, field_value]);
    failed_thread_amount += results.failed.locked;
  }

  if (results.failed.user_access_denied > 0) {
    const field_name = getText('batch-field-user-access-denied-name', interaction.locale, {
      'thread-amount': results.failed.user_access_denied
    });

    const field_value = getText('batch-field-user-access-denied-value', interaction.locale);
    fields.push([field_name, field_value]);
    failed_thread_amount += results.failed.user_access_denied;
  }

  const description = getText('batch-results', interaction.locale, {
    'failed-channel-amount': failed_channel_amount,
    'failed-thread-amount': failed_thread_amount,
    'succeed-thread-amount': results.succeed
  });

  const embed = handleBaseEmbed(title, description, true, '#3366cc', false, null);

  for (const field of fields) {
    embed.addField(...field);
  }

  interaction.editReply({
    embeds: [embed]
  });
};

const data = {
  description: 'Batch watch or unwatch multiple threads.',
  name: 'batch',
  options: [
    {
      choices: [
        {
          name: 'watch',
          value: 'watch'
        },
        {
          name: 'unwatch',
          value: 'unwatch'
        }
      ],
      description: 'Action to run',
      name: 'action',
      required: true,
      type: 3
    },
    {
      channel_types: [0, 4, 5],
      description: 'Category or channel to run batch actions',
      name: 'parent',
      type: 7
    },
    {
      description: 'Run batch actions only on threads whose name match this pattern',
      name: 'pattern',
      type: 3
    }
  ]
};

module.exports = { run, data };
