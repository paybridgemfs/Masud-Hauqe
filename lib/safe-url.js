/**
 * Client- and server-safe URL sanitization helpers.
 * Kept isolated from node:crypto / server-only dependencies so Next.js
 * Client Components can import it safely.
 */

export function sanitizeSafeUrl(rawUrl, { allowRelative = true, allowMailto = false, fallback = '' } = {}) {
  if (typeof rawUrl !== 'string') return fallback;
  const trimmed = rawUrl.trim();
  if (!trimmed) return fallback;

  if (trimmed.startsWith('#')) {
    return trimmed;
  }

  if (allowRelative && trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Block control characters or whitespace-smuggled protocols
  const normalizedProtocolCheck = trimmed.replace(/[\u0000-\u0020]+/g, '').toLowerCase();
  if (
    normalizedProtocolCheck.startsWith('javascript:') ||
    normalizedProtocolCheck.startsWith('data:') ||
    normalizedProtocolCheck.startsWith('vbscript:')
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    if (protocol === 'http:' || protocol === 'https:') {
      return parsed.toString();
    }
    if (allowMailto && (protocol === 'mailto:' || protocol === 'tel:')) {
      return trimmed;
    }
    return fallback;
  } catch {
    // Allow relative paths without leading slash only if explicitly safe (no colon before slash)
    if (allowRelative && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
      return trimmed.startsWith('//') ? fallback : trimmed;
    }
    return fallback;
  }
}

export function safeJsonLdStringify(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}
