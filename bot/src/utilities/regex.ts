export function validRegex(r: string) {
    if(r.trim() === '') return { valid: false, reason: "regex string empty" }
    if(!/^[\w!*]{0,100}$/gm.test(r)) return { valid: false, reason: "invalid regex format" }

    return { valid: true }
}

export function strToRegex(r: string) {
    let inverted = false
    if(r[0] === '!') {
        inverted = true
        r = r.replace('!','')
    }

    return { inverted, regex: new RegExp(r.replace('*', '\\w*'))}
}