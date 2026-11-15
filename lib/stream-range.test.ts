import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_STREAM_CHUNK_BYTES,
  NEXT_STREAM_CHUNK_BYTES,
  MAX_EXPLICIT_RANGE_BYTES,
  parseValidByteRangeHeader,
  parseContentRangeHeader,
  planDriveUpstreamRange,
  resolveBufferSliceRange,
} from './stream-range';

test('parseValidByteRangeHeader parses open, bounded, and suffix ranges and rejects malformed/multi-ranges', () => {
  assert.deepEqual(parseValidByteRangeHeader('bytes=0-'), {
    type: 'open',
    start: 0,
    end: null,
    suffixLength: null,
  });

  assert.deepEqual(parseValidByteRangeHeader('bytes=524288-1048575'), {
    type: 'bounded',
    start: 524288,
    end: 1048575,
    suffixLength: null,
  });

  assert.deepEqual(parseValidByteRangeHeader('bytes=-16384'), {
    type: 'suffix',
    start: null,
    end: null,
    suffixLength: 16384,
  });

  assert.equal(parseValidByteRangeHeader('bytes=0-100, 200-300'), null);
  assert.equal(parseValidByteRangeHeader('bytes=500-100'), null);
  assert.equal(parseValidByteRangeHeader('bytes=-'), null);
  assert.equal(parseValidByteRangeHeader('items=0-10'), null);
  assert.equal(parseValidByteRangeHeader(null), null);
});

test('planDriveUpstreamRange caps open-ended bytes=0- to INITIAL_STREAM_CHUNK_BYTES so full MP3 is never downloaded upfront', () => {
  const totalBytes = 10 * 1024 * 1024; // 10 MB MP3
  const parsed = parseValidByteRangeHeader('bytes=0-');
  const plan = planDriveUpstreamRange(parsed, totalBytes);

  assert.equal(plan.unsatisfiable, false);
  assert.equal(plan.start, 0);
  assert.equal(plan.end, INITIAL_STREAM_CHUNK_BYTES - 1);
  assert.equal(plan.upstreamRangeHeader, `bytes=0-${INITIAL_STREAM_CHUNK_BYTES - 1}`);
});

test('planDriveUpstreamRange caps subsequent open-ended requests and seek offsets to NEXT_STREAM_CHUNK_BYTES', () => {
  const totalBytes = 10 * 1024 * 1024;
  const parsed = parseValidByteRangeHeader('bytes=262144-');
  const plan = planDriveUpstreamRange(parsed, totalBytes);

  assert.equal(plan.start, 262144);
  assert.equal(plan.end, 262144 + NEXT_STREAM_CHUNK_BYTES - 1);
  assert.equal(plan.upstreamRangeHeader, `bytes=262144-${262144 + NEXT_STREAM_CHUNK_BYTES - 1}`);
});

test('planDriveUpstreamRange works even when knownTotalBytes is unknown (0) on open-ended ranges', () => {
  const parsed = parseValidByteRangeHeader('bytes=0-');
  const plan = planDriveUpstreamRange(parsed, 0);

  assert.equal(plan.unsatisfiable, false);
  assert.equal(plan.upstreamRangeHeader, `bytes=0-${INITIAL_STREAM_CHUNK_BYTES - 1}`);
});

test('planDriveUpstreamRange clamps tail open range cleanly to totalBytes - 1', () => {
  const totalBytes = 400000;
  const parsed = parseValidByteRangeHeader('bytes=262144-');
  const plan = planDriveUpstreamRange(parsed, totalBytes);

  assert.equal(plan.start, 262144);
  assert.equal(plan.end, 399999);
  assert.equal(plan.upstreamRangeHeader, 'bytes=262144-399999');
});

test('planDriveUpstreamRange handles suffix ranges cleanly and flags when total size is needed', () => {
  const parsed = parseValidByteRangeHeader('bytes=-16384');

  const needsSize = planDriveUpstreamRange(parsed, 0);
  assert.equal(needsSize.needsTotalLengthForSuffix, true);
  assert.equal(needsSize.suffixLength, 16384);

  const known = planDriveUpstreamRange(parsed, 5000000);
  assert.equal(known.needsTotalLengthForSuffix, false);
  assert.equal(known.upstreamRangeHeader, 'bytes=4983616-4999999');
});

test('planDriveUpstreamRange caps oversized explicit bounded requests and rejects out-of-bounds starts with unsatisfiable=true', () => {
  const totalBytes = 10 * 1024 * 1024;
  const oversized = parseValidByteRangeHeader('bytes=0-9999999');
  const plan = planDriveUpstreamRange(oversized, totalBytes);

  assert.equal(plan.end, MAX_EXPLICIT_RANGE_BYTES - 1);

  const outOfRange = parseValidByteRangeHeader(`bytes=${totalBytes}-`);
  const invalidPlan = planDriveUpstreamRange(outOfRange, totalBytes);
  assert.equal(invalidPlan.unsatisfiable, true);
});

test('parseContentRangeHeader extracts start, end, and total bytes accurately', () => {
  assert.deepEqual(parseContentRangeHeader('bytes 0-262143/8450123'), {
    start: 0,
    end: 262143,
    total: 8450123,
  });
  assert.deepEqual(parseContentRangeHeader('bytes 0-99/*'), {
    start: 0,
    end: 99,
    total: null,
  });
  assert.equal(parseContentRangeHeader('invalid'), null);
});

test('resolveBufferSliceRange slices RAM-cached buffers progressively in bounded chunks', () => {
  const total = 2 * 1024 * 1024;
  const openStart = resolveBufferSliceRange(parseValidByteRangeHeader('bytes=0-'), total);
  assert.equal(openStart.status, 206);
  assert.equal(openStart.start, 0);
  assert.equal(openStart.end, INITIAL_STREAM_CHUNK_BYTES - 1);
  assert.equal(openStart.contentLength, INITIAL_STREAM_CHUNK_BYTES);
  assert.equal(openStart.contentRange, `bytes 0-${INITIAL_STREAM_CHUNK_BYTES - 1}/${total}`);

  const invalid = resolveBufferSliceRange(parseValidByteRangeHeader(`bytes=${total + 10}-`), total);
  assert.equal(invalid.status, 416);
  assert.equal(invalid.contentRange, `bytes */${total}`);
});
