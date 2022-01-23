const { default: Log75, LogLevel } = require("log75")
const logger = new Log75(LogLevel.Debug, { color: true })

// I'll let this stay so I dont have to refractor a lot of code
const log = (msg, additional) => {
    const now = new Date()
    logger.info(`[${now.toDateString()} ${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}s ${additional ? `/ ${additional}`:""}] ${msg}`)
}

module.exports = { log, logger }