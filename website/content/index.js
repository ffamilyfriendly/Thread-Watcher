const API_BASE = `http://localhost:3000`

const searchShard = async() => {

    const err = document.getElementById("search_error")
    err.classList = "hide"

    const showError = (text, classList = "error") => {
        err.classList = classList
        err.innerHTML = text
    }

    const shard = document.getElementById("search_shard").value
    if(!shard || shard.length > 20 || shard.length < 17 || !shard.match(/^\d+$/gi)) return showError("Not a valid discord guild id")

    const res = await (await fetch(`${API_BASE}/getShard?guild=${shard}`)).json()
    console.log(res)
    if(res && !res.found) return showError(`That guild does not use Thread-Watcher. <a href="https://threadwatcher.xyz/invite">Click here to invite</a>`)
    showError(`Shard found! That guild is on shard <b>${res.shard}</b>`, "success")
}

const icons = {
    "back": "m10.978 14.999v3.251c0 .412-.335.75-.752.75-.188 0-.375-.071-.518-.206-1.775-1.685-4.945-4.692-6.396-6.069-.2-.189-.312-.452-.312-.725 0-.274.112-.536.312-.725 1.451-1.377 4.621-4.385 6.396-6.068.143-.136.33-.207.518-.207.417 0 .752.337.752.75v3.251h9.02c.531 0 1.002.47 1.002 1v3.998c0 .53-.471 1-1.002 1z",
    "github": "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
    "heart": "M18 1l-6 4-6-4-6 5v7l12 10 12-10v-7z",
    "invite": "m20 20h-15.25c-.414 0-.75.336-.75.75s.336.75.75.75h15.75c.53 0 1-.47 1-1v-15.75c0-.414-.336-.75-.75-.75s-.75.336-.75.75zm-1-17c0-.478-.379-1-1-1h-15c-.62 0-1 .519-1 1v15c0 .621.52 1 1 1h15c.478 0 1-.379 1-1zm-9.25 6.75v-3c0-.414.336-.75.75-.75s.75.336.75.75v3h3c.414 0 .75.336.75.75s-.336.75-.75.75h-3v3c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-3h-3c-.414 0-.75-.336-.75-.75s.336-.75.75-.75z",
    "search": "M23.822 20.88l-6.353-6.354c.93-1.465 1.467-3.2 1.467-5.059.001-5.219-4.247-9.467-9.468-9.467s-9.468 4.248-9.468 9.468c0 5.221 4.247 9.469 9.468 9.469 1.768 0 3.421-.487 4.839-1.333l6.396 6.396 3.119-3.12zm-20.294-11.412c0-3.273 2.665-5.938 5.939-5.938 3.275 0 5.94 2.664 5.94 5.938 0 3.275-2.665 5.939-5.94 5.939-3.274 0-5.939-2.664-5.939-5.939z"
}

const handleIcons = () => {
    document.querySelectorAll("div[aria-type='icon']").forEach(icon => {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
        svg.setAttribute("clip-rule", "evenodd")
        svg.setAttribute("fill-rule", "evenodd")
        svg.setAttribute("stroke-linejoin", "round")
        svg.setAttribute("stroke-miterlimit", "2")
        svg.setAttribute("viewBox", "0 0 24 24")
        svg.setAttribute("xmlns", "http://www.w3.org/2000/svg")

        const pathElement = document.createElementNS("http://www.w3.org/2000/svg", "path")
        const iconName = icon.textContent ? icon.textContent : "back"
        const path = icons[iconName]
        pathElement.setAttribute("d", path)
        pathElement.setAttribute("fill-rule", "nonzero")

        svg.appendChild(pathElement)
        icon.replaceChildren(svg)
    })
}

const handleStats = async () => {
    const data = await (await fetch(`${API_BASE}/stats`)).json()
    if(!data) return

    console.log(data)

    const populateTable = () => {
        const table = document.getElementById("shards_table")

        /**
         * 
         * @param {Number} t 
         */
        const getUptimeText = (t) => {

            const DAYS_DIV = t / 1000 / 60 / 60 / 24
            const HOURS_DIV = t / 1000 / 60 / 60
            const MINUTES_DIV = t / 1000 / 60

            if(Math.floor(DAYS_DIV) !== 0) return `${DAYS_DIV.toFixed(1)} days`
            else if (Math.floor(HOURS_DIV) !== 0) `${HOURS_DIV.toFixed(1)} hours`
            else return `${MINUTES_DIV.toFixed(1)} minutes`
        }

        /**
         * 
         * @param {Number} status 
         */
        const createWsStatus = (status) => {
            const statuses = [
                'Ready',
                'Connecting',
                'Reconnecting',
                'Idle',
                'Nearly',
                'Disconnected',
                'WaitingForGuilds',
                'Identifying',
                'Resuming',
            ]

            return statuses[status] || "Unknown"
        }

        for(const shard of data.shards) {
            const tr = document.createElement("tr")
            const [ id, status, guildCount, uptime ] = [ document.createElement("td"),  document.createElement("td"), document.createElement("td"), document.createElement("td") ]
            id.innerText = shard.id
            status.innerHTML = createWsStatus(shard.status)
            guildCount.innerText = shard.guilds
            uptime.innerText = getUptimeText(shard.uptime)
            tr.append(id, status, guildCount, uptime)
            table.appendChild(tr)
        }
    }
   
    populateTable()
}

document.addEventListener("DOMContentLoaded", () => {
    handleIcons()
    handleStats()
})