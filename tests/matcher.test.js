const {
  test
} = require('node:test');
const assert = require('node:assert/strict');
const {
  normalize
} = require('../src/utils/text');
const {
  match,
  valueAt,
  candidatesAt,
  findCustomAnswer,
  isLearnableQuestion
} = require('../src/content/fieldMatcher');
const {
  normalizeProfile
} = require('../src/profile/schema');
const field = values => ({
  label: '',
  ariaLabel: '',
  placeholder: '',
  name: '',
  id: '',
  nearby: '',
  type: 'text',
  ...values
});
test('normalizes common labels and identifiers', () => {
  assert.equal(normalize('LegalFirstName *'), 'legal first name');
  assert.equal(normalize('first_name (Required)'), 'first name');
  assert.equal(normalize('Przewidywana data ukończenia studiów'), 'przewidywana data ukonczenia studiow');
  assert.equal(normalize('Łódź'), 'lodz');
});
test('matches personal, application defaults, and historical fields narrowly', () => {
  for (const [label, path, type] of [['Imię', 'personal.firstName', 'text'], ['Nazwisko', 'personal.lastName', 'text'], ['Numer telefonu', 'personal.phone', 'tel'], ['Phone country code', 'personal.phoneCountryCode', 'select'], ['Phone country', 'personal.phoneCountry', 'select'], ['Phone type', 'personal.phoneType', 'select'], ['Address line 2', 'personal.addressLine2', 'text'], ['State / region', 'personal.stateRegion', 'text'], ['Current location', 'personal.currentLocation', 'text'], ['Pronouns', 'personal.pronouns', 'text'], ['How did you hear about us?', 'applicationDefaults.source', 'text'], ['Preferred work location', 'applicationDefaults.preferredWorkLocation', 'text'], ['Notice period', 'applicationDefaults.noticePeriod', 'text'], ['Earliest start date', 'applicationDefaults.earliestStartDate', 'date'], ['Skills', 'skills.summary', 'textarea'], ['Work location', 'experience.0.location', 'text'], ['Job description', 'experience.0.description', 'textarea'], ['GPA', 'education.0.gpa', 'text'], ['Expected graduation date', 'education.0.graduationDate', 'month'], ['Przewidywana data ukończenia studiów', 'education.0.graduationDate', 'text']]) assert.equal(match(field({
    label,
    type
  }))?.path, path, label);
  assert.equal(match(field({
    label: 'Start Date',
    context: 'Education',
    type: 'month'
  }))?.path, 'education.0.startDate');
  assert.equal(match(field({
    label: 'End Date',
    context: 'Work Experience',
    type: 'month'
  }))?.path, 'experience.0.endDate');
  assert.equal(match(field({
    label: 'Start Date',
    type: 'month'
  })), null);
});
test('uses authorization default and exact jurisdiction overrides', () => {
  const p = normalizeProfile({
    schemaVersion: 2,
    workAuthorization: {
      defaultAuthorizedToWork: true,
      defaultRequiresSponsorship: false,
      overrides: [{
        jurisdiction: 'US',
        authorizedToWork: false,
        requiresSponsorship: true
      }]
    }
  });
  assert.equal(match(field({
    label: 'Authorized to work',
    type: 'select'
  }))?.path, 'workAuthorization.defaultAuthorizedToWork');
  assert.equal(match(field({
    label: 'Authorized to work in US',
    type: 'radio'
  }))?.path, 'workAuthorization.defaultAuthorizedToWork');
  assert.equal(match(field({
    label: 'Require sponsorship',
    type: 'select'
  }))?.path, 'workAuthorization.defaultRequiresSponsorship');
  assert.equal(valueAt(p, 'workAuthorization.defaultAuthorizedToWork', field({
    label: 'Authorized to work'
  })), true);
  assert.equal(valueAt(p, 'workAuthorization.defaultAuthorizedToWork', field({
    label: 'Authorized to work in US'
  })), false);
  assert.equal(valueAt(p, 'workAuthorization.defaultRequiresSponsorship', field({
    label: 'Require sponsorship in US'
  })), true);
  assert.equal(valueAt(p, 'workAuthorization.defaultAuthorizedToWork', field({
    label: 'Authorized to work in UK'
  })), true);
});
test('education option candidates keep canonical then saved alternative order', () => {
  const p = normalizeProfile({
    schemaVersion: 2,
    education: [{
      institution: 'Canonical',
      institutionAlternatives: ['Second', 'First']
    }]
  });
  assert.deepEqual(candidatesAt(p, 'education.0.institution'), ['Canonical', 'Second', 'First']);
  assert.equal(valueAt(p, 'education.0.institution'), 'Canonical');
});
test('voluntary disclosures require opt-in and exact labels', () => {
  const p = normalizeProfile({
    schemaVersion: 2,
    voluntaryDisclosures: {
      gender: 'Woman',
      ethnicity: 'Example'
    }
  });
  assert.equal(match(field({
    label: 'Gender',
    type: 'select'
  }))?.path, 'voluntaryDisclosures.gender');
  assert.equal(valueAt(p, 'voluntaryDisclosures.gender'), undefined);
  p.voluntaryDisclosures.autofill = true;
  assert.equal(valueAt(p, 'voluntaryDisclosures.gender'), 'Woman');
  assert.equal(match(field({
    label: 'Gender identity details',
    type: 'select'
  })), null);
  assert.equal(match(field({
    label: 'I agree to the privacy policy',
    type: 'radio'
  })), null);
  assert.equal(match(field({
    label: 'Consent to background check',
    type: 'select'
  }))?.path, 'declarations.consentBackgroundCheck');
});
test('learned answers require exact safe question, type, and domain', () => {
  const p = {
    customAnswers: [{
      question: 'Favorite editor?',
      answer: 'Vim',
      controlType: 'text',
      domain: 'jobs.example.test',
      platform: 'Lever'
    }]
  };
  assert.equal(findCustomAnswer(p, field({
    label: 'Favorite editor?'
  }), 'Lever', 'jobs.example.test').answer, 'Vim');
  assert.equal(findCustomAnswer(p, field({
    label: 'Favorite editor?'
  }), 'Lever', 'other.test'), null);
  assert.equal(findCustomAnswer(p, field({
    label: 'Gender'
  }), 'Lever', 'jobs.example.test'), null);
  assert.equal(isLearnableQuestion('Yes'), false);
});
test('rejects ambiguous and unrelated fields', () => {
  for (const label of ['Emergency contact phone', 'Manager email', 'Why do you want this job?', 'Programming languages']) assert.equal(match(field({
    label
  })), null);
  assert.equal(match(field({
    nearby: 'First name'
  })), null);
});
test('resolves names and languages safely', () => {
  const p = {
    personal: {
      firstName: 'Ada',
      lastName: 'Lovelace'
    },
    languages: [{
      name: 'English',
      proficiency: 'Fluent'
    }, {
      name: 'Polish',
      proficiency: 'Native'
    }]
  };
  assert.equal(valueAt(p, 'personal.fullName'), 'Ada Lovelace');
  assert.equal(valueAt(p, 'languages.summary'), 'English (Fluent), Polish (Native)');
  assert.equal(valueAt(p, 'languages.singleName'), undefined);
});
