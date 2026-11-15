export const INITIAL_STREAM_CHUNK_BYTES = 256 * 1024; // 256 KB for near-instant first audio frame
export const NEXT_STREAM_CHUNK_BYTES = 512 * 1024; // 512 KB for progressive background chunks
export const MAX_EXPLICIT_RANGE_BYTES = 1024 * 1024; // 1 MB hard cap per single streaming HTTP range response

/**
 * Parses a single HTTP `Range: bytes=...` header.
 * Multi-range headers (e.g. `bytes=0-1, 4-5`) and invalid headers return null.
 */
export function parseValidByteRangeHeader(rawHeader) {
  if (!rawHeader || typeof rawHeader !== 'string') return null;
  const trimmed = rawHeader.trim();
  const match = trimmed.match(/^bytes=(\d*)-(\d*)$/i);
  if (!match) return null;

  const [, startStr, endStr] = match;
  if (!startStr && !endStr) return null;

  if (!startStr && endStr) {
    const suffixLength = Number.parseInt(endStr, 10);
    if (!Number.isFinite(suffixLength) || suffixLength <= 0) return null;
    return {
      type: 'suffix',
      start: null,
      end: null,
      suffixLength,
    };
  }

  const start = Number.parseInt(startStr, 10);
  if (!Number.isFinite(start) || start < 0) return null;

  if (!endStr) {
    return {
      type: 'open',
      start,
      end: null,
      suffixLength: null,
    };
  }

  const end = Number.parseInt(endStr, 10);
  if (!Number.isFinite(end) || end < start) return null;

  return {
    type: 'bounded',
    start,
    end,
    suffixLength: null,
  };
}

/**
 * Parses an HTTP `Content-Range: bytes start-end/total` response header.
 */
export function parseContentRangeHeader(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const match = headerValue.trim().match(/^bytes\s+(\d+)-(\d+)\/(\d+|\*)$/i);
  if (!match) return null;

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  const total = match[3] === '*' ? null : Number.parseInt(match[3], 10);

  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  if (total !== null && (!Number.isFinite(total) || total <= 0)) return null;

  return { start, end, total };
}

/**
 * Plans the exact bounded upstream `Range` header to fetch from Google Drive
 * so open-ended requests like `Range: bytes=0-` never download an entire MP3
 * before playback begins.
 */
export function planDriveUpstreamRange(
  parsedRange,
  knownTotalBytes = 0,
  {
    initialChunkBytes = INITIAL_STREAM_CHUNK_BYTES,
    nextChunkBytes = NEXT_STREAM_CHUNK_BYTES,
    maxExplicitChunkBytes = MAX_EXPLICIT_RANGE_BYTES,
  } = {}
) {
  const total = Number.isFinite(knownTotalBytes) && knownTotalBytes > 0 ? Math.floor(knownTotalBytes) : 0;

  if (!parsedRange) {
    return {
      upstreamRangeHeader: null,
      start: 0,
      end: total > 0 ? total - 1 : null,
      isPartialRequest: false,
      unsatisfiable: false,
      needsTotalLengthForSuffix: false,
    };
  }

  if (parsedRange.type === 'suffix') {
    if (total <= 0) {
      return {
        upstreamRangeHeader: null,
        start: null,
        end: null,
        isPartialRequest: true,
        unsatisfiable: false,
        needsTotalLengthForSuffix: true,
        suffixLength: parsedRange.suffixLength,
      };
    }

    const suffix = Math.min(parsedRange.suffixLength, total, maxExplicitChunkBytes);
    if (suffix <= 0) {
      return {
        upstreamRangeHeader: null,
        start: null,
        end: null,
        isPartialRequest: true,
        unsatisfiable: true,
        totalLength: total,
        needsTotalLengthForSuffix: false,
      };
    }

    const start = Math.max(0, total - suffix);
    const end = total - 1;
    return {
      upstreamRangeHeader: `bytes=${start}-${end}`,
      start,
      end,
      isPartialRequest: true,
      unsatisfiable: false,
      needsTotalLengthForSuffix: false,
    };
  }

  const start = parsedRange.start;
  if (total > 0 && start >= total) {
    return {
      upstreamRangeHeader: null,
      start,
      end: null,
      isPartialRequest: true,
      unsatisfiable: true,
      totalLength: total,
      needsTotalLengthForSuffix: false,
    };
  }

  if (parsedRange.type === 'open') {
    const chunkSize = start === 0 ? initialChunkBytes : nextChunkBytes;
    const rawEnd = start + chunkSize - 1;
    const end = total > 0 ? Math.min(total - 1, rawEnd) : rawEnd;
    return {
      upstreamRangeHeader: `bytes=${start}-${end}`,
      start,
      end,
      isPartialRequest: true,
      unsatisfiable: false,
      needsTotalLengthForSuffix: false,
    };
  }

  // parsedRange.type === 'bounded'
  const cappedEnd = Math.min(parsedRange.end, start + maxExplicitChunkBytes - 1);
  const end = total > 0 ? Math.min(total - 1, cappedEnd) : cappedEnd;

  if (end < start) {
    return {
      upstreamRangeHeader: null,
      start,
      end,
      isPartialRequest: true,
      unsatisfiable: true,
      totalLength: total,
      needsTotalLengthForSuffix: false,
    };
  }

  return {
    upstreamRangeHeader: `bytes=${start}-${end}`,
    start,
    end,
    isPartialRequest: true,
    unsatisfiable: false,
    needsTotalLengthForSuffix: false,
  };
}

/**
 * Resolves byte boundaries for an in-memory buffer while keeping open-ended
 * ranges bounded so even cached tracks stream progressively.
 */
export function resolveBufferSliceRange(parsedRange, totalLength) {
  if (!parsedRange) {
    return {
      status: 200,
      start: 0,
      end: totalLength - 1,
      contentLength: totalLength,
      contentRange: null,
    };
  }

  const plan = planDriveUpstreamRange(parsedRange, totalLength);
  if (plan.unsatisfiable) {
    return {
      status: 416,
      start: 0,
      end: -1,
      contentLength: 0,
      contentRange: `bytes */${totalLength}`,
    };
  }

  const start = plan.start;
  const end = plan.end;
  const contentLength = end - start + 1;
  return {
    status: 206,
    start,
    end,
    contentLength,
    contentRange: `bytes ${start}-${end}/${totalLength}`,
  };
}
