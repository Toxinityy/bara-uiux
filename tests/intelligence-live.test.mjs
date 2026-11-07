import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchLiveIntelligence, mapLiveSession } from '../lib/intelligence-live.ts';

const sessionId = '0123456789abcdef01234567';
const snapshotId = '0123456789abcdef01234568';
const session = { id: sessionId, startedAt: '2026-11-07T01:00:00.000Z', endedAt: null, status: 'active', checklistRevision: 2 };
const snapshot = { id: snapshotId, sessionId, time: '2026-11-07T01:00:01.000Z', location: { latitude: 0, longitude: 0 }, direction: 0,
  imageUrl: 'https://untrusted.example/image', analyses: [{ criterionKey: 'visible_flames', criterionName: 'Visible flames', criterionVersion: 1,
    status: 'completed', result: { classification: 'VISIBLE' }, message: 'Flames visible in the frame.' }],
  captureQuality: { status: 'completed', assessments: { visible_flames: { status: 'CLEAR' } } } };
const checklist = { verificationStatus: 'incomplete', snapshotIds: [snapshotId], latestSnapshotId: snapshotId,
  items: [{ criterionKey: 'visible_flames', criterionName: 'Visible flames', scope: 'session', status: 'resolved',
    known: { classification: { value: 'VISIBLE', snapshotId, capturedAt: snapshot.time } }, unresolvedFields: [], unavailableSnapshotIds: [],
    observations: [{ snapshotId, criterionVersion: 1, result: { classification: 'VISIBLE' } }] }], gaps: [], summary: 'Evidence summary.' };

test('live mapping preserves evidence and unknowns without inventing reports, review, or fire coordinates', () => {
  const result = mapLiveSession({ ...session, checklist, instruction: { status: 'ready', witnessMessage: 'Provide another view.', gapId: 'smoke.classification', checklistRevision: 2 } }, [snapshot]);
  const report = result.reports[0];
  assert.equal(report.id, snapshotId);
  assert.equal(report.receivedAt, null);
  assert.equal(report.observedAt, snapshot.time);
  assert.equal(report.area, null);
  assert.equal(report.review, null);
  assert.deepEqual(report.claims, []);
  assert.equal(report.position.latitude, 0);
  assert.equal(report.snapshot.direction, 0);
  assert.equal(report.snapshot.imageUrl, `/api/backend/snapshots/${snapshotId}/image`);
  assert.deepEqual(report.snapshot.analyses, snapshot.analyses);
  assert.deepEqual(report.snapshot.captureQuality, snapshot.captureQuality);
  assert.deepEqual(result.session.checklist, checklist);
  assert.equal(result.session.instruction.witnessMessage, 'Provide another view.');
});

test('legacy snapshots and empty sessions retain missing analysis and nullable checklist source', () => {
  const legacy = { ...snapshot, analyses: undefined, location: null, direction: undefined, captureQuality: undefined };
  const result = mapLiveSession(session, [legacy]);
  assert.equal(result.reports[0].snapshot.analyses, null);
  assert.equal(result.reports[0].snapshot.analyzedAt, null);
  assert.equal(result.reports[0].position, null);
  assert.equal(result.reports[0].snapshot.direction, null);
  assert.equal(result.session.checklist, undefined);
  const empty = mapLiveSession({ ...session, checklist: { ...checklist, snapshotIds: [], latestSnapshotId: null, items: [] } }, []);
  assert.equal(empty.session.checklist.latestSnapshotId, null);
  assert.deepEqual(empty.reports, []);
});

test('foreign-session and malformed evidence cannot enter the live dataset', () => {
  assert.throws(() => mapLiveSession(session, [{ ...snapshot, sessionId: '0123456789abcdef01234569' }]), /snapshot metadata/);
  assert.throws(() => mapLiveSession(session, [{ ...snapshot, direction: 360 }]), /snapshot direction/);
  assert.throws(() => mapLiveSession(session, [{ ...snapshot, location: { latitude: 91, longitude: 0 } }]), /snapshot location/);
  assert.throws(() => mapLiveSession({ ...session, checklist }, []), /checklist sources/);
  assert.throws(() => mapLiveSession(session, [snapshot, snapshot]), /duplicate snapshot/);
  const bad = structuredClone(checklist);
  bad.items[0].known.classification.snapshotId = '0123456789abcdef01234569';
  assert.throws(() => mapLiveSession({ ...session, checklist: bad }, [snapshot]), /evidence source/);
});

test('loader reads same-origin live endpoints, includes empty sessions and exposes truncation', async t => {
  const older = { ...session, id: '0123456789abcdef01234569', startedAt: '2026-11-06T01:00:00.000Z' };
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push(url);
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    const data = url === '/api/backend/sessions' ? [older, session] : url.endsWith('/snapshots') ? [] : session;
    return Response.json({ data });
  });
  const result = await fetchLiveIntelligence(undefined, 1);
  assert.equal(result.demo, false);
  assert.deepEqual(result.incidents, []);
  assert.equal(result.sessions[0].id, sessionId);
  assert.deepEqual(result.reports, []);
  assert.equal(result.live.totalSessions, 2);
  assert.equal(result.live.loadedSessions, 1);
  assert.equal(result.live.truncated, true);
  assert.equal(calls.length, 3);
});

test('missing checklist sources are retried once to reconcile concurrent capture updates', async t => {
  let snapshotReads = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    const data = url === '/api/backend/sessions' ? [session] : url.endsWith('/snapshots') ? (++snapshotReads === 1 ? [] : [snapshot]) : { ...session, checklist };
    return Response.json({ data });
  });
  const result = await fetchLiveIntelligence();
  assert.equal(snapshotReads, 2);
  assert.equal(result.reports.length, 1);
});

test('backend failure and cancellation reject instead of falling back to synthetic data', async t => {
  t.mock.method(globalThis, 'fetch', async (_url, options) => {
    options.signal.throwIfAborted();
    return new Response('unavailable', { status: 503 });
  });
  await assert.rejects(fetchLiveIntelligence(), /HTTP 503/);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchLiveIntelligence(controller.signal), { name: 'AbortError' });
});

test('loader caps concurrent backend requests at four', async t => {
  const rows = Array.from({ length: 8 }, (_, i) => ({ ...session, id: String(i + 1).padStart(24, '0') }));
  let active = 0;
  let maximum = 0;
  t.mock.method(globalThis, 'fetch', async url => {
    maximum = Math.max(maximum, ++active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active--;
    const data = url === '/api/backend/sessions' ? rows : url.endsWith('/snapshots') ? [] : rows.find(s => url.endsWith(s.id));
    return Response.json({ data });
  });
  const result = await fetchLiveIntelligence();
  assert.equal(result.sessions.length, 8);
  assert.equal(maximum, 4);
});
