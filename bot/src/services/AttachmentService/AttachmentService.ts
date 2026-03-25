import { logger } from '@providers/logger';
import { entitlement_service } from '@providers/services/entitlement_service';
import { Attachment, Message } from 'discord.js';
import { Database } from 'interfaces/Database';
import { err, ok, Result, ResultAsync } from 'neverthrow';
import flag_attachment from './attachment_flagger';
import PQueue from 'p-queue';
import { PublicTicketMessageAttachment, TicketMessageAttachment } from '@watcher/shared';
import { s3 } from '@providers/s3_client';
import { map_err } from 'utilities/error';

export default class AttachmentService {
  l = logger.getSubLogger({ name: 'Attachments' });

  static DEFAULT_INTERVAL = 500;
  static DEFAULT_TIMEOUT = 1000 * 5;
  private queue = new PQueue({
    concurrency: 2,
    timeout: AttachmentService.DEFAULT_TIMEOUT,
    intervalCap: 2,
    interval: AttachmentService.DEFAULT_INTERVAL,
  });

  constructor(private db: Database) {}

  async delete_attachments(ticket_id: string) {
    const attachments = await this.db.get_attachments(ticket_id);
    if (attachments.isErr()) return err(attachments.error);

    let promises: ResultAsync<void, Error>[] = [];
    for (const attachment of attachments.value) {
      const deletion_promise = ResultAsync.fromPromise(s3.delete(attachment.cdn_path), map_err);
      promises.push(deletion_promise);
    }

    return await ResultAsync.combineWithAllErrors(promises);
  }

  get_img_location(guild_id: string, attachment_id: string, file_name: string) {
    const location = `${guild_id}/${attachment_id}_${file_name}`;
    return location;
  }

  async perform_r2_upload(
    attachment: Attachment,
    file_location: string,
  ): Promise<Result<number, Error>> {
    const response = await ResultAsync.fromPromise(fetch(attachment.url), map_err);
    if (response.isErr()) return err(response.error);
    if (!response.value.ok) return err(new Error(`Discord CDN returned ${response.value.status}`));
    return ResultAsync.fromPromise(
      s3.write(file_location, response.value, { bucket: 'images' }),
      map_err,
    );
  }

  async process_upload(attachment: Attachment, file_location: string) {
    const attachment_id = attachment.id;

    const upload_res = await this.perform_r2_upload(attachment, file_location);
    if (upload_res.isErr()) {
      this.l.error(`upload failed for ${attachment_id}`, upload_res.error);
      this.set_flag(attachment_id, 'UPLOAD_FAILED');
      return;
    }

    this.set_flag(attachment_id, null);
    this.l.info(`Uploaded ${attachment_id}`);
  }

  into_api_type(
    files: TicketMessageAttachment[],
    expires_in_seconds = 600,
  ): PublicTicketMessageAttachment[] {
    return files.map((file) => {
      let access_url: string;

      if (file.flag === 'IS_UPLOADING') access_url = file.url;
      else if (!file.flag) {
        access_url = s3.presign(file.cdn_path, {
          expiresIn: expires_in_seconds,
          acl: 'public-read',
          bucket: 'images',
        });
      } else {
        access_url = '/placeholders/error.png';
      }

      return { ...file, access_url };
    });
  }

  async set_flag(attachment_id: string, flag: TicketMessageAttachment['flag']) {
    return this.db.update_attachment(attachment_id, { flag });
  }

  async add_attachments(message: Message<true>) {
    const marked_nsfw = 'nsfw' in message.channel ? message.channel.nsfw : false;
    const has_premium = await entitlement_service.has_premium(message.guildId);
    if (has_premium.isErr()) return err(has_premium.error);

    const to_insert: TicketMessageAttachment[] = [];
    const to_upload: Attachment[] = [];

    for (const [attachment_id, attachment] of message.attachments) {
      const file_flag = flag_attachment(attachment, has_premium.value);

      to_insert.push({
        attachment_id,
        message_id: message.id,
        filename: attachment.name,
        url: attachment.url,
        file_size: attachment.size,
        file_height: attachment.height,
        file_width: attachment.width,
        marked_nsfw,
        flag: file_flag,
        cdn_path: this.get_img_location(message.guildId, attachment.id, attachment.name),
      });

      if (file_flag === 'IS_UPLOADING') to_upload.push(attachment);
    }

    if (to_insert.length === 0) return ok();

    const db_res = await this.db.insert_attachments(to_insert);
    if (db_res.isErr()) return err(db_res.error);

    for (const attachment of to_upload) {
      this.queue.add(() =>
        this.process_upload(
          attachment,
          this.get_img_location(message.guildId, attachment.id, attachment.name),
        ),
      );
    }
    this.queue.start();

    return ok(db_res.value);
  }
}
