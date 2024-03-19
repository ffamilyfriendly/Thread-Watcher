const API_BASE = "https://threadwatcher.xyz/api"

const searchShard = async() => {

    const err = document.getElementById("search_error")
    err.classList = "hide"

    const showError = (text, classList = "error") => {
        err.classList = classList
        err.innerHTML = text
    }

    const shard = document.getElementById("search_shard").value
    if(!shard || shard.length > 20 || shard.length < 17 || !shard.match(/^\d+$/gi)) return showError("Not a valid discord guild id")

    const catchErr = (e) => {
        showError(e)
    }
    const res = await (await fetch(`${API_BASE}/getShard?guild=${shard}`).catch(catchErr)).json().catch(catchErr)
    if(res && !res.found) return showError('That guild does not use Thread-Watcher. <a href="https://threadwatcher.xyz/invite">Click here to invite</a>')
    showError(`Shard found! That guild is on shard <b>${res.shard}</b>`, "success")
}

const icons = {
    "back": "m10.978 14.999v3.251c0 .412-.335.75-.752.75-.188 0-.375-.071-.518-.206-1.775-1.685-4.945-4.692-6.396-6.069-.2-.189-.312-.452-.312-.725 0-.274.112-.536.312-.725 1.451-1.377 4.621-4.385 6.396-6.068.143-.136.33-.207.518-.207.417 0 .752.337.752.75v3.251h9.02c.531 0 1.002.47 1.002 1v3.998c0 .53-.471 1-1.002 1z",
    "github": "M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z",
    "heart": "M18 1l-6 4-6-4-6 5v7l12 10 12-10v-7z",
    "invite": "m20 20h-15.25c-.414 0-.75.336-.75.75s.336.75.75.75h15.75c.53 0 1-.47 1-1v-15.75c0-.414-.336-.75-.75-.75s-.75.336-.75.75zm-1-17c0-.478-.379-1-1-1h-15c-.62 0-1 .519-1 1v15c0 .621.52 1 1 1h15c.478 0 1-.379 1-1zm-9.25 6.75v-3c0-.414.336-.75.75-.75s.75.336.75.75v3h3c.414 0 .75.336.75.75s-.336.75-.75.75h-3v3c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-3h-3c-.414 0-.75-.336-.75-.75s.336-.75.75-.75z",
    "search": "M23.822 20.88l-6.353-6.354c.93-1.465 1.467-3.2 1.467-5.059.001-5.219-4.247-9.467-9.468-9.467s-9.468 4.248-9.468 9.468c0 5.221 4.247 9.469 9.468 9.469 1.768 0 3.421-.487 4.839-1.333l6.396 6.396 3.119-3.12zm-20.294-11.412c0-3.273 2.665-5.938 5.939-5.938 3.275 0 5.94 2.664 5.94 5.938 0 3.275-2.665 5.939-5.94 5.939-3.274 0-5.939-2.664-5.939-5.939z",
    "guild": "M24 24h-24v-2h1v-7c0-.552-.448-1-1-1v-5h2v2h2v-2h2v4h1v-7h2v2h2v-8l5 2-4 2v2h1v2h2v-2h2v7h1v-4h2v2h2v-2h2v5h-.001c-.552 0-.999.447-.999.999v7.001h1v2zm-10-1v-4c0-1.104-.896-2-2-2s-2 .896-2 2v4h4zm-9-5v-2c0-.552-.448-1-1-1s-1 .448-1 1v2h2zm16 0v-2c0-.552-.448-1-1-1s-1 .448-1 1v2h2zm-8-4v-2c0-.552-.448-1-1-1s-1 .448-1 1v2h2z",
    "users": "M10.644 17.08c2.866-.662 4.539-1.241 3.246-3.682-3.932-7.427-1.042-11.398 3.111-11.398 4.235 0 7.054 4.124 3.11 11.398-1.332 2.455.437 3.034 3.242 3.682 2.483.574 2.647 1.787 2.647 3.889v1.031h-18c0-2.745-.22-4.258 2.644-4.92zm-12.644 4.92h7.809c-.035-8.177 3.436-5.313 3.436-11.127 0-2.511-1.639-3.873-3.748-3.873-3.115 0-5.282 2.979-2.333 8.549.969 1.83-1.031 2.265-3.181 2.761-1.862.43-1.983 1.34-1.983 2.917v.773z",
    "watch": "m11.998 5c-4.078 0-7.742 3.093-9.853 6.483-.096.159-.145.338-.145.517s.048.358.144.517c2.112 3.39 5.776 6.483 9.854 6.483 4.143 0 7.796-3.09 9.864-6.493.092-.156.138-.332.138-.507s-.046-.351-.138-.507c-2.068-3.403-5.721-6.493-9.864-6.493zm.002 3c2.208 0 4 1.792 4 4s-1.792 4-4 4-4-1.792-4-4 1.792-4 4-4zm0 1.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5z",
    "vote": "M5 22h-5v-12h5v12zm17.615-8.412c-.857-.115-.578-.734.031-.922.521-.16 1.354-.5 1.354-1.51 0-.672-.5-1.562-2.271-1.49-1.228.05-3.666-.198-4.979-.885.906-3.656.688-8.781-1.688-8.781-1.594 0-1.896 1.807-2.375 3.469-1.221 4.242-3.312 6.017-5.687 6.885v10.878c4.382.701 6.345 2.768 10.505 2.768 3.198 0 4.852-1.735 4.852-2.666 0-.335-.272-.573-.96-.626-.811-.062-.734-.812.031-.953 1.268-.234 1.826-.914 1.826-1.543 0-.529-.396-1.022-1.098-1.181-.837-.189-.664-.757.031-.812 1.133-.09 1.688-.764 1.688-1.41 0-.565-.424-1.109-1.26-1.221z"
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

    const guildCount = document.getElementById("guilds_number")
    const threadCount = document.getElementById("threads_number")
    const votesCount = document.getElementById("votes_number")
    guildCount.innerText = `${(data.guildCount / 1000).toFixed(1)}k`
    threadCount.innerText = `${(data.threads / 1000).toFixed(1)}k`
    votesCount.innerText = data.votes

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
            let str = ""

            if(Math.floor(DAYS_DIV) !== 0) str = `${DAYS_DIV.toFixed(1)} days`
            else if (Math.floor(HOURS_DIV) !== 0) str = `${HOURS_DIV.toFixed(1)} hours`
            else str = `${MINUTES_DIV.toFixed(1)} minutes`

            return str
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

const checkTestimonials = (el) => {
    const isScrollable = el.scrollHeight > el.clientHeight

    if(!isScrollable) {
        console.log("not scrollable")
        el.classList.remove("top-overflow", "bottom-overflow")
        return
    }

    const isScrolledToBottom = el.scrollHeight <= el.clientHeight + el.scrollTop;
    const isScrolledToTop = isScrolledToBottom ? false : el.scrollTop === 0;
    el.classList.toggle('top-overflow', !isScrolledToBottom);
    el.classList.toggle('bottom-overflow', !isScrolledToTop);
}

document.addEventListener("DOMContentLoaded", () => {
    handleIcons()
    handleStats()
    checkTestimonials(document.querySelector(".testimonials"))
    document.querySelector(".testimonials").addEventListener("scroll", (event) => {
        console.log("yes")
        checkTestimonials(event.currentTarget)
    })
})