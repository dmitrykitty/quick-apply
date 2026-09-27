(function (root) {
  'use strict';

  const emptyProfile = () => ({
    personal: { firstName: '', lastName: '', preferredName: '', email: '', phone: '', city: '', country: '', address: '', postalCode: '' },
    links: { linkedin: '', github: '', portfolio: '' },
    education: [],
    experience: [],
    skills: [],
    languages: [],
    workAuthorization: { euCitizen: null, authorizedInEU: null, requiresVisaEU: null, authorizedInUK: null, requiresVisaUK: null, authorizedInUS: null, requiresVisaUS: null, willingToRelocate: null },
    commonAnswers: { previousEmployee: null, age18Plus: null, sponsorshipRequired: null, relocation: null }
  });

  const string = value => typeof value === 'string' ? value.trim() : '';
  const boolean = value => typeof value === 'boolean' ? value : null;
  const date = (year, month) => year ? `${year}${month ? `-${String(month).padStart(2, '0')}` : ''}` : '';

  function normalizeProfile(input) {
    const profile = emptyProfile();
    if (!input || typeof input !== 'object' || Array.isArray(input)) return profile;
    const source = input.personal || {};
    for (const key of Object.keys(profile.personal)) profile.personal[key] = string(source[key]);
    const links = input.links || {};
    for (const key of Object.keys(profile.links)) profile.links[key] = string(links[key]);
    profile.education = Array.isArray(input.education) ? input.education.slice(0, 50).map(item => ({
      institution: string(item.institution), degree: string(item.degree), fieldOfStudy: string(item.fieldOfStudy),
      startYear: string(item.startYear), endYear: string(item.endYear), current: boolean(item.current) === true
    })) : [];
    profile.experience = Array.isArray(input.experience) ? input.experience.slice(0, 50).map(item => ({
      company: string(item.company), title: string(item.title), location: string(item.location), startDate: string(item.startDate),
      endDate: string(item.endDate), current: boolean(item.current) === true, description: string(item.description)
    })) : [];
    profile.skills = Array.isArray(input.skills) ? input.skills.filter(item => typeof item === 'string').map(string).filter(Boolean).slice(0, 200) : [];
    profile.languages = Array.isArray(input.languages) ? input.languages.slice(0, 50).map(item =>
      typeof item === 'string' ? { name: string(item), proficiency: '' } :
        { name: string(item?.name), proficiency: string(item?.proficiency) }
    ).filter(item => item.name) : [];
    for (const group of ['workAuthorization', 'commonAnswers']) {
      for (const key of Object.keys(profile[group])) profile[group][key] = boolean(input[group]?.[key]);
    }
    return profile;
  }

  function parseLanguageLines(text) {
    return String(text ?? '').split(/\r?\n/).map(line => {
      const [name, ...proficiency] = line.split('|');
      return { name: string(name), proficiency: string(proficiency.join('|')) };
    }).filter(item => item.name);
  }

  function formatLanguageLines(languages) {
    return (languages || []).map(item => `${item.name}${item.proficiency ? ` | ${item.proficiency}` : ''}`).join('\n');
  }

  // Convert the user's JobPrefill export at import time; never bundle profile data.
  function fromJobPrefill(input) {
    if (!input || typeof input !== 'object' || !input.personal || !Array.isArray(input.workExperience)) {
      throw new Error('Not a supported JobPrefill export.');
    }
    const p = input.personal;
    const d = input.declarations || {};
    return normalizeProfile({
      personal: {
        firstName: p.firstName, lastName: p.lastName, email: p.email, phone: p.phone,
        city: p.city, country: p.country, address: p.addressLine1, postalCode: p.postalCode
      },
      links: { linkedin: p.linkedinUrl, portfolio: p.websiteUrl },
      education: (input.education || []).map(item => ({
        institution: item.institution, degree: item.degree, fieldOfStudy: item.fieldOfStudy,
        startYear: item.startYear, endYear: item.graduationYear
      })),
      experience: input.workExperience.map(item => ({
        company: item.company, title: item.jobTitle, location: item.location,
        startDate: date(item.startYear, item.startMonth), endDate: date(item.endYear, item.endMonth),
        current: item.currentRole, description: item.description
      })),
      skills: input.skills,
      languages: input.languages,
      workAuthorization: { willingToRelocate: d.willingToRelocate },
      commonAnswers: {
        previousEmployee: d.workedHereBefore, age18Plus: d.atLeast18,
        sponsorshipRequired: d.requireSponsorship, relocation: d.willingToRelocate
      }
    });
  }

  const api = { emptyProfile, normalizeProfile, fromJobPrefill, parseLanguageLines, formatLanguageLines };
  root.OpenApplySchema = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
