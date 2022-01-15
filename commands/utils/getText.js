const fs = require("fs")
let locale = null;

// Will ensure locale file is cached
const loadLocale = () => {
    if(!locale) locale = JSON.parse(fs.readFileSync("./locale.json"))
}

/**
 * 
 * @param {String} label the label of the text 
 * @param {String} locale the locale you want the string in
 * @param {Object} p any parametrs needed for the string
 */
const getString = (label, loc, p) => {
    loadLocale()
    if(!locale[label]) return Error(`no text registered for label "${label}". Edit locale.json in project root`)
    // sorry yanks
    loc = loc == "en-US" ? "en-GB" : loc
    let text = locale[label][loc] || locale[label]["en-GB"]
    text = text.replaceAll(/{.*?}/gi, (a) => {
        a = a.replace(/{|}/gi, "")
        let t = p ? p[a] : null
        if(typeof t == "undefined") console.warn(`no value passed for parameter "${a}" on string "${label}"`)
        return t ?? a
    })
    return text
}

module.exports = getString