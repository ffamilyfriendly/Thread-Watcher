import { Database, LibraryEntryInsertion, LibraryFileChunkInsertion } from '#/interfaces/Database';
import RedisWrapper from '#/utilities/redis';
import Redis from 'ioredis';
import AiService from './AiService';
import z from 'zod';
import { err, ok } from 'neverthrow';
import { FileChunk, LibraryEntry } from '@watcher/shared';
import { get_safe_error } from '#/utilities/error/escape_sensitive_data';
import EntitlementService from '../EntitlementService';
import { config } from '@providers/config';

function euclidean_distance(v1: number[], v2: number[]) {
  if (v1.length !== v2.length) return err(new Error('vector arrays are of different lengths'));
  return ok(Math.hypot(...v1.map((k, idx) => v2[idx] - k)));
}

interface SimFileChunk extends FileChunk {
  distance: number;
}

export default class LibraryService {
  static readonly CACHE_TTL_SECONDS = 90;
  private _ai?: AiService;

  private r: RedisWrapper;
  constructor(
    private db: Database,
    redis: Redis,
    private entitlements: EntitlementService,
  ) {
    this.r = new RedisWrapper(redis, LibraryService.CACHE_TTL_SECONDS, 'library');
  }

  set ai(service: AiService) {
    this._ai = service;
  }

  async get_library_files(guild_id: string) {
    return this.db.get_library_entries(guild_id);
  }

  async get_chunk_count(guild_id: string) {
    return this.r.get_cached_or([guild_id, 'chunk_count'], z.number(), async () => {
      return this.db.count_library_chunks(guild_id);
    });
  }

  async delete_file(guild_id: string, file_id: string) {
    const delete_worked = await this.db.delete_library_entry(file_id, guild_id);

    if (delete_worked.isOk()) {
      await this.r.del([guild_id, 'chunk_count']);
    }

    return delete_worked;
  }

  async find_close_matches(guild_id: string, embedded_query: number[], limit?: number) {
    const chunks = await this.db.get_library_chunks(guild_id);
    if (chunks.isErr()) return chunks;
    const { value } = chunks;

    const similarity_arr: SimFileChunk[] = value
      .map((ch) => ({
        ...ch,
        distance: euclidean_distance(embedded_query, ch.vector).unwrapOr(Infinity),
      }))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    return ok(similarity_arr);
  }

  async get_usage(guild_id: string) {
    const [premium, chunks] = await Promise.all([
      this.entitlements.has_premium(guild_id),
      this.get_chunk_count(guild_id),
    ]);

    if (premium.isErr()) return err(premium.error);
    if (chunks.isErr()) return err(chunks.error);

    const guild_is_premium = premium.value;
    const guild_chunk_count = chunks.value;

    const max_chunks_allowed_for_guild = guild_is_premium
      ? config.ai.premium_tier_library_chunks
      : config.ai.free_tier_library_chunks;

    return ok({
      chunks_used: guild_chunk_count,
      usage: guild_chunk_count / max_chunks_allowed_for_guild,
      can_add_more: max_chunks_allowed_for_guild > guild_chunk_count,
    });
  }

  async can_create_file(guild_id: string) {
    const usage = await this.get_usage(guild_id);
    if (usage.isErr()) return err(usage.error);
    return ok(usage.value.can_add_more);
  }

  async create_file(guild_id: string) {
    const can_create_file = await this.can_create_file(guild_id);
    if (can_create_file.isErr()) return can_create_file;
    if (!can_create_file.value) return err(new Error('This guild has too many chunks!'));
    if (!this._ai) return err(new Error('no AiService provided to LibraryService!'));

    return ok(new FileUploader(this.db, guild_id, this._ai, this));
  }

  async clear_cache(guild_id: string) {
    return this.r.del([guild_id, 'chunk_count']);
  }
}

class FileUploader {
  file_id?: string;
  is_open: boolean = false;
  private chunk_queue: { idx: number; content: string }[] = [];
  private chunk_idx: number = 0;
  private timeout_ins?: NodeJS.Timeout;
  private library_entry?: LibraryEntry;
  static timeout_collection_ms = 500;
  static max_allowed_queue_size = 20;

  constructor(
    private db: Database,
    private guild_id: string,
    private ai: AiService,
    private libservice: LibraryService,
  ) {}

  async open(d: Omit<LibraryEntryInsertion, 'guild_id' | 'error_reason' | 'status'>) {
    if (this.is_open) return err(new Error('Upload already open'));

    const db_res = await this.db.create_library_entry({
      ...d,
      status: 'processing',
      guild_id: this.guild_id,
      error_reason: null,
    });

    if (db_res.isOk()) {
      this.is_open = true;
      this.file_id = db_res.value.file_id;

      this.library_entry = {
        ...d,
        status: 'processing',
        guild_id: this.guild_id,
        error_reason: null,
        file_id: db_res.value.file_id,
        created_at: new Date(),
        upload_type: 'upload',
      };
    }

    return db_res;
  }

  private chk_actionable() {
    if (!this.file_id) return err(new Error('No file_id for upload'));
    if (!this.is_open) return err(new Error('Upload already completed'));
    return ok();
  }

  private should_handle_queue() {
    if (this.timeout_ins) clearTimeout(this.timeout_ins);
    if (this.chunk_queue.length > FileUploader.max_allowed_queue_size) this.handle_queue();
    else
      this.timeout_ins = setTimeout(() => this.handle_queue(), FileUploader.timeout_collection_ms);
  }

  add_chunk(content: string) {
    const s = this.chk_actionable();
    if (s.isErr()) return s;
    this.chunk_queue.push({ content, idx: this.chunk_idx });
    this.chunk_idx += 1;
    this.should_handle_queue();
    return ok();
  }

  async handle_queue() {
    if (this.chunk_queue.length === 0) return ok([]);
    const batch = [...this.chunk_queue];
    this.chunk_queue = [];
    const text_content = batch.map((r) => r.content);
    const embed_res = await this.ai.embed_text(text_content);
    if (embed_res.isErr()) return embed_res;

    let chunk_insertions: LibraryFileChunkInsertion[] = [];

    for (let i = 0; i < embed_res.value.data.length; i++) {
      const vector = embed_res.value.data[i];
      const entry = batch[i];
      const apprx_token_usage =
        (embed_res.value.usage.totalTokens ?? 0) / embed_res.value.data.length;
      if (!vector.embedding) continue;

      chunk_insertions.push({
        vector: vector.embedding,
        file_id: this.file_id!,
        guild_id: this.guild_id,
        chunk_idx: entry.idx,
        content: entry.content,
        embedding_model: this.ai.embedding_model,
        token_count: apprx_token_usage,
      });
    }

    const res = await this.db.create_library_chunks(chunk_insertions);

    if (res.isOk()) {
      await this.libservice.clear_cache(this.guild_id);
    }

    return res;
  }

  async done() {
    const s = this.chk_actionable();
    if (s.isErr()) return s;

    if (this.timeout_ins) {
      clearTimeout(this.timeout_ins);
      const r = await this.handle_queue();
      if (r.isErr()) return r;
    }

    const db_res = await this.db.update_library_entry(this.file_id!, this.guild_id, {
      status: 'completed',
    });

    if (db_res.isOk()) {
      this.is_open = false;
      return ok(this.library_entry!);
    }

    return db_res;
  }

  async error(err: Error | string) {
    const s = this.chk_actionable();
    if (s.isErr()) return s;
    const error_msg = err instanceof Error ? get_safe_error(err).message : err;

    const db_res = await this.db.update_library_entry(this.file_id!, this.guild_id, {
      status: 'error',
      error_reason: error_msg,
    });

    if (db_res.isOk()) this.is_open = false;

    return db_res;
  }
}
