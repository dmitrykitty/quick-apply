(function (root) {
  'use strict';
  const normalize = root.OpenApplyText.normalize;
  const aliases = {
    'personal.firstName': ['first name', 'given name', 'legal first name', 'fname', 'firstname'],
    'personal.lastName': ['last name', 'family name', 'surname', 'legal last name', 'lname', 'lastname'],
    'personal.preferredName': ['preferred name', 'chosen name'],
    'personal.fullName': ['full name', 'your name', 'applicant name'],
    'personal.email': ['email', 'email address', 'e mail'],
    'personal.phone': ['phone', 'phone number', 'mobile', 'mobile phone', 'telephone', 'contact number'],
    'personal.city': ['city', 'current city', 'city of residence'],
    'personal.country': ['country', 'country of residence'],
    'personal.address': ['address', 'street address', 'address line 1'],
    'personal.postalCode': ['postal code', 'post code', 'zip code', 'zipcode', 'zip'],
    'links.linkedin': ['linkedin', 'linkedin url', 'linkedin profile'],
    'links.github': ['github', 'github url', 'github profile'],
    'links.portfolio': ['portfolio', 'portfolio url', 'personal website', 'website'],
    'experience.0.company': ['current company', 'most recent company', 'employer', 'company name'],
    'experience.0.title': ['current title', 'current job title', 'most recent job title'],
    'education.0.institution': ['school', 'university', 'institution', 'college'],
    'education.0.degree': ['degree'],
    'education.0.fieldOfStudy': ['field of study', 'major'],
    'commonAnswers.previousEmployee': ['previous employee', 'worked here before', 'previously employed'],
    'commonAnswers.age18Plus': ['at least 18', '18 years of age', 'over 18'],
    'commonAnswers.sponsorshipRequired': ['require sponsorship', 'need sponsorship', 'visa sponsorship'],
    'commonAnswers.relocation': ['willing to relocate', 'open to relocation'],
    'workAuthorization.authorizedInEU': ['authorized to work in eu', 'authorized to work in european union'],
    'workAuthorization.requiresVisaEU': ['require visa in eu', 'require sponsorship in eu'],
    'workAuthorization.authorizedInUK': ['authorized to work in uk', 'authorized to work in united kingdom'],
    'workAuthorization.requiresVisaUK': ['require visa in uk', 'require sponsorship in uk'],
    'workAuthorization.authorizedInUS': ['authorized to work in us', 'authorized to work in united states'],
    'workAuthorization.requiresVisaUS': ['require visa in us', 'require sponsorship in us']
  };
  const weights = { label: 110, ariaLabel: 105, name: 85, id: 80, placeholder: 75, nearby: 45 };
  const BLOCKED = /\b(reference|referral|referee|referrer|recommender|emergency|manager|recruiter|friend|spouse|parent|guardian)\b/;
  function scoreText(value, alias, weight) {
    const text = normalize(value);
    const term = normalize(alias);
    if (!text || !term) return 0;
    if (text === term) return weight;
    if (text.startsWith(`${term} `) || text.endsWith(` ${term}`)) return weight - 12;
    if (text.includes(` ${term} `)) return weight - 20;
    return 0;
  }
  function match(field) {
    const label = normalize([field.label, field.ariaLabel, field.nearby].join(' '));
    if (BLOCKED.test(label)) return null;
    const candidates = [];
    for (const [path, terms] of Object.entries(aliases)) {
      let score = 0;
      for (const term of terms) {
        for (const [key, weight] of Object.entries(weights)) score = Math.max(score, scoreText(field[key], term, weight));
      }
      if (score >= 65) candidates.push({ path, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length || (candidates[1] && candidates[0].score === candidates[1].score)) return null;
    return candidates[0];
  }
  function valueAt(profile, path) {
    if (path === 'personal.fullName') return [profile.personal?.firstName, profile.personal?.lastName].filter(Boolean).join(' ');
    return path.split('.').reduce((value, key) => value?.[key], profile);
  }
  root.OpenApplyMatcher = { match, valueAt, aliases };
  if (typeof module !== 'undefined') module.exports = { match, valueAt, aliases };
})(globalThis);
