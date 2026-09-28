(function () {
  'use strict';

  const schema = globalThis.OpenApplySchema,
    profiles = globalThis.OpenApplyProfiles,
    storage = globalThis.OpenApplyStorage,
    countries = globalThis.OpenApplyCountries,
    $ = id => document.getElementById(id);
  const personalFields = [['firstName', 'First name'], ['lastName', 'Last name'], ['preferredName', 'Preferred name'], ['email', 'Email'], ['phoneCountry', 'Phone country'], ['phoneCountryCode', 'Calling code'], ['phone', 'Phone number'], ['phoneType', 'Phone type'], ['addressLine1', 'Address line 1'], ['addressLine2', 'Address line 2'], ['city', 'City'], ['stateRegion', 'State / region'], ['postalCode', 'Postal code'], ['country', 'Country'], ['currentLocation', 'Current location'], ['pronouns', 'Pronouns']];
  const linkFields = [['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['portfolio', 'Portfolio']];
  const defaultFields = [['source', 'How did you hear about us?'], ['preferredWorkLocation', 'Preferred work location'], ['noticePeriod', 'Notice period'], ['earliestStartDate', 'Earliest start date']];
  const declarationLabels = {
    openToFutureOpportunities: 'Open to future opportunities',
    willingToRelocate: 'Willing to relocate',
    needsRelocationAssistance: 'Need relocation assistance',
    workedHereBefore: 'Worked here before',
    relatedToEmployee: 'Related to an employee',
    convictedFelony: 'Convicted of a felony',
    terminatedForCause: 'Terminated for cause',
    madeRedundantLast12Months: 'Made redundant in the last 12 months',
    governmentEmployee: 'Government employee',
    publicSectorLink: 'Public sector link',
    consentBackgroundCheck: 'Consent to background check',
    consentAutomatedReview: 'Consent to automated review',
    consentMarketing: 'Consent to marketing',
    age18Plus: 'At least 18'
  };
  const mainDeclarations = ['openToFutureOpportunities', 'willingToRelocate', 'needsRelocationAssistance', 'workedHereBefore', 'age18Plus'];
  const authFields = [['defaultAuthorizedToWork', 'Authorized to work'], ['defaultRequiresSponsorship', 'Require sponsorship']];
  let skills = [],
    customAnswers = [],
    collection = null,
    showingId = null;
  function status(message, error = false) {
    $('saveStatus').textContent = message;
    $('saveStatus').classList.toggle('error', error);
  }
  function dirty() {
    status('Unsaved changes');
  }
  function field(key, title, value = '', type = 'text') {
    const label = document.createElement('label');
    label.className = 'field';
    const caption = document.createElement('span');
    caption.textContent = title;
    let control;
    if (key === 'phoneCountry') {
      control = document.createElement('select');
      const empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'Select country';
      control.append(empty);
      for (const item of countries) {
        const option = document.createElement('option');
        option.value = item.iso;
        option.textContent = `${item.name} (${item.callingCode})`;
        control.append(option);
      }
      const otherOption = document.createElement('option');
      otherOption.value = '__other';
      otherOption.textContent = 'Other country (enter ISO-2 code)';
      control.append(otherOption);
      const other = document.createElement('input');
      other.dataset.phoneCountryOther = '';
      other.maxLength = 2;
      other.placeholder = 'Two-letter ISO code';
      const listed = countries.some(item => item.iso === value);
      control.value = listed ? value : value ? '__other' : '';
      other.value = listed ? '' : value;
      other.hidden = control.value !== '__other';
      control.addEventListener('change', () => {
        other.hidden = control.value !== '__other';
        const country = countries.find(item => item.iso === control.value);
        if (country) $('personalFields').querySelector('[data-key="phoneCountryCode"]').value = country.callingCode;
      });
      control.dataset.key = key;
      label.append(caption, control, other);
      return label;
    } else if (key === 'phoneType') {
      control = document.createElement('select');
      for (const [v, t] of [['', 'Select type'], ['Mobile', 'Mobile'], ['Home', 'Home'], ['Work', 'Work'], ['Other', 'Other']]) {
        const option = document.createElement('option');
        option.value = v;
        option.textContent = t;
        control.append(option);
      }
      if (value && !Array.from(control.options).some(option => option.value === value)) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        control.append(option);
      }
    } else {
      control = document.createElement(type === 'textarea' ? 'textarea' : 'input');
      if (type !== 'textarea') control.type = type;
    }
    control.dataset.key = key;
    control.value = value || '';
    label.append(caption, control);
    if (type === 'textarea') label.classList.add('wide');
    return label;
  }
  function renderSimple(target, definitions, values) {
    target.replaceChildren();
    for (const [key, title] of definitions) target.append(field(key, title, values[key], key === 'email' ? 'email' : key === 'phone' ? 'tel' : ['linkedin', 'github', 'portfolio'].includes(key) ? 'url' : 'text'));
  }
  function choice(key, title, value) {
    const label = document.createElement('label');
    label.className = 'field choice-field';
    const span = document.createElement('span');
    span.textContent = title;
    const select = document.createElement('select');
    select.dataset.key = key;
    for (const [v, t] of [['', 'Unknown / leave blank'], ['true', 'Yes'], ['false', 'No']]) {
      const option = document.createElement('option');
      option.value = v;
      option.textContent = t;
      select.append(option);
    }
    select.value = value === null || value === undefined ? '' : String(value);
    label.append(span, select);
    return label;
  }
  function choiceValue(control) {
    return control.value === '' ? null : control.value === 'true';
  }
  function emptyMessage(target, label) {
    if (target.querySelector('.entry')) return;
    const note = document.createElement('p');
    note.className = 'empty';
    note.textContent = `No ${label} added yet.`;
    target.append(note);
  }
  function retitle(target, title) {
    target.querySelectorAll('.entry-head h3').forEach((h, i) => {
      h.textContent = `${title} ${i + 1}`;
    });
  }
  function dateField(key, title, value = '') {
    const wrapper = document.createElement('div');
    wrapper.className = 'field date-field';
    wrapper.dataset.dateKey = key;
    const caption = document.createElement('span');
    caption.textContent = title;
    const controls = document.createElement('div');
    controls.className = 'date-parts';
    const month = document.createElement('select');
    month.dataset.part = 'month';
    const blank = document.createElement('option');
    blank.value = '';
    blank.textContent = 'Month';
    month.append(blank);
    for (let n = 1; n <= 12; n++) {
      const option = document.createElement('option');
      option.value = String(n).padStart(2, '0');
      option.textContent = new Date(2020, n - 1, 1).toLocaleString('en', {
        month: 'long'
      });
      month.append(option);
    }
    const year = document.createElement('input');
    year.dataset.part = 'year';
    year.type = 'text';
    year.inputMode = 'numeric';
    year.maxLength = 4;
    year.placeholder = 'Year';
    const parts = String(value).match(/^(\d{4})(?:-(\d{2}))?$/);
    wrapper.dataset.legacyYear = parts && !parts[2] ? parts[1] : '';
    year.value = parts?.[1] || '';
    month.value = parts?.[2] || '';
    controls.append(month, year);
    wrapper.append(caption, controls);
    return wrapper;
  }
  function readDate(wrapper) {
    const year = wrapper.querySelector('[data-part="year"]').value.trim(),
      month = wrapper.querySelector('[data-part="month"]').value;
    if (year && !/^\d{4}$/.test(year)) throw new Error('Dates need a four-digit year.');
    if (month && !year) throw new Error('Choose a year for every selected month.');
    if (year && !month && wrapper.dataset.legacyYear !== year) throw new Error('Choose a month and year for new dates.');
    return year ? month ? `${year}-${month}` : year : '';
  }
  function tagEditor(key, title, values = []) {
    const wrapper = document.createElement('div');
    wrapper.className = 'tag-editor wide';
    wrapper.dataset.tagKey = key;
    wrapper.values = [...values];
    const label = document.createElement('label');
    label.className = 'field';
    const caption = document.createElement('span');
    caption.textContent = title;
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type an alternative and press Enter';
    const chips = document.createElement('div');
    chips.className = 'chips';
    function render() {
      chips.replaceChildren();
      for (const [index, value] of wrapper.values.entries()) {
        const chip = document.createElement('span');
        chip.className = 'chip';
        const text = document.createElement('span');
        text.textContent = value;
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.textContent = '×';
        remove.setAttribute('aria-label', `Remove ${value}`);
        remove.addEventListener('click', () => {
          wrapper.values.splice(index, 1);
          render();
          dirty();
        });
        chip.append(text, remove);
        chips.append(chip);
      }
    }
    function add() {
      const values = input.value.split(/[\n,]/).map(x => x.trim()).filter(Boolean);
      for (const value of values) if (!wrapper.values.some(x => x.toLowerCase() === value.toLowerCase())) wrapper.values.push(value);
      input.value = '';
      render();
      if (values.length) dirty();
    }
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        add();
      }
    });
    input.addEventListener('blur', add);
    label.append(caption, input);
    wrapper.append(label, chips);
    render();
    return wrapper;
  }
  function addEntry(type, item = {}) {
    const target = $(type === 'education' ? 'educationList' : 'experienceList'),
      title = type === 'education' ? 'Education' : 'Experience';
    target.querySelector('.empty')?.remove();
    const card = document.createElement('article');
    card.className = 'entry';
    const head = document.createElement('div');
    head.className = 'entry-head';
    const h = document.createElement('h3');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      card.remove();
      retitle(target, title);
      emptyMessage(target, title.toLowerCase());
      dirty();
    });
    head.append(h, remove);
    const grid = document.createElement('div');
    grid.className = 'field-grid';
    if (type === 'experience') {
      for (const [key, label] of [['title', 'Job title'], ['company', 'Company'], ['location', 'Location']]) grid.append(field(key, label, item[key]));
      grid.append(dateField('startDate', 'Start date', item.startDate));
      const end = dateField('endDate', 'End date', item.endDate);
      const current = document.createElement('label');
      current.className = 'check-field wide';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.key = 'current';
      checkbox.checked = item.current === true;
      checkbox.addEventListener('change', () => {
        end.hidden = checkbox.checked;
        dirty();
      });
      current.append(checkbox, document.createTextNode(' Current role'));
      end.hidden = checkbox.checked;
      grid.append(end, current, field('description', 'Description', item.description, 'textarea'));
    } else {
      for (const [key, label] of [['institution', 'Institution'], ['degree', 'Degree'], ['fieldOfStudy', 'Field of study']]) {
        grid.append(field(key, label, item[key]), tagEditor(`${key}Alternatives`, `${label} alternatives`, item[`${key}Alternatives`] || []));
      }
      grid.append(dateField('startDate', 'Start date', item.startDate), dateField('graduationDate', 'Graduation date', item.graduationDate), field('gpa', 'GPA', item.gpa));
    }
    card.append(head, grid);
    target.append(card);
    retitle(target, title);
  }
  function collectEntries(target, type) {
    return Array.from(target.querySelectorAll('.entry')).map(card => {
      const item = {};
      card.querySelectorAll('[data-key]').forEach(c => {
        item[c.dataset.key] = c.type === 'checkbox' ? c.checked : c.value.trim();
      });
      card.querySelectorAll('[data-date-key]').forEach(c => {
        item[c.dataset.dateKey] = readDate(c);
      });
      card.querySelectorAll('[data-tag-key]').forEach(c => {
        item[c.dataset.tagKey] = [...c.values, ...c.querySelector('input').value.split(/[\n,]/).map(x => x.trim()).filter(Boolean)];
      });
      if (type === 'experience' && item.current) item.endDate = '';
      return item;
    }).filter(item => Object.entries(item).some(([k, v]) => k !== 'current' && (Array.isArray(v) ? v.length : Boolean(v))));
  }
  function renderSkills() {
    $('skillChips').replaceChildren();
    for (const [index, skill] of skills.entries()) {
      const chip = document.createElement('span');
      chip.className = 'chip';
      const text = document.createElement('span');
      text.textContent = skill;
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        skills.splice(index, 1);
        renderSkills();
        dirty();
      });
      chip.append(text, remove);
      $('skillChips').append(chip);
    }
  }
  function addPendingSkills() {
    const input = $('skillInput'),
      incoming = input.value.split(/[,\n]/).map(x => x.trim()).filter(Boolean);
    for (const skill of incoming) if (!skills.some(x => x.toLowerCase() === skill.toLowerCase())) skills.push(skill);
    input.value = '';
    renderSkills();
    if (incoming.length) dirty();
  }
  function addLanguage(item = {}) {
    const target = $('languageList');
    target.querySelector('.empty')?.remove();
    const row = document.createElement('article');
    row.className = 'entry language-row';
    row.append(field('name', 'Language', item.name), field('proficiency', 'Proficiency', item.proficiency));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      row.remove();
      emptyMessage(target, 'languages');
      dirty();
    });
    row.append(remove);
    target.append(row);
  }
  function addOverride(item = {}) {
    const target = $('overrideList');
    target.querySelector('.empty')?.remove();
    const row = document.createElement('article');
    row.className = 'entry override-row';
    row.append(field('jurisdiction', 'Jurisdiction (e.g. US, UK, EU)', item.jurisdiction), choice('authorizedToWork', 'Authorized to work', item.authorizedToWork), choice('requiresSponsorship', 'Require sponsorship', item.requiresSponsorship));
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'remove';
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => {
      row.remove();
      emptyMessage(target, 'overrides');
      dirty();
    });
    row.append(remove);
    target.append(row);
  }
  function renderCustomAnswers() {
    const target = $('customAnswersList');
    target.replaceChildren();
    if (!customAnswers.length) {
      const li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No remembered answers.';
      target.append(li);
      return;
    }
    for (const answer of customAnswers) {
      const row = document.createElement('li'),
        desc = document.createElement('span'),
        scope = document.createElement('small');
      desc.textContent = answer.question;
      scope.textContent = `${answer.platform || 'Site'} · ${answer.domain}`;
      desc.append(scope);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'remove';
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => {
        customAnswers = customAnswers.filter(x => x !== answer);
        renderCustomAnswers();
        dirty();
      });
      row.append(desc, remove);
      target.append(row);
    }
  }
  function render(profile) {
    renderSimple($('personalFields'), personalFields, profile.personal);
    renderSimple($('linkFields'), linkFields, profile.links);
    $('websiteFields').replaceChildren();
    for (let i = 0; i < 2; i++) $('websiteFields').append(field(String(i), `Additional website ${i + 1}`, profile.links.websites[i], 'url'));
    renderSimple($('defaultFields'), defaultFields, profile.applicationDefaults);
    for (const [type, target] of [['experience', $('experienceList')], ['education', $('educationList')]]) {
      target.replaceChildren();
      profile[type].forEach(item => addEntry(type, item));
      emptyMessage(target, type);
    }
    skills = [...profile.skills];
    $('skillInput').value = '';
    renderSkills();
    $('languageList').replaceChildren();
    profile.languages.forEach(addLanguage);
    emptyMessage($('languageList'), 'languages');
    $('authorizationFields').replaceChildren();
    for (const [key, label] of authFields) $('authorizationFields').append(choice(key, label, profile.workAuthorization[key]));
    $('overrideList').replaceChildren();
    profile.workAuthorization.overrides.forEach(addOverride);
    emptyMessage($('overrideList'), 'overrides');
    for (const [target, keys] of [[$('declarationFields'), mainDeclarations], [$('advancedDeclarationFields'), schema.declarationKeys.filter(k => !mainDeclarations.includes(k))]]) {
      target.replaceChildren();
      for (const key of keys) target.append(choice(key, declarationLabels[key], profile.declarations[key]));
    }
    $('disclosureAutofill').checked = profile.voluntaryDisclosures.autofill;
    $('disclosureFields').replaceChildren();
    for (const key of schema.disclosureKeys) $('disclosureFields').append(field(key, key.replace(/([A-Z])/g, ' $1').replace(/^./, x => x.toUpperCase()), profile.voluntaryDisclosures[key]));
    customAnswers = [...profile.customAnswers];
    renderCustomAnswers();
  }
  function values(target) {
    const result = {};
    target.querySelectorAll('[data-key]').forEach(c => {
      result[c.dataset.key] = c.value.trim();
    });
    return result;
  }
  function choiceValues(target) {
    const result = {};
    target.querySelectorAll('select[data-key]').forEach(c => {
      result[c.dataset.key] = choiceValue(c);
    });
    return result;
  }
  function collect() {
    const p = schema.emptyProfile();
    p.personal = values($('personalFields'));
    if (p.personal.phoneCountry === '__other') {
      p.personal.phoneCountry = $('personalFields').querySelector('[data-phone-country-other]').value.trim().toUpperCase();
      if (!/^[A-Z]{2}$/.test(p.personal.phoneCountry)) throw new Error('Enter a two-letter ISO code for the phone country.');
    }
    p.links = {
      ...values($('linkFields')),
      websites: Array.from($('websiteFields').querySelectorAll('input')).map(c => c.value.trim()).filter(Boolean)
    };
    p.applicationDefaults = values($('defaultFields'));
    p.experience = collectEntries($('experienceList'), 'experience');
    p.education = collectEntries($('educationList'), 'education');
    p.skills = [...skills, ...$('skillInput').value.split(/[,\n]/).map(x => x.trim()).filter(Boolean)].filter((x, i, a) => a.findIndex(y => y.toLowerCase() === x.toLowerCase()) === i);
    p.languages = Array.from($('languageList').querySelectorAll('.entry')).map(row => values(row)).filter(x => x.name);
    p.workAuthorization = {
      ...choiceValues($('authorizationFields')),
      overrides: Array.from($('overrideList').querySelectorAll('.entry')).map(row => ({
        jurisdiction: row.querySelector('[data-key="jurisdiction"]').value.trim(),
        ...choiceValues(row)
      })).filter(x => x.jurisdiction)
    };
    p.declarations = {
      ...choiceValues($('declarationFields')),
      ...choiceValues($('advancedDeclarationFields'))
    };
    p.voluntaryDisclosures = {
      autofill: $('disclosureAutofill').checked,
      ...values($('disclosureFields'))
    };
    p.customAnswers = customAnswers;
    return schema.normalizeProfile(p);
  }
  function renderCollection() {
    const select = $('profileSelect');
    select.replaceChildren();
    for (const item of collection.profiles) {
      const option = document.createElement('option');
      option.value = item.id;
      option.textContent = item.name;
      select.append(option);
    }
    showingId = collection.activeProfileId;
    select.value = showingId;
    const current = collection.profiles.find(item => item.id === showingId);
    $('profileName').value = current.name;
    const base = collection.profiles.find(item => item.id === current.baseProfileId);
    $('profileBase').textContent = base ? `Variant of ${base.name}. Unchanged fields follow the base profile.` : 'Independent base profile.';
    render(profiles.resolve(collection, showingId));
  }
  function stashCurrent() {
    if (!collection || !showingId) return;
    collection = profiles.setProfile(collection, showingId, collect());
    collection = profiles.renameProfile(collection, showingId, $('profileName').value);
  }
  function changeCollection(action, message) {
    try {
      stashCurrent();
      collection = action(collection);
      renderCollection();
      status(message || 'Unsaved profile changes. Save to use them in the popup.');
    } catch (error) {
      $('profileSelect').value = showingId;
      status(error.message, true);
    }
  }
  function newProfileName() {
    let number = 1;
    while (collection.profiles.some(item => item.name.toLowerCase() === `new profile ${number}`)) number++;
    return `New profile ${number}`;
  }
  function download(profile, name) {
    const blob = new Blob([JSON.stringify(profile, null, 2)], {
        type: 'application/json'
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('profileForm').addEventListener('submit', async e => {
    e.preventDefault();
    try {
      stashCurrent();
      collection = await storage.saveCollection(collection);
      renderCollection();
      status('Profiles saved in this browser.');
    } catch (error) {
      status(error.message, true);
    }
  });
  $('profileForm').addEventListener('input', dirty);
  $('profileForm').addEventListener('change', dirty);
  $('profileSelect').addEventListener('change', event => {
    event.stopPropagation();
    const id = $('profileSelect').value;
    changeCollection(current => profiles.selectProfile(current, id), 'Selected profile changed. Save to use it in the popup.');
  });
  $('createProfile').addEventListener('click', () => {
    changeCollection(current => profiles.createProfile(current, newProfileName()), 'Blank profile created. Save to keep it.');
  });
  $('duplicateProfile').addEventListener('click', () => {
    changeCollection(current => profiles.duplicateProfile(current, showingId), 'Linked variant created. Save to keep it.');
  });
  $('deleteProfile').addEventListener('click', () => {
    if (!confirm('Delete this profile? Variants will keep their effective answers. Save to apply the change.')) return;
    changeCollection(current => profiles.deleteProfile(current, showingId), 'Profile deleted in the editor. Save to apply the change.');
  });
  $('skillInput').addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addPendingSkills();
    }
  });
  $('addExperience').addEventListener('click', () => {
    addEntry('experience');
    dirty();
  });
  $('addEducation').addEventListener('click', () => {
    addEntry('education');
    dirty();
  });
  $('addLanguage').addEventListener('click', () => {
    addLanguage();
    dirty();
  });
  $('addOverride').addEventListener('click', () => {
    addOverride();
    dirty();
  });
  $('import').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async () => {
    try {
      const file = $('importFile').files?.[0];
      if (!file) return;
      const input = JSON.parse(await file.text());
      collection = profiles.importCollection(input);
      renderCollection();
      status('Imported profiles. Review them and save to replace your saved collection.');
    } catch (error) {
      status(`Import failed: ${error.message}`, true);
    } finally {
      $('importFile').value = '';
    }
  });
  $('export').addEventListener('click', () => {
    try {
      stashCurrent();
      download(profiles.normalizeCollection(collection), 'quick-apply-profiles.json');
      status('Profiles exported. Keep the downloaded file private.');
    } catch (error) { status(error.message, true); }
  });
  $('template').addEventListener('click', () => {
    download(profiles.exampleCollection(), 'quick-apply-profiles-template.json');
    status('Example collection template downloaded.');
  });
  $('clear').addEventListener('click', async () => {
    if (!confirm('Permanently clear your saved Quick Apply profile from this browser?')) return;
    try {
      await storage.clear();
      collection = profiles.emptyCollection();
      renderCollection();
      status('Saved profiles cleared. A blank Default profile is ready to save.');
    } catch (error) {
      status(error.message, true);
    }
  });
  storage.loadCollection().then(saved => {
    collection = saved;
    renderCollection();
    status('Profiles loaded.');
  }).catch(error => status(error.message, true));
})();
