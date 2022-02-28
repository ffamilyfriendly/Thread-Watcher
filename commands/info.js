const { CommandInteraction, MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');

const ge = () => {
    let embed = new MessageEmbed()
        .setColor("BLURPLE")
        .setFooter("also check out familyfriendly.xyz/thread !")
    
    return embed
}

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 */
const run = (client, interaction, respond) => {
    const page = interaction.options.getString("section")
    const pages = {
        stats: () => {
            const threads = require("../index").threads.size
            const e = ge()
            e.addField("stats", `**Servers:** ${client.guilds.cache.size}\n**Threads:** ${threads}\n**Avg threads/server:** ${(threads / client.guilds.cache.size).toFixed(1)}`)
            return e
        },
        contributing: () => {
            const e = ge()
            e.addField("Source Code", `**Repo:** [click here](https://github.com/ffamilyfriendly/Thread-Watcher)\n**Report Issues:** [click here](https://github.com/ffamilyfriendly/Thread-Watcher/issues/new?assignees=ffamilyfriendly&labels=bug&template=bug_report.md&title=)\n**Feature Request:** [click here](https://github.com/ffamilyfriendly/Thread-Watcher/issues/new?assignees=&labels=enhancement&template=feature_request.md&title=)`)
            return e
        },
        getsupport: () => {
            const e = ge()
            e.addField("Command List", "**Website:** [click here](https://familyfriendly.xyz/thread)")
            e.addField("Support Server", "**Invite:** [click here](https://discord.gg/v65XFrawdn)")
            return e
        },
        supportme: () => {
            const e = ge()
            e.setColor("DARK_AQUA")
            e.addField("Supporting Source", "to support the code itself - check out the contributing section :)")
            e.addField("Support Me Directly", "if you want to support me directly I have a ko-fi page linked below. Please only donate if you really want to! The bot is hosted without any issues in regards to money\n\n*the bot will **never** contain any locked or premium features*")
            e.addField("Support This Instance", "you can help the bot get more traction by upvoting it's page on [top.gg](https://top.gg/bot/870715447136366662)! A review would also be very appreciated :)")
            return e
        }
    }

    const components = new MessageActionRow()

    //invite
    const invite = new MessageButton()
    invite.setEmoji("🤖")
    invite.setStyle("LINK")
    invite.setLabel("Invite Thread Watcher")
    invite.setURL("https://discord.com/oauth2/authorize?client_id=870715447136366662&permissions=274877973504&scope=applications.commands%20bot")
    
    //support server
    const support = new MessageButton()
    support.setEmoji("🚑")
    support.setStyle("LINK")
    support.setLabel("Support Server")
    support.setURL("https://discord.gg/v65XFrawdn")

    //website
    const website = new MessageButton()
    website.setEmoji("🌎")
    website.setStyle("LINK")
    website.setLabel("Website")
    website.setURL("https://familyfriendly.xyz/thread")

    //kofi
    const kofi = new MessageButton()
    kofi.setEmoji("💜")
    kofi.setStyle("LINK")
    kofi.setLabel("Donate")
    kofi.setURL("https://ko-fi.com/ffamilyfriendly")
    
    components.addComponents(invite, support, website, kofi)
    interaction.reply({ embeds: [ pages[page]() ], components: [components], ephemeral: true })
}

const data = {
  name:"info",
  description: "some general information about the bot!",
  options: [
      {
          type: 3,
          name: "section",
          required: true,
          description: "select what information you want",
          choices: [
              {
                  name: "📈 Bot Stats",
                  value: "stats",
              }, 
              {
                  name: "🤓 how to contribute to thread watcher",
                  value: "contributing"
              },
              {
                  name: "🚑 get support with thread watcher",
                  value: "getsupport"
              },
              {
                  name: "❤️ supporting the development",
                  value: "supportme"
              }
          ]
      }
  ]
}

module.exports = { run, data };
