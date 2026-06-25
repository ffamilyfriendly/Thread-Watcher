import emojis from '#/.generated/emojis.json';

export type EmojiKey = keyof typeof emojis;

export default function emoji<TEmojiName extends EmojiKey>(name: TEmojiName) {
  const emoji = emojis[name];

  return emoji.animated ? `<a:${name}:${emoji.id}>` : `<:${name}:${emoji.id}>`;
}
