const { logger } = require("../utils/clog")
const getText = require("../utils/getText.js")
const Discord = require("discord.js")

const run = ( client ) => {
    client.on('interactionCreate', (interaction) => {
        /**
         * 
         * @param {String} title 
         * @param {String} description 
         * @param {Boolean} show_user 
         * @param {String} color 
         * @param {Boolean} respond 
         * @param {Boolean} ephemeral 
         * @returns {Discord.MessageEmbed}
         */
        const handleBaseEmbed = (title, description, show_user, color, respond, ephemeral) => {
          const embed = new Discord.MessageEmbed();
          embed.setTitle(title);
          embed.setDescription(description);
      
          if (show_user) {
            embed.setAuthor({
              iconURL: interaction.user.displayAvatarURL(),
              name: (interaction.member.nickname === null) ? interaction.user.tag : `${interaction.member.nickname} (${interaction.user.tag})`
            });
          }
      
          embed.setFooter({
            iconURL: client.user.displayAvatarURL(),
            text: client.user.username
          });
      
          embed.setTimestamp();
          embed.setColor(color);
      
          if (respond) {
            if (interaction.deferred) {
              interaction.editReply({
                embeds: [embed]
              });
            }
            else {
              interaction.reply({
                embeds: [embed],
                ephemeral: ephemeral
              });
            }
          }
      
          return embed;
        };
      
        if (!interaction.isCommand()) return;

        if (!client.commands.has(interaction.commandName)) {
          const description = getText('command-not-properly-registered', interaction.locale, {
            command: `/${interaction.commandName}`
          });
      
          const title = getText('interaction-error', interaction.locale);
          handleBaseEmbed(title, description, false, '#dd3333', true, true);
          return;
        }
      
        const cmd = client.commands.get(interaction.commandName);
      
        try {
          cmd.run(client, interaction, handleBaseEmbed);
        }
        catch (err) {
          logger.warn(JSON.stringify(err));
          const description = getText('unknown-error-occurred', interaction.locale);
          const title = getText('interaction-error', interaction.locale);
          handleBaseEmbed(title, description, false, '#dd3333', true, true);
        }
      });
}

module.exports = { run }