import { schedule } from 'node-cron';
import { Dirent, readdirSync, readFileSync, statSync, unlinkSync } from 'fs';
import { Result, ResultAsync } from 'neverthrow';
import { map_err } from 'utilities/error';
import { Logger } from 'tslog';
import path from 'path';
import { config } from '@providers/config';
import { logger } from '@providers/logger';
import { database } from '@providers/database';
import { s3 } from '@providers/s3_client';

function map_file(f_inf: Dirent<string>) {
  const file_path = path.join(f_inf.parentPath, f_inf.name);
  return { file_path, s_inf: statSync(file_path) };
}

async function prune_files(l: Logger<unknown>) {
  const files = readdirSync(config.database.backup_path, { withFileTypes: true });

  const files_list = files
    .filter((f) => f.isFile() && f.name.endsWith('.tgz'))
    .map(map_file)
    .sort((a, b) => b.s_inf.mtimeMs - a.s_inf.mtimeMs)
    .slice(config.database.keep_local_files_amount);

  l.info(`Pruning files: ${files_list.map((f) => f.file_path).join(', ')}`);
  for (const file of files_list) {
    unlinkSync(file.file_path);
  }
}

async function do_backup() {
  const l = logger.getSubLogger({ name: 'DB_BACKUP' });
  const backup_file_res = await database.create_backup_file();
  if (backup_file_res.isErr()) {
    l.error('could not create backup file:', backup_file_res.error);
    return;
  }

  const backup_file_info = backup_file_res.value;

  l.info(`Created backup file @ ${backup_file_info.full_path}`);

  if (config.database.upload_backup_to_bucket) {
    const safe_read_file = Result.fromThrowable(readFileSync);
    safe_read_file(backup_file_info.full_path).match(
      async (file_data) => {
        if (file_data.length == 0) {
          l.error(`'${backup_file_info.full_path}' is 0 bytes.`);
          return;
        }

        const file_upload_res = await ResultAsync.fromPromise(
          s3.write(backup_file_info.file_name, file_data, {
            bucket: 'database-backups',
          }),
          map_err,
        );

        if (file_upload_res.isErr()) {
          l.error('could not upload database to bucket!', file_upload_res.error);
          return;
        }

        l.info(`Uploaded '${backup_file_info.file_name}' to bucket!`);
      },
      (file_read_err) => {
        l.error('could not read file', file_read_err);
      },
    );
  }

  if (config.database.keep_local_files_amount > 0) {
    l.info(`Pruning files (keep ${config.database.keep_local_files_amount})`);
    const safe_prune = Result.fromThrowable(prune_files);
    safe_prune(l).match(
      (_) => l.info('Pruned files!'),
      (prune_err) => l.error('Could not prune files!', prune_err),
    );
  }
}

export function start_db_backup_routine() {
  schedule(config.database.backup_interval, do_backup);
}
