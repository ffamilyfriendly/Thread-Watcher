import { ValueContainer } from '../ValueContainter';

export function interpolate_string(raw_str: string, tree: ValueContainer): string {
  return raw_str.replace(/{{(.+?)}}/gm, (whole_str, variable, ...args) => {
    const variables = ValueContainer.string_into_args(variable);
    const value = tree.get(variables);
    return ValueContainer.value_into_string(value, variable);
  });
}
