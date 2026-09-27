const { test } = require('node:test');
const assert = require('node:assert/strict');
globalThis.location = { hostname: 'jobs.example.test' };
globalThis.OpenApplyMatcher = {
  match: field => ({ path: field.path, confidence: 'high' }),
  findCustomAnswer: () => null,
  isSensitiveQuestion: () => false,
  isLearnableQuestion: () => false,
  valueAt: (profile, path) => path.split('.').reduce((value, key) => value?.[key], profile)
};
globalThis.OpenApplyFiller = { fill: (field, value) => { field.element.value = value; return value ? 'filled' : 'no-profile-value'; } };
require('../src/adapters/baseAdapter');

test('maps explicit Workday history rows and flags an unscoped duplicate', async () => {
  const fields = [
    { path: 'education.0.institution', record: { kind: 'education', index: 0 }, element: {}, label: 'School', type: 'text' },
    { path: 'education.0.institution', record: { kind: 'education', index: 1 }, element: {}, label: 'School', type: 'text' },
    { path: 'education.0.institution', element: {}, label: 'School', type: 'text' }
  ];
  class ExampleAdapter extends globalThis.OpenApplyBaseAdapter { scanFields() { return fields; } }
  const result = await new ExampleAdapter().fill({ education: [{ institution: 'First school' }, { institution: 'Second school' }] });
  assert.equal(fields[0].element.value, 'First school');
  assert.equal(fields[1].element.value, 'Second school');
  assert.equal(fields[2].element.value, undefined);
  assert.equal(result.review, 1);
  assert.equal(result.details[2].result, 'repeated-field-needs-review');
});
