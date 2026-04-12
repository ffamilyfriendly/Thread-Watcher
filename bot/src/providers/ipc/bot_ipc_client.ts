import { client } from '@providers/client';
import { create_singleton } from '@providers/singleton';
import { BotIpcClient } from '#/utilities/ipc_clients';

const singleton = create_singleton(() => new BotIpcClient(client));
export default singleton;
export const ipc_client = singleton.instance;
