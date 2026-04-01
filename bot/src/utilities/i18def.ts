import { TArgs, type TKey } from '@generated/locales';
import { Interaction } from 'discord.js';
import i18next, { TOptionsBase } from 'i18next';

type CombinedOptions<K extends TKey> = (K extends keyof TArgs ? TArgs[K] : object) & TOptionsBase;

export type TypedI18Func = <K extends TKey>(
  key: K,
  ...options: K extends keyof TArgs ? [options: CombinedOptions<K>] : [options?: CombinedOptions<K>]
) => string;

export function from_interaction(i: Interaction): TypedI18Func {
  return (key, ...options) => {
    return i18next.t(key as string, {
      lng: i.locale,
      ...options[0],
    });
  };
}
