import { config } from '@providers/config';
import { TicketMessageAttachment } from '@watcher/shared';
import { Attachment } from 'discord.js';

const BLOCKED_EXTENTIONS = new Set([
  'exe',
  'dll',
  'bat',
  'cmd',
  'com',
  'msi',
  'msp',
  'ps1',
  'psm1',
  'vbs',
  'vbe',
  'js',
  'jse',
  'wsf',
  'scr',
  'pif',
  'cpl',
  'reg',
  'sh',
  'bash',
  'zsh',
  'fish',
  'dmg',
  'pkg',
  'app',
  'deb',
  'rpm',
  'appimage',
]);

const SUSPICIOUS_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-executable',
  'application/x-sh',
  'application/x-dosexec',
]);

const SUS_FILENAME_REGEX: RegExp[] = [];

export default function flag_attachment(
  attachment: Attachment,
  guild_is_premium: boolean,
): TicketMessageAttachment['flag'] {
  const file_ending = attachment.name.toLowerCase().split('.').pop();
  if (!file_ending) return 'NO_FILE_ENDING';
  if (BLOCKED_EXTENTIONS.has(file_ending)) return 'SPOOKY_FILE';
  if (attachment.contentType && SUSPICIOUS_MIME_TYPES.has(attachment.contentType))
    return 'SPOOKY_FILE';
  if (!!SUS_FILENAME_REGEX.find((r) => r.test(attachment.name))) return 'SUSPICIOUS_FILENAME';
  if (!guild_is_premium && attachment.size > config.bucket_storage.free_file_limit)
    return 'EXCEEDS_FREE_FILE_LIMIT';
  if (attachment.size > config.bucket_storage.global_file_limit) return 'EXCEEDS_SIZE_LIMIT';

  return 'IS_UPLOADING';
}
