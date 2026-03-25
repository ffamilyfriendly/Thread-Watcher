import z from "zod";
import * as constant from "./constants";

export const ZMessagesSearchFilters = z.object({
  before_id: z.string().nullish(),
  limit: z.coerce.number().max(constant.TW_MAX_MESSAGES_FETCHED).default(50),
});
export type MessagesSeachFilter = z.output<typeof ZMessagesSearchFilters>;
