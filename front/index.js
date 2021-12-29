const handleInfo = (data, dismissable) => {
    let onDismiss = () => {
        localStorage.setItem("dismissed", data.version)
    }

    let conainter = document.getElementById("infoContainer")
    if(!conainter) {
        conainter = document.createElement("div")
        conainter.id = "infoContainer"
        conainter.innerHTML = "<div id='stackable'></div>"
        document.body.prepend(conainter)
    }

    conainter = document.getElementById("stackable")

    const info = document.createElement("div")
    info.classList = `informational ${data.type}`
    const ico = {
        error: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16.971 0h-9.942l-7.029 7.029v9.941l7.029 7.03h9.941l7.03-7.029v-9.942l-7.029-7.029zm-1.402 16.945l-3.554-3.521-3.518 3.568-1.418-1.418 3.507-3.566-3.586-3.472 1.418-1.417 3.581 3.458 3.539-3.583 1.431 1.431-3.535 3.568 3.566 3.522-1.431 1.43z"/></svg>',
        warning: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24"><path d="M16.971 0h-9.942l-7.029 7.029v9.941l7.029 7.03h9.941l7.03-7.029v-9.942l-7.029-7.029zm-4.971 19.25c-.69 0-1.25-.56-1.25-1.25s.56-1.25 1.25-1.25 1.25.56 1.25 1.25-.56 1.25-1.25 1.25zm.55-4.748c-.029.283-.266.498-.55.498s-.521-.215-.55-.498l-.801-8.01c-.08-.8.55-1.492 1.351-1.492s1.431.692 1.351 1.493l-.801 8.009z"/></svg>',
        info: '<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" fill-rule="evenodd" clip-rule="evenodd"><path d="M12.399 2.276c-.208-.63.264-1.276.919-1.276.405 0 .783.257.918.664l5.691 14.286c.169.509-.106 1.057-.613 1.226-.507.169-1.055-.106-1.224-.614 0 0-3.593-1.203-7.854.211l2.801 4.354c.291.428.088 1.013-.396 1.173l-1.904.634c-.131.044-.267.066-.401.066-.357 0-.705-.152-.951-.429l-3.85-4.247c-2.096.661-4.468-.102-5.26-2.076-.182-.453-.275-.936-.275-1.421 0-1.407.786-2.842 2.492-3.68 8.541-4.194 9.907-8.871 9.907-8.871m6.067.913c1.518.641 2.789 1.865 3.459 3.516.669 1.651.607 3.42-.034 4.94l1.474.626c.415-.985.635-2.053.635-3.141 0-3.167-1.873-6.133-4.911-7.419l-.623 1.478zm-1.064 2.523c.874.368 1.608 1.073 1.992 2.024.386.951.351 1.968-.017 2.843l1.436.61c.524-1.246.576-2.691.028-4.042-.547-1.352-1.588-2.352-2.831-2.877l-.608 1.442z"/></svg>'
    }
    info.innerHTML = `
        <div class="ico-container">${ico[data.type]}</div> <div class="body-container"> <h2>${data.title}</h2> <p>${data.content}</p></div> 
    `
    if(dismissable) {
        const btncontainer = document.createElement("div")
        const btn = document.createElement("button")
        btn.onclick = () => { onDismiss(); info.remove() }
        btn.innerText = "x"
        btncontainer.append(btn)
        info.append(btncontainer)
    }
    conainter.append(info)
}

document.addEventListener("DOMContentLoaded", () => {
    fetch("https://familyfriendly.xyz/stats").then( res => res.json() )
    .then(data => {
        console.log(data)
        if(!data) return
        document.getElementById("SERVERS").innerText = data.guilds
        document.getElementById("THREADS").innerText = data.threads
    })

    fetch(`./updates.json?v=${Date.now()}`).then( res => res.json())
    .then( data => {
        if(data.important) handleInfo(data.important)
        if(data.info && data.info.version > Number(localStorage.getItem("dismissed"))) handleInfo(data.info, true)
    })
})