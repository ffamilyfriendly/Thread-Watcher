# Thread-Watcher 🧵

> A Discord bot that keeps threads active, automates bumping, and adds extra utilities for managing your server’s tangled mess of threads. Always open source <3

<p align="center">
  <a href="https://docs.threadwatcher.xyz">
    <img src="https://img.shields.io/badge/docs-4ade80?style=for-the-badge&logo=gitbook&logoColor=white" />
  </a>
  <a href="https://botsuite.co/join">
    <img src="https://img.shields.io/badge/discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  </a>
  <a href="https://threadwatcher.xyz">
    <img src="https://img.shields.io/badge/Website-b82ada?style=for-the-badge&logo=firefoxbrowser&logoColor=white" />
  </a>
</p>
<p align="center">
  <img src="https://img.shields.io/github/license/ffamilyfriendly/Thread-Watcher?style=flat" />
  <img src="https://img.shields.io/github/stars/ffamilyfriendly/Thread-Watcher?style=flat" />
  <img src="https://img.shields.io/github/issues/ffamilyfriendly/Thread-Watcher?style=flat" />
</p>

## 🧰 Requirements

- [Redis](https://redis.io/)
- [Bun](https://bun.sh/)
- [Node](https://nodejs.org/en)
- \*(optional) Any S3 compatible storage provider
  - This is used to store attachments for ticket transcripts and to store database backups if enabled. Cloudflare has a generous free tier on [R2](https://www.cloudflare.com/developer-platform/products/r2/)
- \*(optional) [Mistral AI](https://console.mistral.ai/home) credentials
  - AI is used to summarize tickets, provide functionality to some ticket modules, and to generate RegExprs.

<small style="color:red">\* Please note that Thread-Watcher is designed to work with S3 storage and Mistral AI properly configured. It <i>should</i> still work without them but your milage may vary.</small>

## 🚀 Quick Start

> [!IMPORTANT]
> The ticket feature of Thread-Watcher expects the `Message Intent` to be enabled. Please enable it for your bot in the Discord Developer Portal. Alternativly, if you are not intending to use tickets, you can remove the intent from [the client](/bot/src/providers/client.ts).

### **1** - Install the code

> 🤓 Make sure you've [git](https://git-scm.com/install/) and [bun](https://bun.com/) installed.

```bash
  git clone https://github.com/ffamilyfriendly/Thread-Watcher.git
  cd Thread-Watcher
  bun install
```

### **2** - Configure

> 🤓 Rename the example `_config.json5` file to `config.json5`. Bot won't start otherwise

```bash
  cd bot
  mv _config.json5 config.json5
```

The [configuration file](./bot/_config.json5) has comments inside it that will guide you thru the configuration itself.

### **3** - Deploy commands

For the quickest start you should deploy all your commands locally. This will register the commands instantly to your dev-server (defined in the config). However, the commands will only show up on this server.

```bash
npm run deploy:dev -w bot
```

For the commands to show up across all servers, you will need to register the commands globally. This takes around an hour, give or take.

```bash
npm run deploy:prod -w bot
```

### **4** - Run the bot!

> 🤓 if you see any weird errors starting the bot, it's likely that you entered incorrect information into the configuration or forgot to install dependencies (`bun install`)

```bash
npm run start -w bot
```

### **(optional) 5** - Run the dashboard

> 🤓 While it's not neccesary for the bot to function, I put a lot of time into it and it would make me happy if you tried it out!

The dashboard has it's own configuration you'll need to fill out. Edit [example.env](/web/example.env), ensuring you have the same `SHARED_API_SECRET` as you set in the bot config. Rename `example.env` to `.env`.

```bash
npm run dev -w web
```

## Modifying Thread-Watcher

You can create a deeper understanding of the inner workings of Thread-Watcher by reading [the documentation](/docs/). It should cover enough for you to get started!<br/>
<small style="opacity:0.7">You are of course welcome to ask me directly about anything in [the support server](https://botsuite.co/join)!</small>

Here's some quick documents to get you started!

- [adding a command](/docs/command.md)
- [adding a database](/docs/database.md)

## 💖 Contributing

> [!NOTE]
> Currently, Thread-Watcher is **not accepting contributions**. I plan to take contributions as soon as I've got the codebase at a solid state and have some tests written. Hang tight and [join the support server](https://botsuite.co/join) for updates <3
