const config = require("../config")
const getText = require("../utils/getText.js")
const { db, threads } = require("../index")
const { logger } = require("../utils/clog")

const run = ( client ) => {

    const getDate = () => {
        return (new Date()).toLocaleString(undefined, {
          hour12: false
        });
    };

    // We had to implement ratelimit and blacklist since there are some cunts DOSing the bot.
    // Server will added to the blacklist for a while when they go over ratelimit.
    const blacklist = [];
    const ratelimits = {};

    client.on('threadUpdate', async (oldThread, newThread) => {
        if (oldThread.archived || !newThread.archived || blacklist.includes(newThread.guildId) || !threads.has(newThread.id)) {
          return;
        }
      
        if (newThread.guildId in ratelimits && ratelimits[newThread.guildId] >= 10) {
          blacklist.push(newThread.guildId);
      
          let mentions = '';
      
          for (const owner of config.owners) {
            mentions += `<@${owner}> `;
          }
      
          client.channels.cache.get(config.logchannel).send(`${mentions}\`${newThread.guildId}\` server went over ratelimit!`);
      
          setTimeout(() => {
            blacklist = blacklist.filter(s => s != newThread.guildId);
          }, 1000 * 60 * 30);
      
          return;
        }
      
        // Workaround for discordjs/discord.js#7406: This should be !newThread.unarchivable && newThread.locked once discord.js v14 is released.
        if (!newThread.sendable || newThread.locked) {
          logger.warn(`[auto] (${getDate()}) Skipped ${newThread.id} thread in ${newThread.guildId} server. (archived: ${newThread.archived}, locked: ${newThread.locked}, sendable: ${newThread.sendable})`);
          return;
        }
      
        const unarchive_reason = getText('unarchive-reason-keep-active', newThread.guild.preferredLocale);
        await newThread.setArchived(false, unarchive_reason);
        await newThread.setAutoArchiveDuration(10080); // one week
        logger.done(`[auto] (${getDate()}) Unarchived ${newThread.id} thread in ${newThread.guildId} server.`);
        db.updateArchiveTimes(newThread.id, (Date.now() / 1000) + (newThread.autoArchiveDuration * 60));
        ratelimits[newThread.guildId] = (newThread.guildId in ratelimits) ? (ratelimits[newThread.guildId] + 1) : 1;
      
        setTimeout(() => {
          ratelimits[oldThread.guildId]--;
        }, 1000 * 60);
      });
}

module.exports = { run }