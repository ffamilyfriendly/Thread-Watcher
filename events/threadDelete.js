const { removeThread } = require("../utils/threadActions")

const run = ( client ) => {
    client.on("threadDelete", (thread) => {
        removeThread(thread.id)
    })
}

module.exports = { run }