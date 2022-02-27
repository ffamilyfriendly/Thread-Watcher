# Thread-Watcher
discord bot that automatically un-archives threads. No additional fuss
https://familyfriendly.xyz/thread

## Usage
check [commands](https://familyfriendly.xyz/thread)

## Privacy
The bot keeps the thread id and the connected server id in its database. This is required for the bot to work and the data is removed once watch of a channel is toggled off

## My instance
you can add my instance of the bot [here](https://discord.com/oauth2/authorize?client_id=870715447136366662&permissions=274877973504&scope=applications.commands%20bot)

## Support
join my discord server for any support or suggestions. [click here](https://discord.gg/793fagUfmr)

## License
this code is licensed under MIT.

# setup
-   download the source code `git clone https://github.com/ffamilyfriendly/Thread-Watcher.git`
-   get your bot token [here](https://discord.com/developers/applications)
-   rename _config.js to config.js
-   add the token to config.js. You might also want to change ownerid to your discord id
-   select a database in config.js. If you want to keep it simple I recomend sticking with sqlite
-   download all required packages with `npm i`
-   run the bot with `node .`
