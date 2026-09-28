const {
  test
} = require('node:test');
const assert = require('node:assert/strict');
require('../src/profile/countries');
const {
  emptyProfile,
  normalizeProfile,
  fromJobPrefill,
  importProfile,
  exampleProfile,
  parseLanguageLines,
  formatLanguageLines
} = require('../src/profile/schema');
test('v2 normalization keeps declared fields and drops unknown data', () => {
  const p = normalizeProfile({
    schemaVersion: 2,
    personal: {
      firstName: ' Ada ',
      phoneCountry: 'PL',
      phoneCountryCode: '+48',
      secret: 'do not persist'
    },
    links: {
      websites: [' https://one.test ', 'https://two.test', 'https://third.test']
    },
    education: [{
      institution: 'School',
      institutionAlternatives: [' First ', 'Second'],
      degree: 'BS',
      graduationDate: '2028-02'
    }],
    voluntaryDisclosures: {
      gender: 'Woman'
    }
  });
  assert.equal(p.schemaVersion, 2);
  assert.equal(p.personal.firstName, 'Ada');
  assert.equal(p.personal.phoneCountryCode, '+48');
  assert.equal(p.personal.secret, undefined);
  assert.deepEqual(p.links.websites, ['https://one.test', 'https://two.test']);
  assert.deepEqual(p.education[0].institutionAlternatives, ['First', 'Second']);
  assert.equal(p.voluntaryDisclosures.autofill, false);
  assert.equal(p.declarations.age18Plus, null);
  assert.deepEqual(emptyProfile().experience, []);
});
test('migrates the current schema without losing existing answers', () => {
  const p = normalizeProfile({
    personal: {
      address: '1 Example St',
      firstName: 'Ada'
    },
    education: [{
      institution: 'School',
      startYear: '2024',
      endYear: '2028',
      current: true
    }],
    experience: [{
      company: 'Example Co',
      title: 'Engineer'
    }],
    workAuthorization: {
      authorizedInEU: true,
      requiresVisaEU: false,
      authorizedInUK: false,
      willingToRelocate: true
    },
    commonAnswers: {
      previousEmployee: false,
      age18Plus: true,
      sponsorshipRequired: true,
      relocation: false
    },
    customAnswers: [{
      question: 'Favorite editor?',
      answer: 'Vim',
      controlType: 'text',
      domain: 'jobs.example.test'
    }]
  });
  assert.equal(p.personal.addressLine1, '1 Example St');
  assert.equal(p.education[0].graduationDate, '2028');
  assert.equal(p.experience[0].company, 'Example Co');
  assert.deepEqual(p.workAuthorization.overrides, [{
    jurisdiction: 'EU',
    authorizedToWork: true,
    requiresSponsorship: false
  }, {
    jurisdiction: 'UK',
    authorizedToWork: false,
    requiresSponsorship: null
  }]);
  assert.equal(p.workAuthorization.defaultRequiresSponsorship, true);
  assert.equal(p.declarations.workedHereBefore, false);
  assert.equal(p.declarations.age18Plus, true);
  assert.equal(p.declarations.willingToRelocate, true);
  assert.equal(p.customAnswers[0].answer, 'Vim');
});
test('imports JobPrefill fields while excluding document data', () => {
  const p = fromJobPrefill({
    personal: {
      firstName: 'Ada',
      addressLine1: '1 Example St',
      country: 'Poland',
      phoneCountryCode: '+48',
      phoneType: 'Mobile',
      linkedinUrl: 'https://example.test',
      howDidYouHearAboutUs: 'Career fair'
    },
    workExperience: [{
      company: 'Engines',
      jobTitle: 'Engineer',
      startYear: '2020',
      startMonth: '03',
      currentRole: true
    }],
    education: [{
      institution: 'School',
      institutionAlternatives: ['S1', 'S2'],
      degree: 'BS',
      graduationYear: '2019',
      graduationMonth: '06'
    }],
    skills: ['JavaScript'],
    declarations: {
      atLeast18: true,
      requireSponsorship: false
    },
    voluntaryDisclosures: {
      gender: 'Woman'
    },
    documents: {
      resumeData: 'sensitive-data'
    }
  });
  assert.equal(p.personal.addressLine1, '1 Example St');
  assert.equal(p.personal.phoneCountry, 'PL');
  assert.equal(p.personal.phoneCountryCode, '+48');
  assert.equal(p.links.linkedin, 'https://example.test');
  assert.equal(p.applicationDefaults.source, 'Career fair');
  assert.equal(p.experience[0].startDate, '2020-03');
  assert.equal(p.education[0].graduationDate, '2019-06');
  assert.deepEqual(p.education[0].institutionAlternatives, ['S1', 'S2']);
  assert.equal(p.declarations.age18Plus, true);
  assert.equal(p.workAuthorization.defaultRequiresSponsorship, false);
  assert.equal(p.voluntaryDisclosures.autofill, false);
  assert.equal(JSON.stringify(p).includes('sensitive-data'), false);
});
test('validates imports and template is complete, fixed example data', () => {
  assert.throws(() => importProfile(null), /JSON profile object/);
  assert.throws(() => importProfile({
    foo: 1
  }), /personal/);
  assert.throws(() => importProfile({
    schemaVersion: 3,
    personal: {}
  }), /Unsupported schemaVersion/);
  assert.throws(() => importProfile({
    personal: {},
    education: {}
  }), /education must be an array/);
  assert.throws(() => importProfile({ personal: { firstName: 4 } }), /personal.firstName must be text/);
  assert.throws(() => importProfile({ personal: {}, education: [{ institutionAlternatives: 'Alias' }] }), /institutionAlternatives must be an array/);
  assert.throws(() => fromJobPrefill({
    personal: {}
  }), /Not a supported/);
  const template = exampleProfile();
  assert.equal(template.schemaVersion, 2);
  assert.deepEqual(Object.keys(template), Object.keys(emptyProfile()));
  assert.equal(template.personal.firstName, 'Ada');
  assert.equal(template.voluntaryDisclosures.autofill, false);
  assert.deepEqual(importProfile(JSON.parse(JSON.stringify(template))), template);
});
test('v2 JSON export and import round trip preserves ordered alternatives and overrides', () => {
  const source = normalizeProfile({
    schemaVersion: 2,
    personal: {
      firstName: 'Grace',
      phoneCountry: 'GB',
      phoneCountryCode: '+44'
    },
    education: [{
      institution: 'University',
      institutionAlternatives: ['U', 'Uni'],
      degree: 'Bachelor',
      degreeAlternatives: ['BSc', 'BS']
    }],
    workAuthorization: {
      defaultAuthorizedToWork: true,
      defaultRequiresSponsorship: false,
      overrides: [{
        jurisdiction: 'US',
        authorizedToWork: false,
        requiresSponsorship: true
      }]
    },
    voluntaryDisclosures: {
      autofill: true,
      gender: 'Woman'
    }
  });
  assert.deepEqual(importProfile(JSON.parse(JSON.stringify(source))), source);
  assert.deepEqual(source.education[0].degreeAlternatives, ['BSc', 'BS']);
});
test('languages round trip through editor format', () => {
  const lines = ' English | Fluent\nPolish | Native\n French \n';
  const languages = parseLanguageLines(lines);
  assert.deepEqual(languages, [{
    name: 'English',
    proficiency: 'Fluent'
  }, {
    name: 'Polish',
    proficiency: 'Native'
  }, {
    name: 'French',
    proficiency: ''
  }]);
  assert.equal(formatLanguageLines(languages), 'English | Fluent\nPolish | Native\nFrench');
  assert.deepEqual(normalizeProfile({
    languages
  }).languages, languages);
});
