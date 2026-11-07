import test from 'node:test';
import assert from 'node:assert/strict';
import { viewingCone, VIEW_ANGLE, VIEW_DISTANCE } from '../lib/viewing-cone.ts';

const centerTip = ring => ring[1 + VIEW_ANGLE / 6];
test('cone uses GeoJSON coordinates and follows cardinal recorded headings including zero', () => {
  const origin = [106.8, -6.2];
  const north = viewingCone(origin[1], origin[0], 0);
  assert.deepEqual(north[0], origin);
  assert.deepEqual(north.at(-1), origin);
  const n = centerTip(north), e = centerTip(viewingCone(-6.2,106.8,90));
  const s = centerTip(viewingCone(-6.2,106.8,180)), w = centerTip(viewingCone(-6.2,106.8,270));
  assert.ok(n[1] > origin[1] && Math.abs(n[0] - origin[0]) < 1e-8);
  assert.ok(s[1] < origin[1] && Math.abs(s[0] - origin[0]) < 1e-8);
  assert.ok(e[0] > origin[0]); assert.ok(w[0] < origin[0]);
  const meters = (n[1] - origin[1]) * Math.PI / 180 * 6371000;
  assert.ok(Math.abs(meters - VIEW_DISTANCE) < .01);
});

test('missing, invalid, or unsupported location and heading do not create a cone', () => {
  for (const value of [NaN, Infinity, -1, 360, undefined, null]) assert.deepEqual(viewingCone(0,0,value), []);
  assert.deepEqual(viewingCone(86,0,0), []);
  assert.deepEqual(viewingCone(0,181,0), []);
  assert.deepEqual(viewingCone(NaN,0,0), []);
  assert.ok(viewingCone(0,0,0).length > 3);
});

test('cone crosses the date line locally without wrapping across the world', () => {
  const ring = viewingCone(10,179.99999,90);
  assert.ok(ring.some(p => p[0] > 180));
  assert.ok(ring.every(p => Math.abs(p[0] - 179.99999) < .01));
  const west = viewingCone(-10,-179.99999,270);
  assert.ok(west.some(p => p[0] < -180));
  assert.ok(west.every(p => Math.abs(p[0] + 179.99999) < .01));
});
