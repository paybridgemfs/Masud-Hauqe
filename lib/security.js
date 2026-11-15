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

// Bounded rate limiter store in memory with automatic expiration pruning
const rateLimitStore = new Map();
const MAX_RATE_LIMIT_ENTRIES = 5000;

function pruneExpiredMap(store, now, maxEntries) {
  if (store.size < maxEntries) return;
  for (const [k, v] of store.entries()) {
    const expiry = typeof v === 'number' ? v : v?.resetAt || 0;
    if (now > expiry) {
      store.delete(k);
    }
  }
  while (store.size >= maxEntries) {
    const oldestKey = store.keys().next().value;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

export function getClientIp(request) {
  try {
    const forwarded = request?.headers?.get?.('x-forwarded-for') || '';
    const firstForwarded = forwarded.split(',')[0]?.trim();
    const realIp = request?.headers?.get?.('x-real-ip')?.trim();
    return (firstForwarded || realIp || '127.0.0.1').slice(0, 64);
  } catch {
    return '127.0.0.1';
  }
}

export function checkRateLimit(key, maxAttempts = 10, windowMs = 60 * 1000) {
  const now = Date.now();
  pruneExpiredMap(rateLimitStore, now, MAX_RATE_LIMIT_ENTRIES);

  const record = rateLimitStore.get(key);
  if (!record || now > record.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: maxAttempts - 1 };
  }
  if (record.count >= maxAttempts) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.max(1, Math.ceil((record.resetAt - now) / 1000)),
    };
  }
  record.count += 1;
  return { allowed: true, remaining: maxAttempts - record.count };
}

const streamPlayDedupeStore = new Map();

export function checkStreamPlayDedupe(key, windowMs = 45 * 1000) {
  const now = Date.now();
  pruneExpiredMap(streamPlayDedupeStore, now, MAX_RATE_LIMIT_ENTRIES);
  const expiresAt = streamPlayDedupeStore.get(key) || 0;
  if (expiresAt > now) {
    return false;
  }
  streamPlayDedupeStore.set(key, now + windowMs);
  return true;
}

export function sanitizeFilename(filename) {
  const raw = String(filename || 'track.mp3')
    .replace(/^.*[\\/]/, '')
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const base = raw || 'track.mp3';
  return base.toLowerCase().endsWith('.mp3') ? base : `${base}.mp3`;
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

export function verifyImageSignature(buffer, declaredMimeType = '') {
  if (!buffer || buffer.length < 4) {
    return { valid: false, reason: 'Image file is empty or corrupted.' };
  }
  // Reject SVG / XML / HTML payloads masquerading as raster images
  const headText = Buffer.from(buffer.subarray(0, Math.min(256, buffer.length)))
    .toString('utf8')
    .trimStart()
    .toLowerCase();
  if (headText.startsWith('<svg') || headText.startsWith('<?xml') || headText.startsWith('<!doctype') || headText.startsWith('<html')) {
    return { valid: false, reason: 'SVG and markup payloads are not allowed for security reasons.' };
  }

  let detectedMime = '';
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    detectedMime = 'image/jpeg';
  }
  // PNG: 89 50 4E 47
  else if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    detectedMime = 'image/png';
  }
  // GIF: GIF8
  else if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) {
    detectedMime = 'image/gif';
  }
  // WebP: RIFF....WEBP
  else if (
    buffer.length >= 12 &&
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    detectedMime = 'image/webp';
  }
  // AVIF: ....ftypavis or ....ftypavif
  else if (
    buffer.length >= 12 &&
    buffer[4] === 0x66 &&
    buffer[5] === 0x74 &&
    buffer[6] === 0x79 &&
    buffer[7] === 0x70 &&
    (buffer.subarray(8, 12).toString('ascii') === 'avif' ||
      buffer.subarray(8, 12).toString('ascii') === 'avis')
  ) {
    detectedMime = 'image/avif';
  }
  // ICO / CUR: 00 00 01 00 or 00 00 02 00
  else if (buffer[0] === 0x00 && buffer[1] === 0x00 && (buffer[2] === 0x01 || buffer[2] === 0x02) && buffer[3] === 0x00) {
    detectedMime = 'image/x-icon';
  }

  if (!detectedMime) {
    return {
      valid: false,
      reason: 'Unsupported or invalid image binary signature. Allowed formats: JPEG, PNG, WebP, GIF, AVIF, ICO.',
    };
  }

  const normDeclared = String(declaredMimeType || '').toLowerCase();
  if (normDeclared && normDeclared.includes('svg')) {
    return { valid: false, reason: 'SVG uploads are disabled for security.' };
  }

  return { valid: true, detectedMime };
}

export function sanitizeSafeUrl(rawUrl, { allowRelative = true, allowMailto = false, fallback = '' } = {}) {
  if (typeof rawUrl !== 'string') return fallback;
  const cleaned = rawUrl.replace(/[\u0000-\u001F\u007F]/g, '').trim();
  if (!cleaned) return fallback;

  // Reject protocol-relative //evil.com redirects and backslashes
  if (cleaned.startsWith('//') || cleaned.startsWith('\\\\')) {
    return fallback;
  }

  if (allowRelative && (cleaned.startsWith('/') || cleaned.startsWith('#') || cleaned.startsWith('?'))) {
    return cleaned;
  }

  try {
    const parsed = new URL(cleaned);
    const proto = parsed.protocol.toLowerCase();
    if (proto === 'https:' || proto === 'http:') {
      return cleaned;
    }
    if (allowMailto && proto === 'mailto:') {
      return cleaned;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function safeJsonLdStringify(obj) {
  return JSON.stringify(obj)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}

function ipv4ToInt(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return ((parts[0] << 24) >>> 0) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isPrivateOrReservedIpv4(ip) {
  const num = ipv4ToInt(ip);
  if (num === null) return false;
  const inRange = (cidrStart, bits) => {
    const start = ipv4ToInt(cidrStart);
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (num & mask) === (start & mask);
  };
  return (
    inRange('0.0.0.0', 8) ||
    inRange('10.0.0.0', 8) ||
    inRange('100.64.0.0', 10) ||
    inRange('127.0.0.0', 8) ||
    inRange('169.254.0.0', 16) ||
    inRange('172.16.0.0', 12) ||
    inRange('192.168.0.0', 16) ||
    inRange('224.0.0.0', 4) ||
    inRange('240.0.0.0', 4)
  );
}

export function isBlockedSsrfTarget(urlString) {
  try {
    const parsed = new URL(String(urlString || '').trim());
    const proto = parsed.protocol.toLowerCase();
    if (proto !== 'https:' && proto !== 'http:') return true;

    const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (!hostname) return true;
    if (
      hostname === 'localhost' ||
      hostname === 'ip6-localhost' ||
      hostname === 'ip6-loopback' ||
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal')
    ) {
      return true;
    }

    if (/^\d+\.\d+\.\d+\.\d+$/.test(hostname) && isPrivateOrReservedIpv4(hostname)) {
      return true;
    }

    if (/^\d+$/.test(hostname)) {
      return true;
    }

    // Block IPv6 loopback, link-local, unique-local, IPv4-mapped loopback/private
    if (hostname.includes(':')) {
      if (
        hostname === '::' ||
        hostname === '::1' ||
        hostname.startsWith('fc') ||
        hostname.startsWith('fd') ||
        hostname.startsWith('fe80') ||
        hostname.includes('::ffff:')
      ) {
        return true;
      }
    }

    return false;
  } catch {
    return true;
  }
}
