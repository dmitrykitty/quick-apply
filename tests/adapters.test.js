const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.OpenApplyScanner = { scan: root => root };
require('../src/adapters/baseAdapter');
require('../src/adapters/greenhouseAdapter');
require('../src/adapters/leverAdapter');
require('../src/adapters/workdayAdapter');

const Greenhouse = globalThis.OpenApplyGreenhouseAdapter;
const Lever = globalThis.OpenApplyLeverAdapter;
const Workday = globalThis.OpenApplyWorkdayAdapter;
const noMarkers = { querySelector: () => null };

test('detects expected ATS hosts and embedded markers', () => {
  assert.equal(Greenhouse.matches(new URL('https://boards.greenhouse.io/acme/jobs/123'), noMarkers), true);
  assert.equal(Lever.matches(new URL('https://jobs.lever.co/acme/123'), noMarkers), true);
  assert.equal(Workday.matches(new URL('https://acme.wd5.myworkdayjobs.com/careers'), noMarkers), true);
  assert.equal(Greenhouse.matches(new URL('https://example.test/apply'), { querySelector: () => ({}) }), true);
  assert.equal(Lever.matches(new URL('https://example.test/other'), noMarkers), false);
});

test('Greenhouse and Lever scan only their application form when present', () => {
  const application = { id: 'application' };
  const previousDocument = globalThis.document;
  try {
    globalThis.document = { querySelector: () => application };
    assert.equal(new Greenhouse().scanFields(), application);
    assert.equal(new Lever().scanFields(), application);
  } finally { globalThis.document = previousDocument; }
});
