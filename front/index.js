document.addEventListener("DOMContentLoaded", () => {
    fetch("http://localhost:3000/stats").then( res => res.json() )
    .then(data => {
        if(!data) return
        document.getElementById("servers").innerText = data.guilds
        document.getElementById("threads").innerText = data.threads
    })
})