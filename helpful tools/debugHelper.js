const Discord = require("discord.js")
const client = new Discord.Client({ intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.DIRECT_MESSAGES], partials: ["CHANNEL"] })
const config = require("../config")

const log = (text) => {
    console.log(`[debugHelper] ${text}`)
}

client.on("ready", () => {
    if(client.guilds.cache.size > 4) {
        log(`ending process. Guild size > 4. Are you using the correct token?`)
    }

    log(`listening for actions as ${client.user.username}`)
})

const allowed = [ "286224826170081290" ]

/**
 * 
 * @param {Discord.Guild} server 
 */
const regCommands = ( server ) => {
    server.commands.set([
        {
            name: "genthreads",
            description: "generates specified amount of threads (might break api rules lol)",
            options: [
                {
                    type: "INTEGER",
                    name: "amount",
                    description: "how many threads to create (max 100)",
                    required: true
                }, 
                {
                    type: "CHANNEL",
                    name: "parent",
                    description: "the channel to create threads in",
                    required: true
                }
            ]
        },
        {
            name: "clearthreads",
            description: "remove all threads from a channel",
            options: [{
                type: "CHANNEL",
                name: "parent",
                description: "the channel to remove all threads from",
                required: true
            }]
        }
    ])
}

/**
 * 
 * @param {Discord.Guild} server 
 */
const deregCommands = ( server ) => {
    server.commands.cache.forEach(cmd => {
        if(cmd.guildId) {
            log(`deleting command ${cmd.name} (${cmd.id})`)
            cmd.delete()
        }
    })
}

client.on("messageCreate", async message => {
    if(message.channel.type != "DM" || !allowed.includes(message.author.id)) return

    const [ action, serverID ] = message.content.split(" ")

    const server = await client.guilds.cache.get(serverID)

    if(!server) return message.reply(`cannot get run ${action} on server with id ${serverID}`)
    else if(!allowed.includes(server.ownerId)) return message.reply(`sorry no can do. That server is not owned by anyone associated with this instance of thread watcher`)

    switch (action) {
        case "reg":
            regCommands(server)
            message.reply("(reg) ok. done")
        break;

        case "dereg":
            deregCommands(server)
            message.reply("(dereg) ok. done")
        break;

        default:
            message.reply(`"${action}" is not an allowed action. Allowed: \`reg\|dereg\``)
        break;
    }
})

const clamp = (num, min, max) => Math.min(Math.max(num, min), max);

/**
 * 
 * @param {Discord.CommandInteraction} interaction 
 */
const doCommand = async ( interaction ) => {
    await interaction.deferReply()
    const parent = interaction.options.getChannel("parent")
    switch(interaction.commandName) {
        case "genthreads":
            const amount = interaction.options.getInteger("amount")
            for(let i = 0; i < clamp(amount, 0, 100); i++) {
                await parent.threads.create({
                    name: `debug${i}`,
                    reason: "debug"
                })
            }

            interaction.editReply({ content: "did thing" })
        break;
        case "clearthreads":
            parent.threads.cache.forEach(t => t.delete())
            interaction.editReply({ content: "did thing" })
        break;
    }
}

client.on("interactionCreate", interaction => {
    if(interaction.isCommand()) doCommand(interaction)
})

client.login(config.token)