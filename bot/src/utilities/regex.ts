// I've prayed twice to God after typing this but he's not responding. God has abandoned me
const quantifier = "\\p{L}\\p{Emoji_Presentation}><\\(\\)!*\\-\\[\\]\\d"

export function validRegex(r: string) {
    if(r.trim() === '') return { valid: false, reason: "regex string empty" }
    if(!/^[\p{L}\p{Emoji_Presentation}><\(\)!*\-\[\]\d]{0,100}$/gmu.test(r)) return { valid: false, reason: "invalid regex format" }

    return { valid: true }
}

export function strToRegex(r: string) {
    r = r.replace(/(\]|\[|\)|\()/gi, "\\$1")
    r = r.replace(/\*+/gi, "*")

    r = "^" + r + "$"
    let inverted = false
    if(r[0] === '!') {
        inverted = true
        r = r.replace('!','')
    }

    r = r.replaceAll('*', `[${quantifier}]*`)

    return { inverted, regex: new RegExp(r, "gmu")}
}