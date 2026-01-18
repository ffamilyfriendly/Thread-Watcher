import z from "zod";

export const ZFilterData = z.object({
  tags: z
    .preprocess(
      (val) => (typeof val === "string" ? val.split(",") : val),
      z.array(z.string()).nullish(),
    )
    .default([]),
  role_whitelist: z
    .preprocess(
      (val) => (typeof val === "string" ? val.split(",") : val),
      z.array(z.string()).nullish(),
    )
    .default([]),
  regex: z
    .union([z.string(), z.instanceof(RegExp), z.null()])
    .default(null)
    .transform((val) => {
      if (!val) return undefined;
      if (val instanceof RegExp) return val;

      try {
        const reg = new RegExp(val.trim());

        (reg as any).toJSON = function () {
          return this.source;
        };
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

export const ZChannelDataWithFilters = ZChannelData.merge(ZFilterData);
export type FilterData = z.output<typeof ZFilterData>;
export type ChannelData = z.output<typeof ZChannelData>;
export type ChannelDataWithFilters = z.output<typeof ZChannelDataWithFilters>;
export const ZEditMonitor = ZChannelDataWithFilters.omit({
  id: true,
  server: true,
});
export type EditMonitor = z.output<typeof ZEditMonitor>;
