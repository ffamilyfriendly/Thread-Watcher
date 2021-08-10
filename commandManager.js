const config = require("./config.js"),
    fetch = require("node-fetch"),
    readline = require("readline")

const getCommands = () => {
    return new Promise((resolve, reject) => {
        console.log(`https://discord.com/api/v8/applications/${config.applicationId}/commands`)
        fetch(`https://discord.com/api/v8/applications/${config.applicationId}/commands`, {
            headers: [
                ["Authorization", `Bot ${config.token}`],
                ["Content-Type", "application/json"]
            ],
            method: "GET"
        }).then(res => res.json())
        .then(json => {
            resolve(json)
        })
        .catch(err => reject(err))
    })
}

const deleteCommand = (id) => {
    return new Promise((resolve, reject) => {
        fetch(`https://discord.com/api/v8/applications/${config.applicationId}/commands/${id}`, {
            headers: [
                ["Authorization", `Bot ${config.token}`],
                ["Content-Type", "application/json"]
            ],
            method: "DELETE"
        })
        .then(r => { resolve(r) })
        .catch(e => reject(e))
    })
}

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

const manageCommands = async () => {
    console.clear()
    const commands = await getCommands()
    .catch(err => { return console.log(err) })
    console.log(`got ${commands.length} commands`)
    for(command in commands) {
        console.log(`#${command} ${commands[command].name}(${commands[command].id}): ${commands[command].description}`)
    }

    const th = await askQuestion("input # of command to delete (exit to exit): ")
    if(th.toLowerCase() == "exit") return
    if(!commands[th]) return console.log("no such command")
    await deleteCommand(commands[th].id)
    manageCommands()
}

manageCommands()


    