import { ChatInputCommandInteraction, EmbedBuilder, PermissionFlagsBits, PrivateThreadChannel, PublicThreadChannel, SlashCommandBuilder, ThreadChannel } from "discord.js";
import { addThread, dueArchiveTimestamp, removeThread, setArchive } from "../../utilities/threadActions";
import { Command, statusType } from "../../interfaces/command";
import { threads } from "../../bot";
import config from "../../config";

const info: Command = {
    run: async (interaction: ChatInputCommandInteraction, buildBaseEmbed) => {
        const embeds: EmbedBuilder[] = [ ]

        await interaction.deferReply({ ephemeral: true })

        const botInfo = async () => {
            const getGuildCount = () => {
                return new Promise((resolve, reject) => {
                    interaction.client.shard?.fetchClientValues("guilds.cache.size")
                        .then(results => {

                            if(!(results instanceof Array<number>)) return

                            let guildCount: number = 0
                            for(const item of results) {
                                if(typeof item === "number") guildCount += item
                            }

                            resolve(guildCount)
                        })
                })
            }

            let gc = await getGuildCount()

            let guildCount: number = 0
            if(typeof gc !== "number") guildCount = 0
            else guildCount = gc

            const processStarted = Math.floor((Date.now() / 1000) - process.uptime())

            const e = buildBaseEmbed(`About ${interaction.client.user.tag}`, statusType.info, {
                fields: [
                    {
                        name: "Stats",
                        value: `🤙  Bot is in \`${guildCount}\` servers\n👁 Bot is watching \`${threads.size}\` threads in this shard\n🤓 Average threads watched per server in this shard is \`${(threads.size / interaction.client.guilds.cache.size).toFixed(2)}\` threads`
                    },
                    {
                        name: "Shard",
                        value: `🥛  You are in shard \`${interaction.guild?.shardId}\`\n👲  There are \`${interaction.client.guilds.cache.size}\` guilds in this shard\n⏱ This shard started <t:${processStarted}:R>`
                    },
                    {
                        name: "🚑 Get support",
                        value: `To get help with this instance of thread-watcher you can join the [**support server**](${config.devServerInvite})`
                    }
                ],
                ephermal: true,
                noSend: true
            })
            embeds.push(e)
        }

        const botDevelopment = () => {
            const e = buildBaseEmbed(`About the development`, statusType.info, {
                fields: [
                    {
                        name: "Source code",
                        value: "Thread-Watcher is fully open source. You can view the source code [here](https://github.com/ffamilyfriendly/Thread-Watcher/) and get help with self-hosting the bot [in the wiki](https://github.com/ffamilyfriendly/Thread-Watcher/wiki/Hosting)"
                    },
                    {
                        name: "Credits",
                        value: `[Thread-Watcher](https://threadwathcer.xyz) is being developed by [**Family friendly#6191**](https://familyfriendly.xyz) using the [discord.js](https://discord.js.org/#/) library.\nIt uses the libraries [better-sqlite3](https://www.npmjs.com/package/better-sqlite3) by [**Joshua Wise**](https://github.com/JoshuaWise) and [mysql](https://www.npmjs.com/package/mysql) created by [**the contributors of mysqljs/mysql**](https://github.com/mysqljs/mysql/graphs/contributors) to store data.\nIt also uses the logging library [log75](https://www.npmjs.com/package/log75) created by [**wait what**](https://waitwhat.sh/)`
                    },
                    {
                        name: "Donations",
                        value: "Want to help keep Thread-Watcher free? You can find ways to donate [here](https://threadwatcher.xyz/donate)"
                    }
                ],
                ephermal: true,
                noSend: true
            })

            embeds.push(e)
        }

        await botInfo()
        await botDevelopment()

        interaction.editReply({ embeds: embeds })
    },
    data: new SlashCommandBuilder()
        .setName("info")
        .setDescription("get information about the bot")
}

export default info