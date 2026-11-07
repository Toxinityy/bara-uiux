import test from 'node:test';
import assert from 'node:assert/strict';
import { confidenceCriteria } from '../lib/evidence-confidence.ts';
import { confidenceLevels, confidenceColors, createSessionConfidenceMap, reportConfidence, filterReportsByConfidence } from '../lib/confidence-map.ts';

const session = (id, confirmed) => ({ id, checklist: { snapshotIds: ['source-1'], items: confidenceCriteria.slice(0, confirmed).map(c => ({
  criterionKey: c.key, status: 'resolved', known: { classification: { value: 'VISIBLE', snapshotId: 'source-1' } },
})) } });
const report = (id, sessionId) => ({ id, snapshot: { sessionId } });
const sessions = [session('high', 4), session('moderate', 2), session('low', 1), session('zero', 0), { id: 'pending' }];
const reports = [...sessions.map(s => report(s.id, s.id)), report('orphan', 'missing'), { id: 'legacy' }];

test('confidence colors are distinct and every current level has a stable legend entry', () => {
  assert.deepEqual(confidenceLevels, ['High', 'Moderate', 'Low', 'No confirmed criteria', 'Not assessed']);
  assert.equal(new Set(Object.values(confidenceColors)).size, confidenceLevels.length);
  assert.ok(confidenceLevels.every(level => /^#[a-f0-9]{6}$/i.test(confidenceColors[level])));
});

test('zero confirmed and unassessed data remain separate filters', () => {
  assert.equal(reportConfidence(report('zero', 'zero'), sessions).score, 0);
  assert.equal(reportConfidence(report('pending', 'pending'), sessions).score, null);
  assert.equal(reportConfidence(report('unknown', 'missing'), sessions).level, 'Not assessed');
  assert.deepEqual(filterReportsByConfidence(reports, sessions, ['No confirmed criteria']).map(r => r.id), ['zero']);
  assert.deepEqual(filterReportsByConfidence(reports, sessions, ['Not assessed']).map(r => r.id), ['pending', 'orphan', 'legacy']);
});

test('confidence filters support several levels, all levels and no levels without changing record order', () => {
  assert.deepEqual(filterReportsByConfidence(reports, sessions, ['High', 'Low']).map(r => r.id), ['high', 'low']);
  assert.deepEqual(filterReportsByConfidence(reports, sessions, confidenceLevels), reports);
  assert.deepEqual(filterReportsByConfidence(reports, sessions, []), []);
  assert.deepEqual(filterReportsByConfidence(reports, sessions, ['High', 'High']).map(r => r.id), ['high']);
});

test('session confidence stays independent of visible captures and does not inflate for repeated captures', () => {
  const shots = [report('first', 'high'), report('second', 'high')];
  const isolated = filterReportsByConfidence(shots.slice(1), sessions, ['High']);
  assert.equal(isolated.length, 1);
  assert.equal(reportConfidence(isolated[0], sessions).score, 80);
  const repeated = Array.from({ length: 100 }, (_, i) => report(String(i), 'high'));
  assert.ok(filterReportsByConfidence(repeated, sessions, ['High']).every(r => reportConfidence(r, sessions).score === 80));
  assert.equal(createSessionConfidenceMap(sessions).get('high').score, 80);
});

test('all captures in a session follow its refreshed criteria and can cross a filter threshold', () => {
  const shots = [report('first', 'evolving'), report('second', 'evolving')];
  assert.equal(filterReportsByConfidence(shots, [session('evolving', 3)], ['High']).length, 0);
  const qualified = filterReportsByConfidence(shots, [session('evolving', 4)], ['High']);
  assert.equal(qualified.length, 2);
  assert.ok(qualified.every(r => reportConfidence(r, [session('evolving', 4)]).score === 80));
});
