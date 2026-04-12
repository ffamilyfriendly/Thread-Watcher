import database from '@providers/database';
import { create_singleton } from '@providers/singleton';
import AttachmentService from '#/services/AttachmentService/AttachmentService';

const singleton = create_singleton(() => new AttachmentService(database.instance));
export default singleton;
export const attachment_service = singleton.instance;
