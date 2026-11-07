import test from 'node:test';
import assert from 'node:assert/strict';
import { compassHeading, captureBlock } from '../lib/witness.ts';

test('only earth-referenced compass readings are accepted', () => {
  assert.equal(compassHeading({ alpha: 90, absolute: false }), null);
  assert.equal(compassHeading({ alpha: 90, absolute: true }), 270);
  assert.equal(compassHeading({ alpha: 0, absolute: true }), 0);
  assert.equal(compassHeading({ webkitCompassHeading: 123, webkitCompassAccuracy: 10 }), 123);
  assert.equal(compassHeading({ webkitCompassHeading: 123, webkitCompassAccuracy: -1 }), null);
  assert.equal(compassHeading({ alpha: NaN, absolute: true }), null);
});

test('capture requires an active session, ready devices, connection, and no pending request', () => {
  assert.match(captureBlock(true, true, true, true), /session/i);
  assert.match(captureBlock(false, false, false, true, true), /camera/i);
  assert.match(captureBlock(true, false, false, true, true), /location/i);
  assert.match(captureBlock(true, true, false, true, true), /compass/i);
  assert.match(captureBlock(true, true, true, false, true), /offline/i);
  assert.match(captureBlock(true, true, true, true, true, true), /wait/i);
  assert.equal(captureBlock(true, true, true, true, true), null);
});
