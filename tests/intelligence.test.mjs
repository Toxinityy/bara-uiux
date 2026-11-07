import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { displayPosition, filterReports, matchingIncidents, parseFilters, situationSummary, validateDataset } from '../lib/intelligence.ts';

const data = validateDataset(JSON.parse(await readFile(new URL('../public/data/intelligence-demo.json', import.meta.url), 'utf8')));
const filters = { area: 'all', period: 'all', search: '' };

test('fixture counts distinct incidents and retains unmapped reports', () => {
  assert.equal(filterReports(data.reports, filters, data.referenceTime).length, 8);
  assert.equal(matchingIncidents(data.incidents, data.reports).length, 2);
  assert.equal(data.reports.filter(r => !displayPosition(r)).length, 2);
});
test('receipt filters retain missing observation times and unlocated reports', () => {
  const result = filterReports(data.reports, { ...filters, area: 'Pulang Pisau', period: '24h' }, data.referenceTime);
  assert.deepEqual(result.map(r => r.id), ['DEMO-007', 'DEMO-006']);
  assert.equal(result[1].observedAt, null);
  assert.equal(matchingIncidents(data.incidents, result).length, 1);
  assert.equal(filterReports(data.reports, { ...filters, period: '7d' }, data.referenceTime).length, 6);
});
test('search and summaries follow records and claim assessments', () => {
  const result = filterReports(data.reports, { ...filters, search: 'DEMO-002' }, data.referenceTime);
  assert.equal(result.length, 1);
  assert.match(situationSummary(result).text, /None includes/);
  assert.match(situationSummary(data.reports).text, /6 of the 8/);
  assert.match(situationSummary([]).unknown, /does not establish/);
  assert.equal(filterReports(data.reports, { ...filters, search: 'sharing was declined' }, data.referenceTime)[0].id, 'DEMO-006');
});
test('zero coordinates are valid; unauthorized and invalid positions are not displayed', () => {
  const report = data.reports[0];
  assert.ok(displayPosition({ ...report, position: { latitude: 0, longitude: 0, authorized: true } }));
  assert.equal(displayPosition({ ...report, position: { latitude: 90, longitude: 0, authorized: true } }), null);
  assert.equal(displayPosition({ ...report, position: { latitude: 1, longitude: 1, authorized: false } }), null);
});
test('URL values and incoming records are validated', () => {
  assert.deepEqual(parseFilters(new URLSearchParams('area=imaginary&period=yesterday&mode=bad'), ['Katingan']), filters);
  assert.throws(() => validateDataset({ ...data, referenceTime: 'bad' }));
  assert.throws(() => validateDataset({ ...data, reports: [...data.reports, data.reports[0]] }));
  assert.throws(() => validateDataset({ ...data, incidents: [{ id: 'bad', title: 'bad', reportIds: ['missing'] }] }));
});
