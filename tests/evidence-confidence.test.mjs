import test from 'node:test';
import assert from 'node:assert/strict';
import { confidenceCriteria, evidenceConfidence } from '../lib/evidence-confidence.ts';

const captureId = 'capture-1';
const criterion = (key, status = 'resolved', value = 'VISIBLE') => ({
  criterionKey: key, criterionName: key, scope: 'session', status,
  known: { classification: { value, snapshotId: captureId, capturedAt: '2026-11-07T00:00:00Z' } },
  unresolvedFields: [], observations: [], unavailableSnapshotIds: [],
});
const session = items => ({ checklist: { snapshotIds: [captureId], items } });

test('each newly confirmed criterion increases the score by 20 with fixed levels', () => {
  const levels = ['No confirmed criteria', 'Low', 'Moderate', 'Moderate', 'High', 'High'];
  for (let count = 0; count <= confidenceCriteria.length; count++) {
    const result = evidenceConfidence(session(confidenceCriteria.slice(0, count).map(c => criterion(c.key))));
    assert.equal(result.score, count * 20);
    assert.equal(result.confirmed, count);
    assert.equal(result.total, 5);
    assert.equal(result.level, levels[count]);
    assert.equal(result.criteria.length, 5);
  }
});

test('missing checklist is unassessed while an assessed empty checklist has zero confirmed criteria', () => {
  assert.equal(evidenceConfidence().score, null);
  assert.equal(evidenceConfidence({}).level, 'Not assessed');
  assert.equal(evidenceConfidence(null).score, null);
  assert.equal(evidenceConfidence(session([])).score, 0);
  assert.ok(evidenceConfidence().criteria.every(c => c.status === 'unassessed' && !c.qualifies));
});

test('uncertain or unavailable criteria and completed observations do not qualify', () => {
  const items = confidenceCriteria.map((c, i) => ({ ...criterion(c.key, i % 2 ? 'uncertain' : 'unavailable'),
    observations: [{ snapshotId: captureId, result: { classification: 'VISIBLE' }, criterionVersion: 1 }] }));
  assert.equal(evidenceConfidence(session(items)).score, 0);
  assert.equal(evidenceConfidence(session([criterion(confidenceCriteria[0].key)])).score, 20);
});

test('distance, unknown definitions, and duplicated observations cannot inflate confidence', () => {
  const one = criterion(confidenceCriteria[0].key);
  const extra = [criterion('camera_to_fire_distance'), criterion('future_criterion')];
  assert.equal(evidenceConfidence(session([one, ...extra])).score, 20);
  const repeated = structuredClone(one);
  repeated.observations = Array.from({ length: 100 }, () => ({ snapshotId: captureId, result: { classification: 'VISIBLE' }, criterionVersion: 1 }));
  assert.equal(evidenceConfidence(session([repeated, ...extra])).score, 20);
  const duplicate = evidenceConfidence(session([one, structuredClone(one), ...extra]));
  assert.equal(duplicate.score, 0);
  assert.match(duplicate.criteria[0].reason, /Duplicate/);
});

test('resolved requires a meaningful known value supported by a capture in the same session', () => {
  const key = confidenceCriteria[0].key;
  for (const value of [null, undefined, '', ' ', [], {}, ['UNKNOWN'], 'UNCERTAIN', NaN]) {
    const item = criterion(key);
    item.known.classification.value = value;
    assert.equal(evidenceConfidence(session([item])).score, 0);
  }
  assert.equal(evidenceConfidence(session([{ ...criterion(key), known: {} }])).score, 0);
  const foreign = criterion(key);
  foreign.known.classification.snapshotId = 'foreign-capture';
  assert.equal(evidenceConfidence(session([foreign])).score, 0);
});

test('confidence describes coverage, preserves valid zero/false evidence, and ignores session lifecycle', () => {
  const items = [criterion(confidenceCriteria[0].key, 'resolved', false), criterion(confidenceCriteria[1].key, 'resolved', 0)];
  const active = evidenceConfidence({ ...session(items), status: 'active' });
  const ended = evidenceConfidence({ ...session(items), status: 'ended', instruction: { status: 'not_needed' } });
  assert.equal(active.score, 40);
  assert.deepEqual(active, ended);
  assert.match(active.explanation, /not the probability/);
  assert.match(active.explanation, /distance is excluded/);
});
