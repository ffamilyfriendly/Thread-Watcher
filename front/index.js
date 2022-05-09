console.log(`Hey there console looker! There's nothing of interest here. you look great btw`)

const getCount = () => {
    return new Promise((resolve, reject) => {
        fetch("https://familyfriendly.xyz/stats")
        .then(d => {
            d.json()
            .then(res => {
                resolve(res)
            })
            .catch(e => reject(e))
        })
        .catch(e => reject(e))
    })
}

document.addEventListener("DOMContentLoaded", async () => {
    const c = await getCount()
    document.getElementById("count").innerText = c ? c.guilds : "..."
})