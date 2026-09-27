const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emptyProfile, normalizeProfile, fromJobPrefill } = require('../src/profile/schema');

test('normalizes profile and drops unknown data', () => {
  const profile = normalizeProfile({ personal: { firstName: '  Ada ', secret: 'do not persist' }, skills: [' JS ', '', 4] });
  assert.equal(profile.personal.firstName, 'Ada');
  assert.deepEqual(profile.skills, ['JS']);
  assert.equal(profile.personal.secret, undefined);
  assert.equal(profile.commonAnswers.age18Plus, null);
  assert.deepEqual(emptyProfile().experience, []);
});

test('imports JobPrefill fields without embedded document data', () => {
  const profile = fromJobPrefill({
    personal: { firstName: 'Ada', lastName: 'Lovelace', addressLine1: '1 Example St', linkedinUrl: 'https://example.test' },
    workExperience: [{ company: 'Analytical Engines', jobTitle: 'Engineer', startYear: '2020', startMonth: '03', currentRole: true }],
    education: [{ institution: 'School', degree: 'BS', graduationYear: '2019' }],
    skills: ['JavaScript'], declarations: { atLeast18: true, requireSponsorship: false },
    documents: { resumeData: 'sensitive-data' }
  });
  assert.equal(profile.personal.address, '1 Example St');
  assert.equal(profile.links.linkedin, 'https://example.test');
  assert.equal(profile.experience[0].startDate, '2020-03');
  assert.equal(profile.commonAnswers.age18Plus, true);
  assert.equal(profile.commonAnswers.sponsorshipRequired, false);
  assert.equal(JSON.stringify(profile).includes('sensitive-data'), false);
});

test('rejects unrelated JSON as JobPrefill', () => {
  assert.throws(() => fromJobPrefill({ personal: {} }), /Not a supported/);
});
