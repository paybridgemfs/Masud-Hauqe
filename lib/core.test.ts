import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractYouTubeVideoId,
  formatIsoDuration,
  slugify,
  contactMessageSchema,
  loginSchema,
} from './validation.js';
import {
  verifyMp3Signature,
  sanitizeFilename,
  encryptSecret,
  decryptSecret,
  createSessionToken,
  verifySessionToken,
} from './security.js';

test('extractYouTubeVideoId parses standard, short, embed, and shorts URLs', () => {
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeVideoId('https://youtu.be/dQw4w9WgXcQ?si=123'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/embed/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeVideoId('https://example.com/not-youtube'), null);
});

test('formatIsoDuration formats ISO 8601 durations accurately', () => {
  assert.equal(formatIsoDuration('PT4M13S'), '4:13');
  assert.equal(formatIsoDuration('PT3M5S'), '3:05');
  assert.equal(formatIsoDuration('PT1H2M9S'), '1:02:09');
  assert.equal(formatIsoDuration('INVALID'), '0:00');
});

test('slugify generates clean URL slugs', () => {
  assert.equal(slugify('Masud Hauqe — Live in Studio!'), 'masud-hauqe-live-in-studio');
});

test('verifyMp3Signature validates ID3v2 and MPEG sync headers and rejects non-MP3 bytes', () => {
  const id3Buf = Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00]);
  assert.equal(verifyMp3Signature(id3Buf).valid, true);

  const mpegBuf = Buffer.from([0xff, 0xfb, 0x90, 0x64]);
  assert.equal(verifyMp3Signature(mpegBuf).valid, true);

  const pngBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
  assert.equal(verifyMp3Signature(pngBuf).valid, false);
});

test('sanitizeFilename strips path traversal and enforces .mp3 extension', () => {
  const safe = sanitizeFilename('../../etc/passwd');
  assert.equal(safe.includes('..'), false);
  assert.equal(safe.endsWith('.mp3'), true);
});

test('encryptSecret and decryptSecret round-trip refresh tokens with AES-256-GCM', () => {
  const original = '1//0g_sample_google_oauth_refresh_token_secret';
  const encrypted = encryptSecret(original);
  assert.notEqual(encrypted, original);
  assert.equal(decryptSecret(encrypted), original);
});

test('createSessionToken and verifySessionToken validate HMAC-signed sessions', () => {
  const token = createSessionToken({ sub: 'admin-1', username: 'admin', role: 'SUPER_ADMIN' }, 300);
  const decoded = verifySessionToken(token);
  assert.equal(decoded?.sub, 'admin-1');
  assert.equal(decoded?.username, 'admin');
  assert.equal(verifySessionToken(`${token}tampered`), null);
});

test('Zod validation schemas enforce contact form and login rules', () => {
  const validContact = contactMessageSchema.safeParse({
    name: 'Amina Rahman',
    email: 'amina@example.com',
    subject: 'Concert Booking Inquiry',
    message: 'We would love to invite Masud Hauqe to headline our autumn acoustic gala.',
  });
  assert.equal(validContact.success, true);

  const invalidContact = contactMessageSchema.safeParse({
    name: 'A',
    email: 'not-an-email',
    subject: '',
    message: 'short',
  });
  assert.equal(invalidContact.success, false);
  assert.equal(loginSchema.safeParse({ username: 'admin', password: 'admin' }).success, true);
});
