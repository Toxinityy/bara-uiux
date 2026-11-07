import test from 'node:test';
import assert from 'node:assert/strict';
import { sessionRequest, sessionSnapshotCount, captureSnapshot, sendSnapshot, rejectInstruction, instructionMessage, WitnessApiError } from '../lib/witness-api.ts';

const id = '0123456789abcdef01234567';

test('summary counts saved photos including captures not yet represented in the checklist', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, `/api/backend/sessions/${id}/snapshots`);
    assert.equal(options.cache, 'no-store');
    return Response.json({ data: [{ id: 'photo-1', sessionId: id }, { id: 'photo-2', sessionId: id, analyzedAt: null }] });
  });
  assert.equal(await sessionSnapshotCount(id), 2);
  fetch.mock.mockImplementation(async () => Response.json({ data: [] }));
  assert.equal(await sessionSnapshotCount(id), 0);
  fetch.mock.mockImplementation(async () => Response.json({ data: [{ id: 'photo', sessionId: 'another-session' }] }));
  await assert.rejects(sessionSnapshotCount(id), /could not confirm/i);
  fetch.mock.mockImplementation(async () => Response.json({ message: 'Storage unavailable' }, { status: 503 }));
  await assert.rejects(sessionSnapshotCount(id), /storage unavailable/i);
});

test('session lifecycle uses the same-origin API proxy and the backend session envelope', async t => {
  const requests = [];
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    requests.push([path, options.method]);
    return Response.json({ data: { id, status: path.endsWith('/end') ? 'ended' : 'active' } });
  });
  assert.equal((await sessionRequest()).status, 'active');
  assert.equal((await sessionRequest(`/${id}`, 'GET')).id, id);
  assert.equal((await sessionRequest(`/${id}/end`)).status, 'ended');
  assert.deepEqual(requests, [
    ['/api/backend/sessions', 'POST'],
    [`/api/backend/sessions/${id}`, 'GET'],
    [`/api/backend/sessions/${id}/end`, 'POST'],
  ]);
});

test('session requests surface backend errors and reject unconfirmed session IDs', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.json({ message: 'Session has ended' }, { status: 409 }));
  await assert.rejects(sessionRequest(), error => error instanceof WitnessApiError && error.status === 409 && /ended/.test(error.message));
  fetch.mock.mockImplementation(async () => Response.json({ data: { id: 'bad', status: 'active' } }));
  await assert.rejects(sessionRequest(), /invalid session/i);
});

test('capture encodes the live frame and sends precisely the backend metadata fields', async t => {
  let draw;
  const image = new Blob(['test jpeg'], { type: 'image/jpeg' });
  const canvas = { width: 0, height: 0,
    getContext: () => ({ drawImage: (...args) => { draw = args; } }),
    toBlob: (callback, type, quality) => { assert.equal(type, 'image/jpeg'); assert.equal(quality, 0.85); callback(image); },
  };
  const previous = globalThis.document;
  globalThis.document = { createElement: type => { assert.equal(type, 'canvas'); return canvas; } };
  t.after(() => { if (previous === undefined) delete globalThis.document; else globalThis.document = previous; });
  const video = { readyState: 2, videoWidth: 4000, videoHeight: 3000, paused: false, ended: false };
  const metadata = { sessionId: id, time: '2026-11-07T12:00:00.000Z', location: { latitude: -6.2, longitude: 106.8 }, direction: 0 };
  const form = await captureSnapshot(video, metadata);
  assert.equal(canvas.width, 1600);
  assert.equal(canvas.height, 1200);
  assert.deepEqual(draw.slice(1), [0, 0, 1600, 1200]);
  assert.deepEqual(JSON.parse(form.get('metadata')), metadata);
  assert.equal(form.get('image').type, 'image/jpeg');
  assert.equal(form.get('image').name, 'snapshot.jpg');
  await assert.rejects(captureSnapshot({ ...video, paused: true }, metadata), /not ready/i);
});

test('photo upload preserves multipart data, shows returned instructions, and reports failed uploads', async t => {
  const form = new FormData();
  form.append('image', new Blob(['test'], { type: 'image/jpeg' }), 'snapshot.jpg');
  const fetch = t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, '/api/backend/snapshots');
    assert.equal(options.body, form);
    assert.equal(options.method, 'POST');
    assert.equal(options.headers, undefined); // Browser must add the multipart boundary.
    return Response.json({ data: { id }, instruction: { status: 'ready', witnessMessage: 'Show the source from this position.' } });
  });
  assert.equal((await sendSnapshot(form)).message, 'Show the source from this position.');
  fetch.mock.mockImplementation(async () => Response.json({ message: 'Image storage unavailable; snapshot was not saved' }, { status: 503 }));
  await assert.rejects(sendSnapshot(form), /not saved/i);
  fetch.mock.mockImplementation(async () => Response.json({ message: 'No confirmation' }));
  await assert.rejects(sendSnapshot(form), /did not confirm/i);
});

test('skip submits the current request and revision without a reason or confirmation step', async t => {
  t.mock.method(globalThis, 'fetch', async (path, options) => {
    assert.equal(path, `/api/backend/sessions/${id}/instruction/reject`);
    assert.deepEqual(JSON.parse(options.body), { gapId: 'visible_flames.classification', checklistRevision: 4 });
    return Response.json({ data: { id, status: 'active', checklistRevision: 5, instruction: { status: 'not_needed', checklistRevision: 5 } } });
  });
  assert.equal((await rejectInstruction(id, { status: 'ready', gapId: 'visible_flames.classification', checklistRevision: 4 })).checklistRevision, 5);
});

test('distance requests are hidden when restoring a legacy session or returning an upload result', async t => {
  const instruction = { status: 'ready', gapId: 'camera_to_fire_distance.measuredReference', witnessMessage: 'Share an already-known distance to the fire.' };
  assert.equal(instructionMessage(instruction), null);
  t.mock.method(globalThis, 'fetch', async () => Response.json({ data: { id }, instruction, message: instruction.witnessMessage,
    checklistRevision: 7, checklist: { items: [{ criterionKey: 'visible_flames', criterionName: 'Flames', status: 'resolved' }] } }));
  const result = await sendSnapshot(new FormData());
  assert.doesNotMatch(result.message, /distance/i);
  assert.equal(result.checklistRevision, 7);
  assert.equal(result.checklist.items[0].status, 'resolved');
});
