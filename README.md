> [!CAUTION]
> This branch is _very_ WIP. Trust nothing and no one. Not even yourself. You might have been replaced. You can never know. Dont trust this branch

# Thread-Watcher V3 🧵

> A Discord bot that keeps threads active, automates bumping, and adds extra utilities for managing your server’s tangled mess of threads.

<p align="center">
  <a href="https://docs.threadwatcher.xyz">
    <img src="https://img.shields.io/badge/docs-4ade80?style=for-the-badge&logo=gitbook&logoColor=white" />
  </a>
  <a href="https://botsuite.co/join">
    <img src="https://img.shields.io/badge/discord-5865F2?style=for-the-badge&logo=discord&logoColor=white" />
  </a>
  <a href="https://botsuite.co">
    <img src="https://img.shields.io/badge/Website-b82ada?style=for-the-badge&logo=firefoxbrowser&logoColor=white" />
  </a>
</p>
<p align="center">
  <img src="https://img.shields.io/badge/status-WIP-critical?style=flat" />
  <img src="https://img.shields.io/github/license/ffamilyfriendly/Thread-Watcher?style=flat" />
  <img src="https://img.shields.io/github/stars/ffamilyfriendly/Thread-Watcher?style=flat" />
  <img src="https://img.shields.io/github/issues/ffamilyfriendly/Thread-Watcher?style=flat" />
</p>

## 🌟 Features (so far)

- auto-bumps threads/posts so they stay active and showing in the sidebar
- i18n system with generation from docs
- shard support
- SQLite by default with more adapters coming

## 🧰 Requirement

- [Redis](https://redis.io/)
- [Bun](https://bun.sh/)
- [Node](https://nodejs.org/en)

## 🚀 Quick Start

1. Clone the repo
2. configure the bot:
   - Edit `bot/_config.json5` and rename it to `config.json5`
   - Set up your database (SQLite by default, more adapters coming... Maybe even [MongoDB](https://github.com/ffamilyfriendly/Thread-Watcher/issues/37))
3. Deploy commands:
   - `cd bot`
   - `npm i`
   - `npm run deploy:dev` (for local commands only)
   - `npm run deploy:prod` (for global commands)
4. Generate i18n from docs:
   - `npm run gen_docs`
5. Start the bot:
   - `npm run start`

## 🤓 Development

> [!NOTE]
> Currently, Thread-Watcher is **not accepting contributions**. Once V3 is stable and deployed this might change.

The codebase is very WIP and a _lot_ is subject to change. I am aiming for a Q4 (2025) or Q1 (2026) release. However, as I'm studying at uni full time things might change. Join the [support server](https://botsuite.co) to stay in the loop!

AI is not used to produce **any** code in this repo. However, I use copilot to generate code docs (because its boring)
