const fs = require("fs")

// get all event modules and return them in an array
module.exports = () => fs.readdirSync("./events").filter(f => f.endsWith(".js")).map(f => require(`../events/${f}`))