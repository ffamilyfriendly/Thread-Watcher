/*
V2 uses some weird "pattern" thing that is turned into a regex at runtime. V3 stores the regex as-is so this is copied over from the V2 codebase
*/

// I've prayed twice to God after typing this but he's not responding. God has abandoned me
const quantifier = '\\p{L}\\p{Emoji_Presentation}><\\(\\)!*\\-\\[\\]\\d';

export function validRegex(r: string) {
  if (!r.trim().length) return { valid: false, reason: 'regex string empty' };
  if (!/^[\p{L}\p{Emoji_Presentation}><\(\)!*\-\[\]\d]{0,100}$/gmu.test(r))
    return { valid: false, reason: 'invalid regex format' };

  return { valid: true };
}

export function strToRegex(r: string) {
  let inverted = false;
  if (r[0] === '!') {
    inverted = true;
    r = r.replace('!', '');
  }
  r = r.replace(/(\]|\[|\)|\()/g, '\\$1').replace(/\*{1,}/g, `[${quantifier}]*`);

  const pattern = inverted
    ? `^(?!.*${r})` // negative lookahead — matches anything that does NOT contain the pattern
    : `^${r}$`;

  return { inverted, regex: new RegExp(pattern, 'gmu') };
}
