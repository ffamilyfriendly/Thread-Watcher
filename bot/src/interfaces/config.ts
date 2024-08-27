/* eslint-disable @typescript-eslint/no-explicit-any */
export interface ConfigValue {
  validate: (value: any) => boolean;
  matchKeys: string[];
  default?: any;
  defaultOnInvalid?: boolean;
}
