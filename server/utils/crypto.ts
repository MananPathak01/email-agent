import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended length for GCM
const KEY = (process.env.EMAIL_AGENT_TOKEN_KEY || '').slice(0, 32);
if (!KEY) {
  // eslint-disable-next-line no-console
  console.warn('EMAIL_AGENT_TOKEN_KEY env var not set – tokens will be stored in plaintext');
}

function getKey() {
  return Buffer.from(KEY.padEnd(32, '0'));
}

export function encrypt(plainText: string): string {
  if (!KEY) return plainText;
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(cipherText: string): string {
  if (!KEY) return cipherText;
  const data = Buffer.from(cipherText, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const tag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
  const text = data.subarray(IV_LENGTH + 16);
  const decipher = crypto.createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
  return decrypted.toString('utf8');
}
