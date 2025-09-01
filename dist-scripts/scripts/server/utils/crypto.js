"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.encrypt = encrypt;
exports.decrypt = decrypt;
const crypto_1 = __importDefault(require("crypto"));
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // recommended length for GCM
const KEY = (process.env.EMAIL_AGENT_TOKEN_KEY || '').slice(0, 32);
function getKey() {
    return Buffer.from(KEY.padEnd(32, '0'));
}
function encrypt(plainText) {
    if (!KEY)
        return plainText;
    const iv = crypto_1.default.randomBytes(IV_LENGTH);
    const cipher = crypto_1.default.createCipheriv(ALGORITHM, getKey(), iv);
    const encrypted = Buffer.concat([
        cipher.update(plainText, 'utf8'),
        cipher.final()
    ]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}
function decrypt(cipherText) {
    if (!KEY)
        return cipherText;
    // Check if the text looks like a plaintext token (starts with common token prefixes)
    if (cipherText.startsWith('ya29.') || cipherText.startsWith('1//') || cipherText.length < 50) { // This is likely a plaintext token, return as-is
        return cipherText;
    }
    try {
        const data = Buffer.from(cipherText, 'base64');
        const iv = data.subarray(0, IV_LENGTH);
        const tag = data.subarray(IV_LENGTH, IV_LENGTH + 16);
        const text = data.subarray(IV_LENGTH + 16);
        const decipher = crypto_1.default.createDecipheriv(ALGORITHM, getKey(), iv);
        decipher.setAuthTag(tag);
        const decrypted = Buffer.concat([decipher.update(text), decipher.final()]);
        return decrypted.toString('utf8');
    }
    catch (error) { // If decryption fails, assume it's plaintext (for backward compatibility)
        return cipherText;
    }
}
