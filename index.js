const { AutoPoster } = require('topgg-autoposter');
const settings = require('./config');
const fs = require('fs');
const Discord = require('discord.js');

const cachedUnknownThreads = {};

const client = new Discord.Client({
  intents: Discord.Intents.FLAGS.GUILDS
});

const DB = require('./utils/db/getDatabase')(settings.database.connectionOptions);
const registeredChannels = new Map();
const watchedThreads = new Map();

// null or undefined
if (!(settings.topggToken == null || settings.topggToken === '')) {
  AutoPoster(settings.topggToken, client)
}

/**
 * Load all commands and add them to client.commands map.
 * @param {boolean} clearCache
 */
const loadCommands = (clearCache) => {
  if (clearCache) {
    for (let cmd of client.commands) {
      cmd = cmd[0];
      delete require.cache[require.resolve(`./commands/${cmd}.js`)];
    }
  }

  client.commands = new Map(fs.readdirSync('./commands').filter((f) => f.endsWith('.js')).map((f) => [f.split('.js')[0], require(`./commands/${f}`)]));
}

module.exports = {
  cachedUnknownThreads,
  channels: registeredChannels,
  client,
  db: DB,
  loadCommands,
  threads: watchedThreads
};

loadCommands();
// this runs all event modules. Check /events dir
require('./utils/events')().forEach((event) => event.run(client));
client.login(settings.token);

if (settings.stats.enabled) {
  const http = require('http');

  const reqListener = (req, res) => {
    if (!(req.url && req.url.endsWith("/stats"))) {
      res.writeHead(404);
      return res.end('The only path is /stats... how did you manage to mess that up?');
    }

    res.writeHead(200);
    res.end(JSON.stringify({
      guilds: client.guilds.cache.size,
      threads: threads.size
    }));
  }

  const server = http.createServer(reqListener);
  server.listen(settings.stats.port);
}