# Bot Directory

Heya! Welcome to the **bot** directory!\
This is where you'll find the code that actually runs the bot (and api for the dashboard).
As you can tell, there's a lot of subdirectories. I've tried to make a layout that makes sense but I change my mind biweekly so dont count on stuff looking the same.

_Anyhow_, here's a brief dir overlook

- /src - where the code lives!
  - index.ts - the "root" process that runs the API and shard manager
  - bot.ts - the "root" process of the shards
  - deploy.ts - util function to deploy commands (`npm run deploy`)
  - gen_docs.ts - util function that takes translations in markdown format and inserts into the locale files (`npm run gen_docs`)
  - /web - API stuff
  - /utilities - all kinds of util functions. Pretty unsorted
  - /services
    - AuditService.ts - handles our internal audit logs
    - ChannelService.ts - handles channel monitors
    - ComponentService.ts - handles buttons, modals, and nice stuff like that
    - SettingService.ts - handles bot settings! Its a mess :D
    - ThreadBumper.ts - handles the "bumping" of threads. The heart of the core functionality
    - ThreadService.ts - handles watching / unwatching threads
  - /routines - stuff we want to run on intervals (will implement cron timings _soon_)
  - /ipcEvents - "Standardised" events allowing for easy communication between the shard manager process and the shards
    - /bot - IPC event handlers that run on each shard
    - /manager - IPC event handlers that run on the shard manager
  - /interfaces - where our little interfaces live :D
  - /fetchers - lowk forgot what this does. It prolly fetches something 👍
  - /events - where our d.js event handlers live!
    - /thread_events - where our thread focused event handlers live
    - interaction.ts - our command handler for slash commands and autocomplete commands!
  - /database - where our database adapters live
    - sqlite.ts
    - (soon) mysql.ts
    - ([maybe someday](https://github.com/ffamilyfriendly/Thread-Watcher/issues/37)) mongodb.ts
  - /commands - the fun stuff!
    - /core - the _core_ functionality of the bot!
    - (soon) /tickets - excited to get working on this!
    - (soon) /MORE_GREAT_STUFF - in time I'll add more (thread focused) features
    - /dev - nice dev only stuff
- /locales - where the translations live!
  - \<lang_string\>
    - common.json - the translation strings for this language!
    - /md - longer translation strings in markdown format. These are inserted into `common.json` with the `gen_docs` script
- /node_modules - if you see this i've messed up my `.gitignore`

any typescript file added in `/commands`, `events`, `ipcEvents` or a subfolder of these will be loaded by their respective loader. The loader will expect these files to implement a suitable interface.

- `events` expects a [ClientEvent](./src/interfaces/ClientEvent.ts)
- `ipcEvents` expects a [PrivateEvent](./src/interfaces/PrivateEvents.ts)
- `commands` expects...
  - a [Command](./src/interfaces/Command.ts#L93) if you are registering a simple command
  - a [BaseCommand](./src/interfaces/Command.ts#L83) if you are registering a subcommand group
  - a [SubCommand](./src/interfaces/Command.ts#L105) if you are registering a subcommand

If you wish to place code into any of these folders but do not wish it to be loaded you can place it in a subfolder prefixed with `_` such as [commands/core/\_shared](./src/commands/core/_shared/). The loader ignores any directory and files/subdirectories within if it's prefixed with `_`

## 🦆 Debug Duck

> **Hello there explorer!**\
> This is my _"Debug Duck"_ section. It's pretty much just notes I leave at the end of a coding session of stuff I need to do so I don't forget the next session.

- Test, test, and test again
  - we want this to run without crashing, yes? Weird perms **WILL** crash the bot
  - find and check edge cases (EDGE4LIFE 😎)
- stoooop trying to make everything too clean
  - if we actually want to deploy this we cant stay stuck on core features only
  - we can polish before deploy. Build shit bro
