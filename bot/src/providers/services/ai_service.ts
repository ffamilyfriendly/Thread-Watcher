import { create_singleton } from '@providers/singleton';
import AiService from 'services/AiService';
import { guild_service } from './guild_service';
import { ai_client } from '@providers/ai';
import { entitlement_service } from './entitlement_service';

const singleton = create_singleton(
  () => new AiService(ai_client, guild_service, entitlement_service),
);
export default singleton;
export const ai_service = singleton.instance;
