const db = require('../index').db;
const { CommandInteraction } = require('discord.js');

/**
 * 
 * @param {*} client 
 * @param {CommandInteraction} interaction 
 * @param {*} respond 
 */
const run = (client, interaction, respond) => {
  let threadsList = db.prepare('SELECT * FROM threads WHERE server = ?').all(interaction.guildId);
  respond('Threads the bot is watching', `${threadsList.map(t => `<#${t.id}>`).join(", ")}`.substring(0, 2000) || 'no threads are being watched', '#008000', true);
}

module.exports = { run };
