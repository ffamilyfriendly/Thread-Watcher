import { config } from '@providers/config';

const ENCRYPTION_KEY = config.crypto_key;

async function get_key() {
  const key_bytes = new TextEncoder().encode(config.crypto_key);
  const hash = await crypto.subtle.digest('SHA-256', key_bytes);
  return crypto.subtle.importKey('raw', hash, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

export async function encrypt(text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const key = await get_key();

  const cipher_text = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const combined = new Uint8Array(iv.length + cipher_text.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(cipher_text), iv.length);

  return Buffer.from(combined).toString('base64');
}

export async function decrypt(encrypted_base64: string): Promise<string> {
  const combined = Buffer.from(encrypted_base64, 'base64');
  const iv = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);

  const key = await get_key();

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

  return new TextDecoder().decode(decrypted);
}
