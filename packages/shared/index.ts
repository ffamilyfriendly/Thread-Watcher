import z from "zod";

export * from "./schemas/monitor";
export * from "./schemas/thread";
export * from "./schemas/guild";
export * from "./schemas/audit";
export * from "./schemas/ai";
export * from "./schemas/tickets/ticket";
export * from "./tickets/ticket_outputs";
export * from "./constraints";
export * from "./schemas/api_routes";
export * from "./tickets/contracts";
export * from "./schemas/topgg";

/*
code: 400,
        message: 'could not parse params',
        _details: filter_props_res.error,
*/

export const ZAPIError = z.object({
  code: z.number(),
  message: z.string(),
  _details: z.any().nullish(),
});
