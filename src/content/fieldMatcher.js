(function (root) {
  'use strict';

  const normalize = root.OpenApplyText.normalize;
  const aliases = {
    'personal.firstName': ['first name', 'given name', 'legal first name', 'fname', 'firstname', 'imie'],
    'personal.lastName': ['last name', 'family name', 'surname', 'legal last name', 'lname', 'lastname', 'nazwisko'],
    'personal.preferredName': ['preferred name', 'chosen name'],
    'personal.fullName': ['full name', 'your name', 'applicant name'],
    'personal.email': ['email', 'email address', 'e mail'],
    'personal.phone': ['phone', 'phone number', 'mobile', 'mobile phone', 'telephone', 'contact number', 'numer telefonu', 'telefon'],
    'personal.phoneCountryCode': ['phone country code', 'telephone country code', 'calling code', 'international dialing code'],
    'personal.phoneCountry': ['phone country', 'telephone country'],
    'personal.phoneType': ['phone type', 'telephone type'],
    'personal.addressLine1': ['address', 'street address', 'address line 1', 'adres', 'ulica'],
    'personal.addressLine2': ['address line 2', 'apartment suite', 'apartment number'],
    'personal.city': ['city', 'current city', 'city of residence', 'miasto'],
    'personal.stateRegion': ['state', 'state region', 'province', 'region of residence', 'wojewodztwo'],
    'personal.postalCode': ['postal code', 'post code', 'zip code', 'zipcode', 'zip', 'kod pocztowy'],
    'personal.country': ['country', 'country of residence', 'kraj'],
    'personal.currentLocation': ['current location', 'where are you currently located'],
    'personal.pronouns': ['pronouns', 'preferred pronouns'],
    'links.linkedin': ['linkedin', 'linkedin url', 'linkedin profile'],
    'links.github': ['github', 'github url', 'github profile'],
    'links.portfolio': ['portfolio', 'portfolio url', 'personal website', 'website'],
    'applicationDefaults.source': ['how did you hear about us', 'how did you find us', 'application source', 'source of application'],
    'applicationDefaults.preferredWorkLocation': ['preferred work location', 'preferred job location', 'preferred office location'],
    'applicationDefaults.noticePeriod': ['notice period', 'notice required', 'current notice period'],
    'applicationDefaults.earliestStartDate': ['earliest start date', 'earliest available start date', 'when can you start'],
    'skills.summary': ['skills', 'key skills', 'technical skills', 'umiejetnosci'],
    'experience.0.company': ['current company', 'most recent company', 'employer', 'company name', 'employer name', 'pracodawca', 'nazwa firmy'],
    'experience.0.title': ['current title', 'current job title', 'most recent job title', 'job title', 'position title', 'stanowisko'],
    'experience.0.location': ['work location', 'job location', 'employment location', 'lokalizacja pracy'],
    'experience.0.startDate': ['employment start date', 'work start date', 'job start date', 'start date', 'data rozpoczecia pracy'],
    'experience.0.endDate': ['employment end date', 'work end date', 'job end date', 'end date', 'data zakonczenia pracy'],
    'experience.0.current': ['current role', 'currently employed', 'i currently work here', 'obecnie pracuje'],
    'experience.0.description': ['job description', 'role description', 'work description', 'responsibilities'],
    'education.0.institution': ['school', 'university', 'institution', 'college', 'school name', 'uczelnia', 'uniwersytet', 'nazwa uczelni'],
    'education.0.degree': ['degree', 'degree level', 'stopien', 'poziom wyksztalcenia'],
    'education.0.fieldOfStudy': ['field of study', 'major', 'kierunek studiow'],
    'education.0.startDate': ['education start date', 'school start date', 'study start date', 'start date', 'data rozpoczecia studiow'],
    'education.0.graduationDate': ['expected graduation date', 'expected completion date', 'graduation date', 'anticipated graduation', 'expected graduation', 'education end date', 'school end date', 'end date', 'przewidywana data ukonczenia studiow', 'data ukonczenia studiow'],
    'education.0.gpa': ['gpa', 'grade point average'],
    'languages.summary': ['languages', 'languages spoken', 'spoken languages', 'languages you speak'],
    'languages.singleName': ['language', 'primary language', 'native language'],
    'languages.singleProficiency': ['language proficiency', 'language fluency', 'fluency level'],
    'workAuthorization.defaultAuthorizedToWork': ['authorized to work', 'eligible to work', 'authorized to work in us', 'authorized to work in uk', 'authorized to work in eu', 'authorized to work in united states', 'authorized to work in united kingdom', 'authorized to work in european union', 'uprawniony do pracy', 'prawo do pracy', 'prawo do pracy w ue', 'uprawniony do pracy w ue'],
    'workAuthorization.defaultRequiresSponsorship': ['require sponsorship', 'need sponsorship', 'visa sponsorship', 'require visa sponsorship', 'require sponsorship in us', 'require sponsorship in uk', 'require sponsorship in eu'],
    'declarations.openToFutureOpportunities': ['open to future opportunities', 'consider me for future roles'],
    'declarations.willingToRelocate': ['willing to relocate', 'open to relocation', 'gotowosc do relokacji'],
    'declarations.needsRelocationAssistance': ['need relocation assistance', 'require relocation assistance'],
    'declarations.workedHereBefore': ['previous employee', 'worked here before', 'previously employed'],
    'declarations.relatedToEmployee': ['related to an employee', 'relative of an employee'],
    'declarations.convictedFelony': ['convicted of a felony', 'felony conviction'],
    'declarations.terminatedForCause': ['terminated for cause', 'dismissed for cause'],
    'declarations.madeRedundantLast12Months': ['made redundant in the last 12 months'],
    'declarations.governmentEmployee': ['government employee', 'employed by a government'],
    'declarations.publicSectorLink': ['public sector link', 'public sector connection'],
    'declarations.consentBackgroundCheck': ['consent to background check', 'agree to background check'],
    'declarations.consentAutomatedReview': ['consent to automated review', 'consent to ai screening'],
    'declarations.consentMarketing': ['consent to marketing', 'marketing contact consent'],
    'declarations.age18Plus': ['at least 18', '18 years of age', 'over 18'],
    'voluntaryDisclosures.gender': ['gender'],
    'voluntaryDisclosures.ethnicity': ['ethnicity', 'ethnic background'],
    'voluntaryDisclosures.veteranStatus': ['veteran status'],
    'voluntaryDisclosures.disabilityStatus': ['disability status'],
    'voluntaryDisclosures.sexualOrientation': ['sexual orientation']
  };
  const weights = {
    label: 110,
    ariaLabel: 105,
    name: 85,
    id: 82,
    placeholder: 82,
    nearby: 45
  };
  const BLOCKED = /\b(reference|referral|referee|referrer|recommender|emergency|manager|recruiter|friend|spouse|parent|guardian|programming|coding)\b/;
  const SENSITIVE = /\b(gender|plec|ethnicity|ethnic|rasa|race|disability|niepelnosprawnosc|veteran|religion|sexual|demographic|consent|zgoda|zgadzam|certification|certify|declaration|oswiadczenie|acknowledge|agreement|agree|terms|privacy policy|signature|background check|criminal|conviction|felony|karalnosc|social security|date of birth|birthdate|dob)\b/;
  const DATE_PATH = /(?:startDate|StartDate|endDate|graduationDate)$/;
  function scoreText(value, alias, weight) {
    const text = normalize(value),
      term = normalize(alias);
    if (!text || !term) return 0;
    if (text === term) return weight;
    if (text.startsWith(`${term} `) || text.endsWith(` ${term}`)) return weight - 12;
    if (text.includes(` ${term} `)) return weight - 20;
    return 0;
  }
  function match(field) {
    const label = normalize([field.label, field.ariaLabel, field.nearby].join(' '));
    if (BLOCKED.test(label)) return null;
    const sensitive = SENSITIVE.test(label),
      candidates = [];
    for (const [path, terms] of Object.entries(aliases)) {
      const bool = /^(?:workAuthorization|declarations)\.|\.current$/.test(path);
      if (['checkbox', 'radio'].includes(field.type) && !bool && !path.startsWith('voluntaryDisclosures.')) continue;
      if (['email', 'tel', 'url'].includes(field.type) && !(field.type === 'email' && path === 'personal.email') && !(field.type === 'tel' && (path === 'personal.phone' || path === 'personal.phoneCountryCode')) && !(field.type === 'url' && path.startsWith('links.'))) continue;
      if (['month', 'date'].includes(field.type) && !DATE_PATH.test(path)) continue;
      if (bool && ['text', 'textarea', 'email', 'tel', 'url', 'date', 'month'].includes(field.type)) continue;
      if (sensitive || path.startsWith('voluntaryDisclosures.')) {
        if (!path.startsWith('declarations.') && !path.startsWith('voluntaryDisclosures.')) continue;
        const exact = normalize(field.label || field.ariaLabel);
        if (!terms.some(term => normalize(term) === exact)) continue;
      }
      let score = 0;
      for (const term of terms) for (const [key, weight] of Object.entries(weights)) score = Math.max(score, scoreText(field[key], term, weight));
      if (score) {
        const context = normalize([field.context, field.name, field.id].join(' ')),
          education = /\b(education|school|university|college|study|studies|uczelnia|studi|wyksztalcenie)\b/.test(context),
          experience = /\b(experience|employment|work history|job history|doswiadczenie|zatrudnienie)\b/.test(context);
        if (path.startsWith('education.') && education) score += 24;
        if (path.startsWith('experience.') && experience) score += 24;
        if (path.startsWith('education.') && experience) score -= 35;
        if (path.startsWith('experience.') && education) score -= 35;
      }
      if (score >= 80) candidates.push({
        path,
        score
      });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length || candidates[1] && candidates[0].score - candidates[1].score < 8) return null;
    return {
      ...candidates[0],
      confidence: candidates[0].score >= 100 ? 'high' : 'medium'
    };
  }
  function jurisdictionFromField(field) {
    const text = normalize([field?.label, field?.ariaLabel, field?.nearby].join(' '));
    if (!text) return '';
    const known = [['US', /\b(us|usa|united states)\b/], ['UK', /\b(uk|united kingdom|great britain)\b/], ['EU', /\b(eu|european union)\b/]].filter(([, pattern]) => pattern.test(text));
    if (known.length > 1) return 'ambiguous';
    if (known.length === 1) return known[0][0];
    const inMatch = text.match(/\b(?:in|for) ([a-z ]+)$/);
    return inMatch ? inMatch[1].trim() : '';
  }
  function authValue(profile, key, field) {
    const auth = profile.workAuthorization || {},
      jurisdiction = jurisdictionFromField(field);
    if (jurisdiction === 'ambiguous') return undefined;
    if (jurisdiction) {
      const overrides = (auth.overrides || []).filter(x => normalize(x.jurisdiction) === normalize(jurisdiction));
      const values = overrides.map(x => x[key === 'defaultAuthorizedToWork' ? 'authorizedToWork' : 'requiresSponsorship']).filter(x => typeof x === 'boolean');
      if (values.length > 1 && !values.every(x => x === values[0])) return undefined;
      const value = values[0];
      if (typeof value === 'boolean') return value;
    }
    return auth[key];
  }
  function valueAt(profile, path, field) {
    if (path === 'personal.fullName') return [profile.personal?.firstName, profile.personal?.lastName].filter(Boolean).join(' ');
    if (path === 'skills.summary') return (profile.skills || []).join(', ');
    if (path === 'languages.summary') return (profile.languages || []).map(x => `${x.name}${x.proficiency ? ` (${x.proficiency})` : ''}`).join(', ');
    if (path === 'languages.singleName' || path === 'languages.singleProficiency') {
      if (profile.languages?.length !== 1) return undefined;
      return path === 'languages.singleName' ? profile.languages[0].name : profile.languages[0].proficiency;
    }
    if (path.startsWith('workAuthorization.default')) return authValue(profile, path.split('.')[1], field);
    if (path.startsWith('voluntaryDisclosures.') && !profile.voluntaryDisclosures?.autofill) return undefined;
    return path.split('.').reduce((value, key) => value?.[key], profile);
  }
  function candidatesAt(profile, path, field) {
    const value = valueAt(profile, path, field);
    if (value === undefined || value === null || value === '') return value;
    const match = path.match(/^education\.(\d+)\.(institution|degree|fieldOfStudy)$/);
    if (!match) return value;
    const alternatives = profile.education?.[Number(match[1])]?.[`${match[2]}Alternatives`] || [];
    return [value, ...alternatives];
  }
  function isSensitiveQuestion(value) {
    return SENSITIVE.test(normalize(value));
  }
  function isLearnableQuestion(value) {
    const q = normalize(value);
    return q.length >= 8 && q.split(' ').length >= 2 && !isSensitiveQuestion(q);
  }
  function findCustomAnswer(profile, field, platform, domain) {
    const q = normalize(field.label || field.ariaLabel || field.nearby);
    if (!isLearnableQuestion(q)) return null;
    return (profile.customAnswers || []).find(x => x.domain === domain && (!x.platform || x.platform === platform) && x.controlType === field.type && normalize(x.question) === q) || null;
  }
  const api = {
    match,
    valueAt,
    candidatesAt,
    aliases,
    isSensitiveQuestion,
    isLearnableQuestion,
    findCustomAnswer,
    authValue,
    jurisdictionFromField
  };
  root.OpenApplyMatcher = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
