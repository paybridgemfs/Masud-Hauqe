import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import { getEnvConfig } from './env.js';

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plainPassword) {
  return bcrypt.hash(String(plainPassword), BCRYPT_ROUNDS);
}

export async function verifyPassword(plainPassword, passwordHash) {
  if (!plainPassword || !passwordHash) return false;
  return bcrypt.compare(String(plainPassword), String(passwordHash));
}

function getDerivedKey(secret) {
  return crypto.createHash('sha256').update(String(secret)).digest();
}

export function encryptSecret(plainText) {
  if (!plainText) return '';
  const { google } = getEnvConfig();
  const key = getDerivedKey(google.encryptionKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(String(plainText), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(cipherText) {
  if (!cipherText) return '';
  const parts = String(cipherText).split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted secret format');
  }
  const [ivHex, tagHex, dataHex] = parts;
  const { google } = getEnvConfig();
  const key = getDerivedKey(google.encryptionKey);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);
  return decrypted.toString('utf8');
}

export function createSessionToken(payload, expiresInSeconds = 60 * 60 * 24) {
  const { authSecret } = getEnvConfig();
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const data = Buffer.from(JSON.stringify({ ...payload, exp })).toString('base64url');
  const signature = crypto
    .createHmac('sha256', authSecret)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

export function verifySessionToken(token) {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [data, signature] = token.split('.');
  const { authSecret } = getEnvConfig();
  const expectedSig = crypto
    .createHmac('sha256', authSecret)
    .update(data)
    .digest('base64url');

  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
    if (!decoded.exp || decoded.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Rate limiter store in memory
const rateLimitStore = new Map();

export function checkRateLimit(key, maxAttempts = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
    };
  }
  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

export function sanitizeFilename(filename) {
  const base = String(filename || 'track.mp3')
    .replace(/^.*[\\/]/, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/_{2,}/g, '_');
  const ensuredExt = base.toLowerCase().endsWith('.mp3') ? base : `${base}.mp3`;
  const uniquePrefix = Date.now().toString(36);
  return `${uniquePrefix}-${ensuredExt}`;
}

export function verifyMp3Signature(buffer) {
  if (!buffer || buffer.length < 4) {
    return { valid: false, reason: 'File is empty or smaller than minimum MP3 header size.' };
  }
  // Check for ID3v2 tag ("ID3" = 0x49 0x44 0x33)
  if (buffer[0] === 0x49 && buffer[1] === 0x44 && buffer[2] === 0x33) {
    return { valid: true, format: 'ID3v2 MP3' };
  }
  // Check for MPEG Audio Frame Sync (0xFF followed by 0xE0..0xFF)
  if (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0) {
    return { valid: true, format: 'MPEG Audio Frame' };
  }
  return {
    valid: false,
    reason: 'File binary signature does not match a valid MP3 (missing ID3 tag or MPEG frame sync).',
  };
}
