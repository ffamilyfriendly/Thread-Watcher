const conf = require("../../config"),
    { logger } = require("../clog"),
    example = require("./example")

    /**
     * 
     * @returns {example}
     */
module.exports = ( ) => {
    try {
        const mod = require(`./${conf.database.use}.js`)
        const db = new mod(conf.database.connectionOptions)

        let missingFunctions = []
        const modFuncs = Object.getOwnPropertyNames(mod.prototype)
        for(let reqFunc of Object.getOwnPropertyNames(example.prototype)) {
            if(!modFuncs.includes(reqFunc)) missingFunctions.push(reqFunc)
        }

        if(missingFunctions.length > 0) {
            logger.error(`${conf.database.use} implementation lacks required functions: ${missingFunctions.map(f => `\n-${f}`)}`)
            logger.info(`to fix above, add the required functions to /utils/db/${conf.database.use}.js`)
            process.exit(1)
        }
        return db
    } catch(err) {
        logger.error(`failed to get a database implementation with name ${conf.database.use}.`)
        process.exit(1)
    }
}