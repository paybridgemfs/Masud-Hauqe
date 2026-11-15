import test from 'node:test';
import assert from 'node:assert/strict';

import {
  verifyImageSignature,
  verifyMp3Signature,
  isBlockedSsrfTarget,
  sanitizeSafeUrl as serverSanitizeSafeUrl,
  escapeHtml,
  safeJsonLdStringify as serverSafeJsonLdStringify,
  checkRateLimit,
  checkStreamPlayDedupe,
  createSessionToken,
  verifySessionToken,
} from './security.js';
import { sanitizeSafeUrl, safeJsonLdStringify } from './safe-url.js';

test('verifyImageSignature accepts valid raster headers and blocks SVG/HTML payloads', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const gif = Buffer.from('GIF89a\x01\x00\x01\x00', 'ascii');
  const webp = Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ', 'ascii');

  assert.equal(verifyImageSignature(png, 'image/png').valid, true);
  assert.equal(verifyImageSignature(jpg, 'image/jpeg').valid, true);
  assert.equal(verifyImageSignature(gif, 'image/gif').valid, true);
  assert.equal(verifyImageSignature(webp, 'image/webp').valid, true);

  const svgPayload = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
  const htmlPayload = Buffer.from('<!DOCTYPE html><html><script>alert(1)</script></html>');
  assert.equal(verifyImageSignature(svgPayload, 'image/svg+xml').valid, false);
  assert.equal(verifyImageSignature(htmlPayload, 'image/png').valid, false);
  assert.equal(verifyImageSignature(png, 'image/svg+xml').valid, false);
});

test('verifyMp3Signature accepts ID3v2 and MPEG sync frames and rejects invalid bytes', () => {
  const id3 = Buffer.from([0x49, 0x44, 0x33, 0x03, 0x00, 0x00]);
  const mpeg = Buffer.from([0xff, 0xfb, 0x90, 0x00]);
  const textFile = Buffer.from('<?php echo "hacked"; ?>');

  assert.equal(verifyMp3Signature(id3).valid, true);
  assert.equal(verifyMp3Signature(mpeg).valid, true);
  assert.equal(verifyMp3Signature(textFile).valid, false);
});

test('isBlockedSsrfTarget blocks loopback, metadata, private IPs and allows public HTTPS URLs', () => {
  assert.equal(isBlockedSsrfTarget('http://127.0.0.1/secret'), true);
  assert.equal(isBlockedSsrfTarget('http://169.254.169.254/latest/meta-data/'), true);
  assert.equal(isBlockedSsrfTarget('http://localhost:3000/api/settings'), true);
  assert.equal(isBlockedSsrfTarget('http://10.0.0.5/internal'), true);
  assert.equal(isBlockedSsrfTarget('http://192.168.1.1/admin'), true);
  assert.equal(isBlockedSsrfTarget('http://[::1]:8080/'), true);
  assert.equal(isBlockedSsrfTarget('file:///etc/passwd'), true);

  assert.equal(isBlockedSsrfTarget('https://example.com/cover.jpg'), false);
  assert.equal(isBlockedSsrfTarget('https://drive.google.com/uc?id=123'), false);
});

test('sanitizeSafeUrl blocks javascript:, data:, and protocol-relative URLs while allowing safe paths', () => {
  for (const fn of [sanitizeSafeUrl, serverSanitizeSafeUrl]) {
    assert.equal(fn('javascript:alert(1)'), '');
    assert.equal(fn('data:text/html,<script>alert(1)</script>'), '');
    assert.equal(fn('//evil.com/phish'), '');
    assert.equal(fn('vbscript:msgbox(1)'), '');

    assert.equal(fn('/music'), '/music');
    assert.equal(fn('#contact'), '#contact');
    assert.equal(fn('https://youtube.com/@masudhossain'), 'https://youtube.com/@masudhossain');
    assert.equal(fn('mailto:artist@example.com', { allowRelative: false, allowMailto: true }), 'mailto:artist@example.com');
    assert.equal(fn('/local', { allowRelative: false }), '');
  }
});

test('escapeHtml and safeJsonLdStringify neutralize script-breakout payloads', () => {
  assert.equal(
    escapeHtml('<script>"alert(\'xss\')" &'),
    '&lt;script&gt;&quot;alert(&#39;xss&#39;)&quot; &amp;'
  );

  for (const fn of [safeJsonLdStringify, serverSafeJsonLdStringify]) {
    const serialized = fn({ name: '</script><script>alert(1)</script>' });
    assert.equal(serialized.includes('</script>'), false);
    assert.equal(serialized.includes('\\u003c/script\\u003e'), true);
  }
});

test('checkRateLimit and checkStreamPlayDedupe enforce thresholds properly', () => {
  const rlKey = `test-rl-${Date.now()}`;
  assert.equal(checkRateLimit(rlKey, 2, 60_000).allowed, true);
  assert.equal(checkRateLimit(rlKey, 2, 60_000).allowed, true);
  const blocked = checkRateLimit(rlKey, 2, 60_000);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1);

  const dedupeKey = `test-play-${Date.now()}`;
  assert.equal(checkStreamPlayDedupe(dedupeKey, 60_000), true);
  assert.equal(checkStreamPlayDedupe(dedupeKey, 60_000), false);
});

test('createSessionToken and verifySessionToken preserve payload and reject tampering', () => {
  const token = createSessionToken({ sub: 'admin-1', tv: 3 }, 3600);
  const decoded = verifySessionToken(token);
  assert.ok(decoded);
  assert.equal(decoded.sub, 'admin-1');
  assert.equal(decoded.tv, 3);

  const tampered = `${token.slice(0, -2)}xx`;
  assert.equal(verifySessionToken(tampered), null);
});
