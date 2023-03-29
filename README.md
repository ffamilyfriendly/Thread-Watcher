# Thread Watcher

> **Thread-Watcher** is a simple to use discord bot dedicated to keeping discord threads un-archived. The bot was created as a proof of concept in early fall 2021 but has since amassed a steady user base of over 4000 servers. The bot is written using [typescript](https://www.typescriptlang.org/) and runs on the [nodejs](https://nodejs.org/en/) runtime with the [discord.js](https://discord.js.org/#/) library providing an easy way to interact with the discord API.

<div align="center">
	<a href="https://threadwatcher.xyz"><img src="https://img.shields.io/badge/Website-informational?style=for-the-badge" alt="support server" /></a>
	&emsp;
	<a href="https://threadwatcher.xyz/invite"><img src="https://img.shields.io/badge/Invite the official bot-informational?style=for-the-badge" alt="support server" /></a>
	&emsp;
	<a href="https://threadwatcher.xyz/devserver"><img src="https://img.shields.io/badge/Support%20Server-informational?style=for-the-badge" alt="support server" /></a>
    &emsp;
    <a href="https://threadwatcher.xyz/donate"><img src="https://img.shields.io/badge/Donations-informational?style=for-the-badge" alt="support server" /></a>
    <!-- Did I steal this directly from https://github.com/MarcusOtter/discord-needle/blob/main/README.md? Perhaps-->
</div>

<div align="center">

[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/H2H03SLYD)

</div>

## Docker
This bot includes Docker and Docker Compose support. To build a docker image that will run Thread Watcher upon start (and automatically register the slash commands), use the following command inside the folder you've cloned the repo: 
> docker build -t thread-watcher bot/

To run the resulting docker image, use the following command:
> docker run --name thread-watcher -d thread-watcher

Alternatively, if you'd prefer to use Docker Compose, you can use the included docker-compose.yml directly by using the following command inside the folder you've cloned the repo:
> docker-compose up -d

## License
The code for the bot and website are both licensed under the [MIT license](https://github.com/ffamilyfriendly/Thread-Watcher/blob/main/LICENSE.md).
