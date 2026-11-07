import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyDemoActions, needsReassessment } from '../lib/investigation.ts';
const data = JSON.parse(await readFile(new URL('../public/data/intelligence-demo.json', import.meta.url)));
const action = { incidentId: 'DEMO-INC-01', reportId: 'DEMO-004', kind: 'accept', reason: 'Demo review', at: '2026-11-07T00:00:00Z' };
test('membership edits retain original evidence and do not duplicate members', () => {
  const next = applyDemoActions(data, [action, action]);
  assert.equal(next.incidents[0].reportIds.filter(id => id === action.reportId).length, 1);
  assert.equal(next.reports, data.reports);
  assert.equal(data.incidents[0].reportIds.includes(action.reportId), false);
  const removed = applyDemoActions(data, [action, {...action, kind:'remove'}]);
  assert.deepEqual(removed.incidents[0].reportIds, data.incidents[0].reportIds);
  assert.equal(removed.reports.length, 8);
});
test('rejection and reviewed status do not change evidence or membership', () => {
  assert.deepEqual(applyDemoActions(data, [{...action,kind:'reject'},{...action,kind:'review',status:'Reviewed'}]), data);
  assert.equal(needsReassessment([action], action.incidentId), true);
  assert.equal(needsReassessment([{...action, kind:'review'}], action.incidentId), false);
  assert.equal(needsReassessment([action], 'another-incident'), false);
});
test('refresh replay preserves demo changes while rejecting unknown report IDs', () => {
  assert.deepEqual(applyDemoActions(structuredClone(data), [action]), applyDemoActions(data, [action]));
  assert.deepEqual(applyDemoActions(data, [{...action,reportId:'unknown'}]), data);
});
