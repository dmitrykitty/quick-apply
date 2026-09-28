(function (root) {
  'use strict';

  const personalKeys = ['firstName', 'lastName', 'preferredName', 'email', 'phoneCountry', 'phoneCountryCode', 'phone', 'phoneType', 'addressLine1', 'addressLine2', 'city', 'stateRegion', 'postalCode', 'country', 'currentLocation', 'pronouns'];
  const declarationKeys = ['openToFutureOpportunities', 'willingToRelocate', 'needsRelocationAssistance', 'workedHereBefore', 'relatedToEmployee', 'convictedFelony', 'terminatedForCause', 'madeRedundantLast12Months', 'governmentEmployee', 'publicSectorLink', 'consentBackgroundCheck', 'consentAutomatedReview', 'consentMarketing', 'age18Plus'];
  const disclosureKeys = ['gender', 'ethnicity', 'veteranStatus', 'disabilityStatus', 'sexualOrientation'];
  const string = x => typeof x === 'string' ? x.trim() : '';
  const boolean = x => typeof x === 'boolean' ? x : null;
  const strings = (x, n) => Array.isArray(x) ? x.filter(y => typeof y === 'string').map(string).filter(Boolean).slice(0, n) : [];
  function phoneCountryIso(personal) {
    const countries = root.OpenApplyCountries || [];
    const given = string(personal.phoneCountry);
    const country = string(personal.country);
    return countries.find(x => x.iso.toLowerCase() === given.toLowerCase() || x.name.toLowerCase() === given.toLowerCase())?.iso || countries.find(x => x.name.toLowerCase() === country.toLowerCase() && x.callingCode === string(personal.phoneCountryCode))?.iso || given;
  }
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  function date(year, month) {
    if (!year) return '';
    const raw = String(month ?? '').trim().toLowerCase();
    const i = months.findIndex(x => x === raw || x.slice(0, 3) === raw);
    const n = /^\d{1,2}$/.test(raw) ? Number(raw) : i + 1;
    return n >= 1 && n <= 12 ? `${year}-${String(n).padStart(2, '0')}` : String(year);
  }
  const emptyProfile = () => ({
    schemaVersion: 2,
    personal: Object.fromEntries(personalKeys.map(k => [k, ''])),
    links: {
      linkedin: '',
      github: '',
      portfolio: '',
      websites: []
    },
    applicationDefaults: {
      source: '',
      preferredWorkLocation: '',
      noticePeriod: '',
      earliestStartDate: ''
    },
    experience: [],
    education: [],
    skills: [],
    languages: [],
    customAnswers: [],
    workAuthorization: {
      defaultAuthorizedToWork: null,
      defaultRequiresSponsorship: null,
      overrides: []
    },
    declarations: Object.fromEntries(declarationKeys.map(k => [k, null])),
    voluntaryDisclosures: {
      autofill: false,
      ...Object.fromEntries(disclosureKeys.map(k => [k, '']))
    }
  });
  function normalizeProfile(input) {
    const p = emptyProfile();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return p;
    const personal = input.personal || {};
    for (const k of personalKeys) p.personal[k] = string(personal[k]);
    p.personal.phoneCountry = phoneCountryIso(personal);
    p.personal.addressLine1 ||= string(personal.address);
    p.personal.stateRegion ||= string(personal.state);
    for (const k of ['linkedin', 'github', 'portfolio']) p.links[k] = string(input.links?.[k]);
    p.links.websites = strings(input.links?.websites, 2);
    for (const k of Object.keys(p.applicationDefaults)) p.applicationDefaults[k] = string(input.applicationDefaults?.[k]);
    p.education = Array.isArray(input.education) ? input.education.slice(0, 50).filter(x => x && typeof x === 'object').map(x => ({
      institution: string(x.institution),
      institutionAlternatives: strings(x.institutionAlternatives, 20),
      degree: string(x.degree),
      degreeAlternatives: strings(x.degreeAlternatives, 20),
      fieldOfStudy: string(x.fieldOfStudy),
      fieldOfStudyAlternatives: strings(x.fieldOfStudyAlternatives, 20),
      startDate: string(x.startDate) || date(x.startYear, x.startMonth),
      graduationDate: string(x.graduationDate) || string(x.endDate) || date(x.graduationYear || x.endYear, x.graduationMonth || x.endMonth),
      gpa: string(x.gpa)
    })) : [];
    p.experience = Array.isArray(input.experience) ? input.experience.slice(0, 50).filter(x => x && typeof x === 'object').map(x => ({
      title: string(x.title),
      company: string(x.company),
      location: string(x.location),
      startDate: string(x.startDate) || date(x.startYear, x.startMonth),
      endDate: string(x.endDate) || date(x.endYear, x.endMonth),
      current: boolean(x.current) === true,
      description: string(x.description)
    })) : [];
    p.skills = strings(input.skills, 200);
    p.languages = Array.isArray(input.languages) ? input.languages.slice(0, 50).map(x => typeof x === 'string' ? {
      name: string(x),
      proficiency: ''
    } : {
      name: string(x?.name),
      proficiency: string(x?.proficiency)
    }).filter(x => x.name) : [];
    p.customAnswers = Array.isArray(input.customAnswers) ? input.customAnswers.slice(0, 100).filter(x => x && typeof x === 'object').map(x => ({
      question: string(x.question),
      answer: string(x.answer),
      controlType: string(x.controlType),
      domain: string(x.domain),
      platform: string(x.platform)
    })).filter(x => x.question && x.answer && x.domain) : [];
    const a = input.workAuthorization || {};
    p.workAuthorization.defaultAuthorizedToWork = boolean(a.defaultAuthorizedToWork);
    p.workAuthorization.defaultRequiresSponsorship = boolean(a.defaultRequiresSponsorship);
    p.workAuthorization.overrides = Array.isArray(a.overrides) ? a.overrides.slice(0, 50).map(x => ({
      jurisdiction: string(x?.jurisdiction),
      authorizedToWork: boolean(x?.authorizedToWork),
      requiresSponsorship: boolean(x?.requiresSponsorship)
    })).filter(x => x.jurisdiction) : [];
    if (!input.schemaVersion || input.schemaVersion < 2) {
      p.workAuthorization.defaultRequiresSponsorship ??= boolean(input.commonAnswers?.sponsorshipRequired);
      const legacyAuthorized = ['authorizedInEU', 'authorizedInUK', 'authorizedInUS'].map(k => boolean(a[k])).filter(x => x !== null);
      if (p.workAuthorization.defaultAuthorizedToWork === null && legacyAuthorized.length && legacyAuthorized.every(x => x === legacyAuthorized[0])) p.workAuthorization.defaultAuthorizedToWork = legacyAuthorized[0];
      for (const [jurisdiction, authorizedKey, visaKey] of [['EU', 'authorizedInEU', 'requiresVisaEU'], ['UK', 'authorizedInUK', 'requiresVisaUK'], ['US', 'authorizedInUS', 'requiresVisaUS']]) {
        const authorizedToWork = boolean(a[authorizedKey]),
          requiresSponsorship = boolean(a[visaKey]);
        if ((authorizedToWork !== null || requiresSponsorship !== null) && !p.workAuthorization.overrides.some(x => x.jurisdiction === jurisdiction)) p.workAuthorization.overrides.push({
          jurisdiction,
          authorizedToWork,
          requiresSponsorship
        });
      }
    }
    for (const k of declarationKeys) p.declarations[k] = boolean(input.declarations?.[k]);
    if (!input.schemaVersion || input.schemaVersion < 2) {
      p.declarations.workedHereBefore ??= boolean(input.commonAnswers?.previousEmployee);
      p.declarations.age18Plus ??= boolean(input.commonAnswers?.age18Plus);
      p.declarations.willingToRelocate ??= boolean(a.willingToRelocate) ?? boolean(input.commonAnswers?.relocation);
    }
    p.voluntaryDisclosures.autofill = input.voluntaryDisclosures?.autofill === true;
    for (const k of disclosureKeys) p.voluntaryDisclosures[k] = string(input.voluntaryDisclosures?.[k]);
    return p;
  }
  function fromJobPrefill(input) {
    if (!input || typeof input !== 'object' || !input.personal || !Array.isArray(input.workExperience)) throw new Error('Not a supported JobPrefill export.');
    const x = input.personal,
      d = input.declarations || {};
    return normalizeProfile({
      schemaVersion: 2,
      personal: {
        ...x,
        stateRegion: x.state,
        phoneCountry: x.phoneCountry || ''
      },
      links: {
        linkedin: x.linkedinUrl,
        portfolio: x.websiteUrl,
        websites: x.websites
      },
      applicationDefaults: {
        source: x.howDidYouHearAboutUs,
        noticePeriod: x.noticePeriod
      },
      experience: input.workExperience.map(y => ({
        title: y.jobTitle,
        company: y.company,
        location: y.location,
        startDate: date(y.startYear, y.startMonth),
        endDate: date(y.endYear, y.endMonth),
        current: y.currentRole,
        description: y.description
      })),
      education: (input.education || []).map(y => ({
        institution: y.institution,
        institutionAlternatives: y.institutionAlternatives,
        degree: y.degree,
        degreeAlternatives: y.degreeAlternatives,
        fieldOfStudy: y.fieldOfStudy,
        fieldOfStudyAlternatives: y.fieldOfStudyAlternatives,
        startDate: date(y.startYear, y.startMonth),
        graduationDate: date(y.graduationYear, y.graduationMonth),
        gpa: y.gpa
      })),
      skills: input.skills,
      languages: input.languages,
      workAuthorization: {
        defaultAuthorizedToWork: d.authorizedToWork,
        defaultRequiresSponsorship: d.requireSponsorship
      },
      declarations: {
        openToFutureOpportunities: d.openToFutureRoles,
        willingToRelocate: d.willingToRelocate,
        needsRelocationAssistance: d.relocationAssistance,
        workedHereBefore: d.workedHereBefore,
        relatedToEmployee: d.relatedToEmployee,
        convictedFelony: d.convictedOfFelony,
        terminatedForCause: d.terminatedForCause,
        madeRedundantLast12Months: d.madeRedundantRecently,
        governmentEmployee: d.governmentEmployee,
        publicSectorLink: d.publicSectorLink,
        consentBackgroundCheck: d.backgroundCheckConsent,
        consentAutomatedReview: d.aiScreeningConsent,
        consentMarketing: d.marketingContactConsent,
        age18Plus: d.atLeast18
      },
      voluntaryDisclosures: input.voluntaryDisclosures
    });
  }
  function importProfile(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Expected a JSON profile object.');
    if (Array.isArray(input.workExperience)) return fromJobPrefill(input);
    if (input.schemaVersion !== undefined && input.schemaVersion !== 1 && input.schemaVersion !== 2) throw new Error(`Unsupported schemaVersion: ${input.schemaVersion}.`);
    if (!input.personal || typeof input.personal !== 'object' || Array.isArray(input.personal)) throw new Error('Missing or invalid personal object.');
    for (const k of ['education', 'experience', 'skills', 'languages']) if (input[k] !== undefined && !Array.isArray(input[k])) throw new Error(`${k} must be an array.`);
    for (const k of ['links', 'workAuthorization', 'declarations', 'voluntaryDisclosures']) if (input[k] !== undefined && (!input[k] || typeof input[k] !== 'object' || Array.isArray(input[k]))) throw new Error(`${k} must be an object.`);
    if (input.workAuthorization?.overrides !== undefined && !Array.isArray(input.workAuthorization.overrides)) throw new Error('workAuthorization.overrides must be an array.');
    for (const [group, keys] of [['personal', personalKeys], ['links', ['linkedin', 'github', 'portfolio']], ['applicationDefaults', ['source', 'preferredWorkLocation', 'noticePeriod', 'earliestStartDate']], ['voluntaryDisclosures', disclosureKeys]]) for (const key of keys) {
      const value = input[group]?.[key];
      if (value !== undefined && typeof value !== 'string') throw new Error(`${group}.${key} must be text.`);
    }
    if (input.links?.websites !== undefined && !Array.isArray(input.links.websites)) throw new Error('links.websites must be an array.');
    for (const key of ['education', 'experience']) for (const [i, item] of (input[key] || []).entries()) {
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${key}[${i}] must be an object.`);
      if (key === 'education') for (const alt of ['institutionAlternatives', 'degreeAlternatives', 'fieldOfStudyAlternatives']) if (item[alt] !== undefined && !Array.isArray(item[alt])) throw new Error(`education[${i}].${alt} must be an array.`);
    }
    return normalizeProfile(input);
  }
  function exampleProfile() {
    return normalizeProfile({
      schemaVersion: 2,
      personal: {
        firstName: 'Ada',
        lastName: 'Example',
        email: 'ada@example.test',
        phoneCountry: 'PL',
        phoneCountryCode: '+48',
        phone: '123456789',
        city: 'Warsaw',
        country: 'Poland'
      },
      links: {
        linkedin: 'https://example.test/ada',
        websites: ['https://portfolio.example.test']
      },
      applicationDefaults: {
        source: 'Company careers page',
        preferredWorkLocation: 'Remote',
        noticePeriod: '2 weeks',
        earliestStartDate: '2026-10-01'
      },
      experience: [{
        title: 'Engineer',
        company: 'Example Co',
        location: 'Warsaw',
        startDate: '2022-01',
        current: true,
        description: 'Built software.'
      }],
      education: [{
        institution: 'Example University',
        institutionAlternatives: ['Example U'],
        degree: 'Bachelor of Science',
        degreeAlternatives: ['BS'],
        fieldOfStudy: 'Computer Science',
        fieldOfStudyAlternatives: ['CS'],
        startDate: '2018-09',
        graduationDate: '2022-06'
      }],
      skills: ['JavaScript'],
      languages: [{
        name: 'English',
        proficiency: 'Fluent'
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
      declarations: {
        age18Plus: true
      },
      voluntaryDisclosures: {
        autofill: false,
        gender: 'Woman'
      }
    });
  }
  function parseLanguageLines(text) {
    return String(text ?? '').split(/\r?\n/).map(line => {
      const [name, ...proficiency] = line.split('|');
      return {
        name: string(name),
        proficiency: string(proficiency.join('|'))
      };
    }).filter(x => x.name);
  }
  function formatLanguageLines(languages) {
    return (languages || []).map(x => `${x.name}${x.proficiency ? ` | ${x.proficiency}` : ''}`).join('\n');
  }
  const api = {
    emptyProfile,
    normalizeProfile,
    fromJobPrefill,
    importProfile,
    exampleProfile,
    parseLanguageLines,
    formatLanguageLines,
    personalKeys,
    declarationKeys,
    disclosureKeys
  };
  root.OpenApplySchema = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
