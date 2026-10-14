import { map_err, mapped_err } from '#/utilities/error';
import { TW_LIBRARY_MAX_PDF_PAGES, TW_LIBRARY_MIN_EXTRACTED_CHARS } from '@watcher/shared';
import { Err, err, ok, Result, ResultAsync } from 'neverthrow';
import { extractText, getDocumentProxy } from 'unpdf';

type FileParser = (
  file: Express.Multer.File,
) => Promise<Result<string, Error>> | Result<string, Error>;

export async function pdf_parse(file: Express.Multer.File) {
  const uint8arr = new Uint8Array(file.buffer);

  const pdf = await ResultAsync.fromPromise(getDocumentProxy(uint8arr), map_err);
  if (pdf.isErr()) return mapped_err(pdf.error);

  if (pdf.value.numPages > TW_LIBRARY_MAX_PDF_PAGES)
    return err(
      new Error(`PDF has ${pdf.value.numPages} pages. The limit is ${TW_LIBRARY_MAX_PDF_PAGES}`),
    );

  const parse_res = await ResultAsync.fromPromise(
    extractText(pdf.value, { mergePages: true }),
    map_err,
  );
  if (parse_res.isErr()) return err(parse_res.error);

  await ResultAsync.fromPromise(pdf.value.destroy(), map_err);

  return ok(parse_res.value.text);
}

export async function text_parse(file: Express.Multer.File) {
  return Result.fromThrowable(() => file.buffer.toString('utf8'))().mapErr(map_err);
}

type Kind = 'pdf' | 'text';

function detect_kind(file: Express.Multer.File): Kind | null {
  if (file.buffer.subarray(0, 5).toString('latin1') === '%PDF-') return 'pdf';
  if (file.mimetype === 'text/plain') return 'text';
  return null;
}

const EXTRACTORS: Record<Kind, FileParser> = {
  pdf: pdf_parse,
  text: text_parse,
};

function normalize_text(raw: string): string {
  return raw
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/[\u200B-\u200D\u2060\uFEFF]/g, '')
    .replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export async function parse_file(file: Express.Multer.File) {
  const kind = detect_kind(file);
  if (!kind) return err(new Error('Unsupported file type.'));

  const extracted = await EXTRACTORS[kind](file);
  if (extracted.isErr()) return err(extracted.error);

  if (extracted.value.length < TW_LIBRARY_MIN_EXTRACTED_CHARS)
    return err(new Error('No readable text found.'));

  const text = normalize_text(extracted.value);
  return ok(text);
}

function split_on_string(t: string, sep: string) {
  const parts: string[] = [];
  let from = 0;

  while (from < t.length) {
    const idx = t.indexOf(sep, from);
    if (idx === -1) {
      parts.push(t.slice(from));
      break;
    }

    parts.push(t.slice(from, idx + sep.length));
    from = idx + sep.length;
  }
  return parts;
}

const SENTENCE_END = /(?:[.!?]+["')\]\u201D\u2019]*\s+|[\u3002\uFF01\uFF1F]+["')\]\u201D\u2019]*)/g;

function split_on_sentances(t: string) {
  const parts: string[] = [];
  let from = 0;

  for (const m of t.matchAll(SENTENCE_END)) {
    const end = (m.index ?? 0) + m[0].length;
    if (end <= from) continue;
    parts.push(t.slice(from, end));
    from = end;
  }

  if (from < t.length) parts.push(t.slice(from));
  return parts;
}

function hard_split(t: string, max: number): string[] {
  const parts: string[] = [];
  let from = 0;
  while (from < t.length) {
    let end = Math.min(from + max, t.length);
    if (end < t.length) {
      const prev = t.charCodeAt(end - 1);
      if (prev >= 0xd800 && prev <= 0xdbff) end -= 1;
    }
    if (end <= from) end = from + 1;
    parts.push(t.slice(from, end));
    from = end;
  }
  return parts;
}

function skibbidy(t: string, max: number, level = 0): string[] {
  if (t.length <= max) return [t];
  if (level >= SPLITTERS.length) return hard_split(t, max);

  const parts = SPLITTERS[level](t);
  if (parts.length <= 1) return skibbidy(t, max, level + 1);
  return parts.flatMap((p) => skibbidy(p, max, level + 1));
}

const SPLITTERS: ((text: string) => string[])[] = [
  (t) => split_on_string(t, '\n\n'),
  (t) => split_on_string(t, '\n'),
  split_on_sentances,
  (t) => split_on_string(t, ' '),
];

export interface ChunkOptions {
  chunksize: number;
  overlap: number;
  min_chunk?: number;
}

interface Draft {
  units: string[];
  fresh_from: number;
}

export function chunk_text_content(
  input: string,
  { chunksize, overlap, min_chunk = 100 }: ChunkOptions,
): string[] {
  const max = Math.max(1, chunksize);
  const overlap_budget = Math.min(Math.max(0, overlap), Math.floor(max / 2));

  const text = normalize_text(input);
  if (!text) return [];

  const units = skibbidy(text, max);

  const drafts: Draft[] = [];
  let current: Draft = { units: [], fresh_from: 0 };
  let len = 0;

  for (const unit of units) {
    if (len + unit.length > max && current.units.length > 0) {
      drafts.push(current);

      // Seed the next chunk with whole trailing units that fit in the overlap budget.
      const seed: string[] = [];
      let seed_len = 0;
      for (let i = current.units.length - 1; i >= 0; i--) {
        const u = current.units[i];
        if (seed_len + u.length > overlap_budget) break;
        seed.unshift(u);
        seed_len += u.length;
      }
      if (seed_len + unit.length > max) {
        seed.length = 0;
        seed_len = 0;
      }
      current = { units: seed, fresh_from: seed.length };
      len = seed_len;
    }
    current.units.push(unit);
    len += unit.length;
  }
  if (current.units.length > 0) drafts.push(current);

  // A tiny final chunk makes a poor embedding: fold its new content into the previous chunk.
  if (drafts.length > 1) {
    const last = drafts[drafts.length - 1];
    const fresh = last.units.slice(last.fresh_from);
    if (fresh.join('').trim().length < min_chunk) {
      drafts.pop();
      drafts[drafts.length - 1].units.push(...fresh);
    }
  }

  return drafts.map((d) => d.units.join('').trim()).filter((c) => /[\p{L}\p{N}]/u.test(c));
}
