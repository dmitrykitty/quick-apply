const { test } = require('node:test');
const assert = require('node:assert/strict');
const { emptyProfile, normalizeProfile, fromJobPrefill, parseLanguageLines, formatLanguageLines } = require('../src/profile/schema');

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

test('languages round-trip through the editor format and normalized profile', () => {
  const lines = ' English | Fluent\nPolish | Native\n French \n';
  const languages = parseLanguageLines(lines);
  assert.deepEqual(languages, [
    { name: 'English', proficiency: 'Fluent' },
    { name: 'Polish', proficiency: 'Native' },
    { name: 'French', proficiency: '' }
  ]);
  assert.equal(formatLanguageLines(languages), 'English | Fluent\nPolish | Native\nFrench');
  assert.deepEqual(normalizeProfile({ languages }).languages, languages);
});

test('migrates legacy education years without dropping them', () => {
  const profile = normalizeProfile({ education: [{ institution: 'Example', startYear: '2024', endYear: '2028', current: true }] });
  assert.deepEqual(profile.education[0], {
    institution: 'Example', degree: '', fieldOfStudy: '', startDate: '2024', endDate: '2028', current: true
  });
});

test('imports month-level JobPrefill education dates and preserves saved custom answers', () => {
  const imported = fromJobPrefill({ personal: {}, workExperience: [], education: [{ startYear: '2024', startMonth: 'September', graduationYear: '2028', graduationMonth: '02' }] });
  assert.equal(imported.education[0].startDate, '2024-09');
  assert.equal(imported.education[0].endDate, '2028-02');
  const customAnswers = [{ question: 'How did you hear about us?', answer: 'Career fair', controlType: 'text', domain: 'jobs.example.test', platform: 'Workday' }];
  assert.deepEqual(normalizeProfile({ customAnswers }).customAnswers, customAnswers);
});
