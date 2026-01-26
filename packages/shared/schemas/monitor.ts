import z from "zod";

function str_to_arr(val: unknown) {
  if (typeof val === "string") {
    if (val.trim().length === 0) return [];
    else return val.split(",");
  }
  return val;
}

function attach_regex_serialise(r: RegExp) {
  (r as any).toJSON = function () {
    return this.source;
  };

  return r;
}

export const ZFilterData = z.object({
  tags: z.preprocess(str_to_arr, z.array(z.string()).nullish()).default([]),
  role_whitelist: z
    .preprocess(str_to_arr, z.array(z.string()).nullish())
    .default([]),
  regex: z
    .union([z.string(), z.instanceof(RegExp), z.null()])
    .default(null)
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof RegExp) return attach_regex_serialise(val);

      try {
        const reg = new RegExp(val.trim());

        attach_regex_serialise(reg);
        return reg;
      } catch {
        return undefined;
      }
    }),
});

export const ZChannelData = z.object({
  id: z.string(),
  server: z.string(),
  is_suspended: z.coerce.boolean(),
});

export const ZChannelDataWithFilters = ZChannelData.extend(ZFilterData.shape);
export type FilterData = z.output<typeof ZFilterData>;
export type ChannelData = z.output<typeof ZChannelData>;
export type ChannelDataWithFilters = z.output<typeof ZChannelDataWithFilters>;
export const ZEditMonitor = ZChannelDataWithFilters.omit({
  id: true,
  server: true,
}).partial();
export type EditMonitor = z.output<typeof ZEditMonitor>;
