import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { bearingLabel, captureAnalysisState, captureSummary, filterReports, validateDataset } from '../lib/intelligence.ts';

const data = validateDataset(JSON.parse(await readFile(new URL('../public/data/intelligence-demo.json', import.meta.url), 'utf8')));
const filters = { area: 'all', period: 'all', search: '' };

test('capture analysis states do not infer incident verification or independent support', () => {
  assert.deepEqual(data.reports.slice(0, 3).map(captureAnalysisState), ['Completed', 'Partial', 'Unavailable']);
  assert.equal(captureAnalysisState(data.reports.at(-1)), 'Not supplied');
  assert.equal(captureSummary(data.reports).sources.length, 6);
  assert.match(captureSummary(data.reports).unknown, /does not verify/);
  assert.doesNotMatch(captureSummary(data.reports).text, /corroborated|smoke|confirmed/i);
});

test('capture windows use capture time, with an explicit undated choice', () => {
  const window = { ...filters, period: '24h' };
  assert.deepEqual(filterReports(data.reports, window, data.referenceTime, 'observedAt', false).map(r => r.id), ['DEMO-008', 'DEMO-007', 'DEMO-005']);
  assert.deepEqual(filterReports(data.reports, window, data.referenceTime, 'observedAt', true).map(r => r.id), ['DEMO-008', 'DEMO-007', 'DEMO-005', 'DEMO-006', 'DEMO-003']);
  const r = { ...data.reports[0], observedAt: '2026-08-01T00:00:00Z' };
  assert.equal(filterReports([r], window, data.referenceTime, 'observedAt').length, 0);
});

test('session status, evidence coverage and current request remain independent', () => {
  const [active, ended, missing] = data.sessions;
  assert.equal(active.status, 'active');
  assert.equal(active.instruction.status, 'ready');
  assert.equal(active.checklist.verificationStatus, 'incomplete');
  assert.equal(ended.status, 'ended');
  assert.equal(ended.instruction.status, 'not_needed');
  assert.equal(ended.checklist.verificationStatus, 'incomplete');
  assert.equal(missing.checklist, undefined);
  assert.equal(missing.instruction, undefined);
  assert.notDeepEqual(active.checklist.snapshotIds, data.incidents[0].reportIds);
});

test('evidence links stay in their session and unknown criterion keys are retained', () => {
  const broken = structuredClone(data);
  broken.sessions[0].checklist.items[3].known.color.snapshotId = 'DEMO-001';
  assert.throws(() => validateDataset(broken), /Invalid evidence source/);
  const future = structuredClone(data);
  future.reports[0].snapshot.analyses.push({ criterionKey: 'future_topic', criterionName: 'Future topic', criterionVersion: 2, status: 'completed', message: 'Fixture', result: { unfamiliarField: false } });
  assert.equal(validateDataset(future).reports[0].snapshot.analyses.at(-1).result.unfamiliarField, false);
});

test('numeric compass headings keep their unknown reference including north at zero', () => {
  assert.match(bearingLabel(data.reports[1]), /^0°.*Reference unknown/);
  assert.equal(bearingLabel(data.reports[2]), 'Not provided');
  assert.equal(bearingLabel({ ...data.reports[0], snapshot: { ...data.reports[0].snapshot, direction: 360 } }), 'Not provided');
  const broken = structuredClone(data);
  broken.reports[0].snapshot.direction = 360;
  assert.throws(() => validateDataset(broken), /metadata/);
});

test('map scenario stays synthetic and does not manufacture analysis for density', async () => {
  const scenario = validateDataset(JSON.parse(await readFile(new URL('../public/data/intelligence-analysis.json', import.meta.url), 'utf8')));
  assert.equal(scenario.reports.length, 72);
  assert.equal(scenario.demo, true);
  assert.ok(scenario.reports.every(r => captureAnalysisState(r) === 'Not supplied'));
});
