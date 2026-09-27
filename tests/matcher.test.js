const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../src/utils/text');
const { match, valueAt } = require('../src/content/fieldMatcher');

const field = values => ({ label: '', ariaLabel: '', placeholder: '', name: '', id: '', nearby: '', ...values });

test('normalizes common labels and identifiers', () => {
  assert.equal(normalize('LegalFirstName *'), 'legal first name');
  assert.equal(normalize('first_name (Required)'), 'first name');
  assert.equal(normalize('Postal-Code'), 'postal code');
});

test('matches Greenhouse and Lever profile fields from varied metadata', () => {
  assert.equal(match(field({ label: 'First Name *', name: 'first_name' })).path, 'personal.firstName');
  assert.equal(match(field({ ariaLabel: 'Given name' })).path, 'personal.firstName');
  assert.equal(match(field({ name: 'last_name' })).path, 'personal.lastName');
  assert.equal(match(field({ label: 'Full Name' })).path, 'personal.fullName');
  assert.equal(match(field({ placeholder: 'Email address' })).path, 'personal.email');
  assert.equal(match(field({ id: 'linkedin_url' })).path, 'links.linkedin');
});

test('rejects ambiguous or unrelated fields', () => {
  assert.equal(match(field({ label: 'Emergency contact phone' })), null);
  assert.equal(match(field({ label: 'Manager email' })), null);
  assert.equal(match(field({ label: 'Why do you want this job?' })), null);
  assert.equal(match(field({ nearby: 'First name' })), null);
});

test('resolves derived name and first experience safely', () => {
  const profile = { personal: { firstName: 'Ada', lastName: 'Lovelace' }, experience: [{ company: 'Example Co' }] };
  assert.equal(valueAt(profile, 'personal.fullName'), 'Ada Lovelace');
  assert.equal(valueAt(profile, 'experience.0.company'), 'Example Co');
  assert.equal(valueAt(profile, 'experience.1.company'), undefined);
});

test('fills language lists but avoids guessing in repeated language rows', () => {
  assert.equal(match(field({ label: 'Languages spoken' })).path, 'languages.summary');
  assert.equal(match(field({ label: 'Language proficiency' })).path, 'languages.singleProficiency');
  assert.equal(match(field({ label: 'Programming languages' })), null);
  const multiple = { languages: [{ name: 'English', proficiency: 'Fluent' }, { name: 'Polish', proficiency: 'Native' }] };
  assert.equal(valueAt(multiple, 'languages.summary'), 'English (Fluent), Polish (Native)');
  assert.equal(valueAt(multiple, 'languages.singleName'), undefined);
  assert.equal(valueAt({ languages: [multiple.languages[0]] }, 'languages.singleProficiency'), 'Fluent');
});
