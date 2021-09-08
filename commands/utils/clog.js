const log = (msg, additional) => {
    const now = new Date()
    console.log(`[${now.toDateString()} ${now.getHours()}h${now.getMinutes()}m${now.getSeconds()}s ${additional ? `/ ${additional}`:""}] ${msg}`)
}

module.exports = { log }