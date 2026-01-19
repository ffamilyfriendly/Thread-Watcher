import { S3Client } from 'bun';
import { create_singleton } from './singleton';
import { config } from './config';

const singleton = create_singleton(
  () =>
    new S3Client({
      region: 'auto',
      endpoint: config.bucket_storage.url,
      accessKeyId: config.bucket_storage.access_key_id,
      secretAccessKey: config.bucket_storage.secret_access_key,
    }),
);
export default singleton;
export const s3 = singleton.instance;
