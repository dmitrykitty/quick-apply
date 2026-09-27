const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize } = require('../src/utils/text');
const { match, valueAt, findCustomAnswer, isLearnableQuestion } = require('../src/content/fieldMatcher');

const field = values => ({ label: '', ariaLabel: '', placeholder: '', name: '', id: '', nearby: '', ...values });

test('normalizes common labels and identifiers', () => {
  assert.equal(normalize('LegalFirstName *'), 'legal first name');
  assert.equal(normalize('first_name (Required)'), 'first name');
  assert.equal(normalize('Postal-Code'), 'postal code');
  assert.equal(normalize('Przewidywana data ukończenia studiów'), 'przewidywana data ukonczenia studiow');
  assert.equal(normalize('Łódź'), 'lodz');
});

test('matches Polish personal and education labels', () => {
  assert.equal(match(field({ label: 'Imię', type: 'text' })).path, 'personal.firstName');
  assert.equal(match(field({ label: 'Nazwisko', type: 'text' })).path, 'personal.lastName');
  assert.equal(match(field({ label: 'Numer telefonu', type: 'tel' })).path, 'personal.phone');
  assert.equal(match(field({ label: 'Uczelnia', type: 'text' })).path, 'education.0.institution');
  assert.equal(match(field({ label: 'Poziom wykształcenia', type: 'text' })).path, 'education.0.degree');
});

test('matches skills, education and experience dates with context', () => {
  assert.equal(match(field({ label: 'Skills', type: 'textarea' })).path, 'skills.summary');
  assert.equal(match(field({ label: 'Expected graduation date', type: 'month' })).path, 'education.0.endDate');
  assert.equal(match(field({ label: 'Przewidywana data ukończenia studiów', type: 'text' })).path, 'education.0.endDate');
  assert.equal(match(field({ label: 'Start Date', context: 'Education', type: 'month' })).path, 'education.0.startDate');
  assert.equal(match(field({ label: 'End Date', context: 'Work Experience', type: 'month' })).path, 'experience.0.endDate');
  assert.equal(match(field({ label: 'Work location', type: 'text' })).path, 'experience.0.location');
  assert.equal(match(field({ label: 'Current role', type: 'checkbox' })).path, 'experience.0.current');
  assert.equal(match(field({ label: 'Job title', context: 'Experience', type: 'text' })).path, 'experience.0.title');
  assert.equal(match(field({ label: 'Start Date', type: 'month' })), null);
  assert.equal(valueAt({ education: [{ endDate: '2028-02' }] }, 'education.0.endDate'), '2028-02');
});

test('matches citizenship and explicit work authorization without broad guesses', () => {
  assert.equal(match(field({ label: 'EU citizen', type: 'select' })).path, 'workAuthorization.euCitizen');
  assert.equal(match(field({ label: 'Prawo do pracy w UE', type: 'radio' })).path, 'workAuthorization.authorizedInEU');
  assert.equal(match(field({ label: 'Willing to relocate', type: 'checkbox' })).path, 'workAuthorization.willingToRelocate');
  assert.equal(match(field({ label: 'Authorized to work', type: 'select' })).path, 'workAuthorization.genericAuthorized');
  assert.equal(valueAt({ workAuthorization: { authorizedInEU: true, authorizedInUK: false } }, 'workAuthorization.genericAuthorized'), undefined);
  assert.equal(valueAt({ workAuthorization: { authorizedInEU: true } }, 'workAuthorization.genericAuthorized'), true);
});

test('learned answers require exact safe question, type, and domain', () => {
  const profile = { customAnswers: [{ question: 'How did you hear about us?', answer: 'Career fair', controlType: 'text', domain: 'jobs.example.test', platform: 'Lever' }] };
  const question = field({ label: 'How did you hear about us?', type: 'text' });
  assert.equal(findCustomAnswer(profile, question, 'Lever', 'jobs.example.test').answer, 'Career fair');
  assert.equal(findCustomAnswer(profile, question, 'Lever', 'other.example.test'), null);
  assert.equal(findCustomAnswer(profile, field({ label: 'Gender', type: 'text' }), 'Lever', 'jobs.example.test'), null);
  assert.equal(findCustomAnswer(profile, field({ label: 'I agree to the privacy policy', type: 'radio' }), 'Lever', 'jobs.example.test'), null);
  assert.equal(isLearnableQuestion('Yes'), false);
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
