import z from "zod";

export const ZAiRegexResponse = z.object({
  prompt: z.string(),
});
