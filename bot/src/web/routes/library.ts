import e, { Router } from 'express';
import { RouteFile } from '#/interfaces/Web';
import { err, ok } from 'neverthrow';
import { enforce_policy } from '#/web/auth/auth';
import { Policies } from '#/web/auth/policies';
import { safe_route } from '#/web/neverthrow_wrapper';
import { api_err, global_error_handler, HTTPCodes } from '#/web/utils/error';
import z from 'zod';
import { lib_service } from '@providers/services/library_service';
import { TWResponse } from '../utils/logging';
import multer from 'multer';
import { sha } from 'bun';
import { TW_LIBRARY_ALLOWED_MIMETYPES, TW_LIBRARY_MAX_FILESIZE } from '@watcher/shared';
import { chunk_text_content, parse_file } from '../utils/FileHandling';
const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: TW_LIBRARY_MAX_FILESIZE,
  },
});

router.get(
  '/:guild_id/library/files',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    const files = await lib_service.get_library_files(guild_id);
    const usage = await lib_service.get_usage(guild_id);

    if (files.isErr()) return err(files.error);

    return ok({ files: files.value, usage: usage.unwrapOr(null) });
  }),
);

async function files_are_ok(req: e.Request, res: TWResponse, next: e.NextFunction) {
  if (!req.file)
    return global_error_handler(new Error('request did not include a file!'), req, res, next);

  const mime = req.file.mimetype;

  if (!TW_LIBRARY_ALLOWED_MIMETYPES.includes(mime)) {
    res.locals.logger.warn('wrong mimetype!', {
      got: mime,
      expected_any_of: TW_LIBRARY_ALLOWED_MIMETYPES,
    });
    return global_error_handler(new Error('invalid mimetype'), req, res, next);
  }

  return next();
}

const handle_multipart = upload.single('file');

router.post(
  '/:guild_id/library',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  handle_multipart,
  files_are_ok,
  safe_route(async (req, res) => {
    const guild_id = req.params.guild_id as string;

    const file_handle_res = await lib_service.create_file(guild_id);
    if (file_handle_res.isErr()) return err(file_handle_res.error);
    const file_handle = file_handle_res.value;

    // we err if req.file is not defined thru "file_are_ok" middleware
    const file = req.file!;
    const content_hash = sha(file.buffer, 'hex');

    const could_open = await file_handle.open({
      filename: file.originalname ?? 'File Upload',
      filetype: file.mimetype,
      uploader_discord_id: req.user_id!,
      content_hash: content_hash,
      upload_type: 'upload',
    });

    if (could_open.isErr()) {
      await file_handle.error(could_open.error.message);
      return err(could_open.error);
    }

    const parsed_text_from_file = await parse_file(file);

    if (parsed_text_from_file.isErr()) {
      await file_handle.error(parsed_text_from_file.error.message);
      return err(parsed_text_from_file.error);
    }

    for (const chunk of chunk_text_content(parsed_text_from_file.value, {
      chunksize: 1200,
      overlap: 150,
      min_chunk: 150,
    })) {
      file_handle.add_chunk(chunk);
    }

    const could_close = await file_handle.done();
    if (could_close.isErr()) return err(could_close.error);
    return ok({ upload: could_close.value });
  }),
);

router.delete(
  '/:guild_id/library/files/:file_id',
  enforce_policy(Policies.Common.bot_master_or_guild_master),
  safe_route(async (req, _res) => {
    const guild_id = req.params.guild_id as string;
    const file_id = req.params.file_id as string;
    return await lib_service.delete_file(guild_id, file_id);
  }),
);

const route: RouteFile = {
  path: '/guild',
  router,
};

export default route;
