import { config } from './config';
import { create_singleton } from './singleton';
import { Mistral } from '@mistralai/mistralai';

const singleton = create_singleton(() => {
  return new Mistral({
    apiKey: config.ai.mistral_key,
  });
});
export default singleton;
export const ai_client = singleton.instance;
