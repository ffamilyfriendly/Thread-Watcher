const { cachedUnknownThreads } = require('../index');

function run(client) {
  client.on('threadListSync', (threads) => {
    for (const thread of threads.values()) {
      if (!(thread.guildId in cachedUnknownThreads)) {
        continue;
      }

      const unknownThreadsInServer = cachedUnknownThreads[thread.guildId];

      if (unknownThreadsInServer.includes(thread.id)) {
        unknownThreadsInServer.splice(unknownThreadsInServer.indexOf, 1);
      }
    }
  });
}

module.exports = {
  run
};