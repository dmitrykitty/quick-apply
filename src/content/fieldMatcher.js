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
    'personal.city': ['city', 'current city', 'city of residence', 'miasto'],
    'personal.country': ['country', 'country of residence', 'kraj'],
    'personal.address': ['address', 'street address', 'address line 1', 'adres', 'ulica'],
    'personal.postalCode': ['postal code', 'post code', 'zip code', 'zipcode', 'zip', 'kod pocztowy'],
    'links.linkedin': ['linkedin', 'linkedin url', 'linkedin profile'],
    'links.github': ['github', 'github url', 'github profile'],
    'links.portfolio': ['portfolio', 'portfolio url', 'personal website', 'website'],
    'skills.summary': ['skills', 'key skills', 'technical skills', 'umiejetnosci'],
    'experience.0.company': ['current company', 'most recent company', 'employer', 'company name', 'employer name', 'pracodawca', 'nazwa firmy'],
    'experience.0.title': ['current title', 'current job title', 'most recent job title', 'job title', 'position title', 'stanowisko'],
    'experience.0.location': ['work location', 'job location', 'employment location', 'lokalizacja pracy'],
    'experience.0.startDate': ['employment start date', 'work start date', 'job start date', 'start date', 'data rozpoczecia pracy'],
    'experience.0.endDate': ['employment end date', 'work end date', 'job end date', 'end date', 'data zakonczenia pracy'],
    'experience.0.current': ['current role', 'currently employed', 'i currently work here', 'obecnie pracuje'],
    'education.0.institution': ['school', 'university', 'institution', 'college', 'school name', 'uczelnia', 'uniwersytet', 'nazwa uczelni'],
    'education.0.degree': ['degree', 'degree level', 'stopien', 'poziom wyksztalcenia'],
    'education.0.fieldOfStudy': ['field of study', 'major', 'kierunek studiow'],
    'education.0.startDate': ['education start date', 'school start date', 'study start date', 'start date', 'data rozpoczecia studiow'],
    'education.0.endDate': ['expected graduation date', 'expected completion date', 'graduation date', 'anticipated graduation', 'expected graduation', 'education end date', 'school end date', 'end date', 'przewidywana data ukonczenia studiow', 'data ukonczenia studiow'],
    'education.0.current': ['currently studying', 'currently enrolled', 'obecnie studiuje'],
    'languages.summary': ['languages', 'languages spoken', 'spoken languages', 'languages you speak'],
    'languages.singleName': ['language', 'primary language', 'native language'],
    'languages.singleProficiency': ['language proficiency', 'language fluency', 'fluency level'],
    'commonAnswers.previousEmployee': ['previous employee', 'worked here before', 'previously employed'],
    'commonAnswers.age18Plus': ['at least 18', '18 years of age', 'over 18'],
    'commonAnswers.sponsorshipRequired': ['require sponsorship', 'need sponsorship', 'visa sponsorship'],
    'workAuthorization.euCitizen': ['eu citizen', 'citizen of eu', 'european union citizen', 'obywatel ue', 'obywatel unii europejskiej'],
    'workAuthorization.willingToRelocate': ['willing to relocate', 'open to relocation', 'gotowosc do relokacji'],
    'workAuthorization.genericAuthorized': ['authorized to work', 'eligible to work', 'uprawniony do pracy', 'prawo do pracy'],
    'workAuthorization.authorizedInEU': ['authorized to work in eu', 'authorized to work in european union', 'prawo do pracy w ue', 'uprawniony do pracy w ue'],
    'workAuthorization.requiresVisaEU': ['require visa in eu', 'require sponsorship in eu'],
    'workAuthorization.authorizedInUK': ['authorized to work in uk', 'authorized to work in united kingdom'],
    'workAuthorization.requiresVisaUK': ['require visa in uk', 'require sponsorship in uk'],
    'workAuthorization.authorizedInUS': ['authorized to work in us', 'authorized to work in united states'],
    'workAuthorization.requiresVisaUS': ['require visa in us', 'require sponsorship in us']
  };
  const weights = { label: 110, ariaLabel: 105, name: 85, id: 82, placeholder: 82, nearby: 45 };
  const BLOCKED = /\b(reference|referral|referee|referrer|recommender|emergency|manager|recruiter|friend|spouse|parent|guardian|programming|coding)\b/;
  const SENSITIVE = /\b(gender|plec|ethnicity|ethnic|rasa|race|disability|niepelnosprawnosc|veteran|religion|sexual|demographic|consent|zgoda|zgadzam|certification|certify|declaration|oswiadczenie|acknowledge|agreement|agree|terms|privacy policy|signature|background check|criminal|conviction|felony|karalnosc|social security|date of birth|birthdate|dob)\b/;
  const BOOLEAN_PATH = /\.(current|euCitizen|authorizedIn|requiresVisa|willingToRelocate|previousEmployee|age18Plus|sponsorshipRequired|relocation|genericAuthorized)/;
  const DATE_PATH = /\.(startDate|endDate)$/;
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
    if (BLOCKED.test(label) || SENSITIVE.test(label)) return null;
    const candidates = [];
    for (const [path, terms] of Object.entries(aliases)) {
      if (field.type === 'checkbox' && !BOOLEAN_PATH.test(path)) continue;
      if (field.type === 'radio' && !BOOLEAN_PATH.test(path)) continue;
      if (['email', 'tel', 'url'].includes(field.type) &&
          !(field.type === 'email' && path === 'personal.email') &&
          !(field.type === 'tel' && path === 'personal.phone') &&
          !(field.type === 'url' && path.startsWith('links.'))) continue;
      if (['month', 'date'].includes(field.type) && !DATE_PATH.test(path)) continue;
      if (BOOLEAN_PATH.test(path) && ['text', 'textarea', 'email', 'tel', 'url', 'date', 'month'].includes(field.type)) continue;
      let score = 0;
      for (const term of terms) {
        for (const [key, weight] of Object.entries(weights)) score = Math.max(score, scoreText(field[key], term, weight));
      }
      if (score) {
        const context = normalize([field.context, field.name, field.id].join(' '));
        const education = /\b(education|school|university|college|study|studies|uczelnia|studi|wyksztalcenie)\b/.test(context);
        const experience = /\b(experience|employment|work history|job history|doswiadczenie|zatrudnienie)\b/.test(context);
        if (path.startsWith('education.') && education) score += 24;
        if (path.startsWith('experience.') && experience) score += 24;
        if (path.startsWith('education.') && experience) score -= 35;
        if (path.startsWith('experience.') && education) score -= 35;
      }
      if (score >= 80) candidates.push({ path, score });
    }
    candidates.sort((a, b) => b.score - a.score);
    if (!candidates.length || (candidates[1] && candidates[0].score - candidates[1].score < 8)) return null;
    return { ...candidates[0], confidence: candidates[0].score >= 100 ? 'high' : 'medium' };
  }
  function valueAt(profile, path) {
    if (path === 'personal.fullName') return [profile.personal?.firstName, profile.personal?.lastName].filter(Boolean).join(' ');
    if (path === 'skills.summary') return (profile.skills || []).join(', ');
    if (path === 'workAuthorization.genericAuthorized') {
      const values = ['authorizedInEU', 'authorizedInUK', 'authorizedInUS'].map(key => profile.workAuthorization?.[key]).filter(value => typeof value === 'boolean');
      return values.length && values.every(value => value === values[0]) ? values[0] : undefined;
    }
    if (path === 'languages.summary') return (profile.languages || []).map(item => `${item.name}${item.proficiency ? ` (${item.proficiency})` : ''}`).join(', ');
    if (path === 'languages.singleName' || path === 'languages.singleProficiency') {
      if (profile.languages?.length !== 1) return undefined;
      return path === 'languages.singleName' ? profile.languages[0].name : profile.languages[0].proficiency;
    }
    return path.split('.').reduce((value, key) => value?.[key], profile);
  }
  function isSensitiveQuestion(value) { return SENSITIVE.test(normalize(value)); }
  function isLearnableQuestion(value) {
    const question = normalize(value);
    return question.length >= 8 && question.split(' ').length >= 2 && !isSensitiveQuestion(question);
  }
  function findCustomAnswer(profile, field, platform, domain) {
    const question = normalize(field.label || field.ariaLabel || field.nearby);
    if (!isLearnableQuestion(question)) return null;
    return (profile.customAnswers || []).find(item => item.domain === domain &&
      (!item.platform || item.platform === platform) && item.controlType === field.type && normalize(item.question) === question) || null;
  }
  root.OpenApplyMatcher = { match, valueAt, aliases, isSensitiveQuestion, isLearnableQuestion, findCustomAnswer };
  if (typeof module !== 'undefined') module.exports = { match, valueAt, aliases, isSensitiveQuestion, isLearnableQuestion, findCustomAnswer };
})(globalThis);
