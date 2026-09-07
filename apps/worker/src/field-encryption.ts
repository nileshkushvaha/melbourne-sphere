import { createDecipheriv } from 'node:crypto';

const VERSION = 'v1';

/**
 * Reads fields written by the API's `FieldEncryptionService` (AES-256-GCM with
 * the value's context as associated data). The worker only ever decrypts.
 */
export function decryptField(base64Key: string, stored: string, aad = ''): string {
  const [version, ivB64, tagB64, dataB64] = stored.split(':');
  if (version !== VERSION || !ivB64 || !tagB64 || !dataB64) throw new Error('Unsupported encrypted field format');
  const key = Buffer.from(base64Key, 'base64');
  if (key.length !== 32) throw new Error('FIELD_ENCRYPTION_KEY must decode to 32 bytes');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivB64, 'base64'));
  if (aad) decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  return Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]).toString('utf8');
}
