import test from 'node:test';
import assert from 'node:assert/strict';
import { buildWitnessSummary } from '../lib/witness-summary.ts';

const session = (items = [], extra = {}) => ({
  id: '0123456789abcdef01234567', status: 'ended',
  startedAt: '2026-11-07T10:00:00.000Z', endedAt: '2026-11-07T10:04:30.000Z',
  checklist: { items }, ...extra,
});
const item = (criterionKey, status, known = {}, extra = {}) => ({
  criterionKey, criterionName: criterionKey, status,
  known: Object.fromEntries(Object.entries(known).map(([key, value]) => [key, { value }])), ...extra,
});

test('summary separates confirmed, uncertain, unavailable, and unassessed topics and excludes distance', () => {
  const summary = buildWitnessSummary(session([
    item('visible_flames', 'resolved', { classification: 'VISIBLE' }),
    item('smoke_visibility_color_origin', 'uncertain', { classification: 'VISIBLE', smokeCategory: 'GRAY' }, { unresolvedFields: ['apparentOrigin'] }),
    item('fire_suppression', 'unavailable'),
    item('camera_to_fire_distance', 'resolved', { classification: 'ESTIMABLE' }),
  ]), 3);
  assert.equal(summary.confirmedCount, 1);
  assert.equal(summary.total, 5);
  assert.equal(summary.confirmed[0].key, 'visible_flames');
  assert.match(summary.confirmed[0].finding, /Flames were visible/);
  const smoke = summary.incomplete.find(topic => topic.key === 'smoke_visibility_color_origin');
  assert.equal(smoke.status, 'uncertain');
  assert.match(smoke.finding, /Gray smoke was visible/);
  assert.match(smoke.detail, /emerged is still unclear/);
  assert.equal(summary.incomplete.find(topic => topic.key === 'fire_suppression').status, 'unavailable');
  assert.equal(summary.incomplete.find(topic => topic.key === 'visibly_burning_material').status, 'unassessed');
  assert.equal(summary.duration, '4 min');
  assert.match(summary.contribution, /3 photos saved/);
  assert.doesNotMatch(JSON.stringify(summary), /camera_to_fire_distance/);
});

test('frame-local negative observations never become incident-wide absence or confirmation', () => {
  const summary = buildWitnessSummary(session([
    item('visible_flames', 'uncertain', {}, {
      observations: [{ snapshotId: 'photo1', capturedAt: '2026-11-07T10:01:00Z', result: { classification: 'NOT_VISIBLE' } }],
      unresolvedFields: ['classification'],
    }),
  ]), 1);
  assert.equal(summary.confirmedCount, 0);
  const flames = summary.incomplete.find(topic => topic.key === 'visible_flames');
  assert.match(flames.finding, /did not confirm/);
  assert.match(flames.detail, /does not rule it out elsewhere/);
  assert.doesNotMatch(JSON.stringify(summary), /no fire|fire is absent|ruled out/i);
});

test('raw positive observations are not treated as supported evidence without known values', () => {
  const summary = buildWitnessSummary(session([
    item('visible_flames', 'uncertain', {}, {
      unresolvedFields: ['captureQuality'],
      observations: [{ snapshotId: 'photo1', capturedAt: '2026-11-07T10:01:00Z', result: { classification: 'VISIBLE' } }],
    }),
  ]), 1);
  assert.equal(summary.confirmedCount, 0);
  const flames = summary.incomplete.find(topic => topic.key === 'visible_flames');
  assert.match(flames.finding, /did not confirm/);
  assert.match(flames.detail, /Blur or framing/);
});

test('earlier supported evidence remains confirmed when a later frame is negative', () => {
  const summary = buildWitnessSummary(session([
    item('visible_flames', 'resolved', { classification: 'VISIBLE' }, {
      observations: [{ snapshotId: 'photo2', capturedAt: '2026-11-07T10:02:00Z', result: { classification: 'NOT_VISIBLE' } }],
    }),
  ]), 2);
  assert.match(summary.confirmed[0].finding, /Flames were visible in your photos/);
  assert.doesNotMatch(summary.confirmed[0].finding, /now|currently|not visible/);
});

test('no photos and an unavailable photo count are distinct and do not invent achievements', () => {
  const empty = buildWitnessSummary(session([], { checklist: undefined }), 0);
  assert.equal(empty.confirmedCount, 0);
  assert.equal(empty.incomplete.length, 5);
  assert.match(empty.headline, /No photos/);
  assert.match(empty.contribution, /No photos were saved/);
  const unknown = buildWitnessSummary(session([], { checklist: undefined }), null);
  assert.match(unknown.contribution, /could not be loaded/);
  assert.doesNotMatch(unknown.headline + unknown.contribution, /No photos|0 photos/);
  assert.match(buildWitnessSummary(session(), -1).contribution, /could not be loaded/);
});

test('saved photos without assessments still count as a contribution', () => {
  const summary = buildWitnessSummary(session([], { checklist: undefined }), 2);
  assert.equal(summary.confirmedCount, 0);
  assert.equal(summary.headline, 'Your photos are saved.');
  assert.match(summary.contribution, /2 photos saved/);
  assert.ok(summary.incomplete.every(topic => topic.status === 'unassessed'));
});

test('skipped and deferred requests do not confirm unresolved criteria', () => {
  const checklist = {
    items: [item('visible_flames', 'uncertain')],
    deferredCriteria: ['visible_flames'], verificationStatus: 'incomplete',
  };
  const summary = buildWitnessSummary(session([], { checklist, instruction: { status: 'not_needed' } }), 5);
  assert.equal(summary.confirmedCount, 0);
  assert.match(summary.incomplete[0].detail, /remained unclear/);
});

test('known material and role values use simple labels without exposing arbitrary model text', () => {
  const summary = buildWitnessSummary(session([
    item('visibly_burning_material', 'resolved', {
      classification: 'IDENTIFIABLE', burningMaterials: [
        { category: 'TREES', visualEvidence: 'untrusted model prose' },
        { category: 'GROUND_SURFACE' }, { category: 'UNKNOWN' }, { category: 'untrusted model prose' },
      ], peatInvolvement: 'UNCONFIRMED',
    }),
    item('fire_suppression', 'resolved', {
      classification: 'VISIBLE', actors: [{ role: 'FIREFIGHTER', roleEvidence: 'untrusted model prose' }, { role: 'OTHER_RESPONDER' }],
    }),
  ]), 2);
  assert.match(summary.confirmed.find(topic => topic.key === 'visibly_burning_material').finding, /trees and surface material/);
  assert.match(summary.confirmed.find(topic => topic.key === 'fire_suppression').detail, /firefighters and other responders/);
  assert.doesNotMatch(JSON.stringify(summary), /untrusted model prose|UNKNOWN|peat|under control|extinguished/);
});

test('duration uses completed session timestamps and hides invalid or missing times', () => {
  assert.equal(buildWitnessSummary(session([], { endedAt: '2026-11-07T10:00:10Z' }), 0).duration, 'Less than a minute');
  assert.equal(buildWitnessSummary(session([], { endedAt: '2026-11-07T11:03:00Z' }), 0).duration, '1 hr 3 min');
  assert.equal(buildWitnessSummary(session([], { endedAt: null }), 0).duration, null);
  assert.equal(buildWitnessSummary(session([], { endedAt: 'invalid' }), 0).duration, null);
  assert.equal(buildWitnessSummary(session([], { endedAt: '2026-11-07T09:00:00Z' }), 0).duration, null);
});
