import z from "zod";

export const ZLibraryEntryBase = z.object({
  file_id: z.string(),
  uploader_discord_id: z.string(),
  guild_id: z.string(),
  filename: z.string(),
  filetype: z.string(),
  status: z.enum(["processing", "completed", "error"]),
  error_reason: z.string().nullable(),
  created_at: z.coerce.date(),
  content_hash: z.string(),
});

export const ZLibraryFileUpload = ZLibraryEntryBase.extend({
  upload_type: z.literal("upload"),
});

export const ZLibraryWebUpload = ZLibraryEntryBase.extend({
  upload_type: z.literal("website"),
  upload_src: z.httpUrl(),
  last_index: z.coerce.date(),
});

export const ZLibraryEntry = z.discriminatedUnion("upload_type", [
  ZLibraryFileUpload,
  ZLibraryWebUpload,
]);

export type LibraryEntry = z.output<typeof ZLibraryEntry>;

export const ZFileChunk = z.object({
  chunk_id: z.string(),
  file_id: z.string(),
  guild_id: z.string(), // Denormalized for performance. Should be fine
  chunk_idx: z.int().nonnegative(),
  content: z.string(),
  vector: z.array(z.number()),
  embedding_model: z.string(),
  token_count: z.int().nonnegative(),
});

export type FileChunk = z.output<typeof ZFileChunk>;
