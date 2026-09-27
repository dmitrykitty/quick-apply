(function () {
  'use strict';
  const schema = globalThis.OpenApplySchema;
  const storage = globalThis.OpenApplyStorage;
  const $ = id => document.getElementById(id);
  const personalFields = [
    ['firstName', 'First name'], ['lastName', 'Last name'], ['preferredName', 'Preferred name'],
    ['email', 'Email'], ['phone', 'Phone'], ['address', 'Street address'],
    ['city', 'City'], ['postalCode', 'Postal code'], ['country', 'Country']
  ];
  const linkFields = [['linkedin', 'LinkedIn'], ['github', 'GitHub'], ['portfolio', 'Portfolio']];
  const educationFields = [
    ['institution', 'Institution'], ['degree', 'Degree'], ['fieldOfStudy', 'Field of study'],
    ['startDate', 'Start date'], ['endDate', 'Expected / end date']
  ];
  const experienceFields = [
    ['company', 'Company'], ['title', 'Job title'], ['location', 'Location'],
    ['startDate', 'Start date'], ['endDate', 'End date'], ['description', 'Description']
  ];
  const authorizationFields = [
    ['euCitizen', 'EU citizen'], ['authorizedInEU', 'Authorized to work in the EU'],
    ['requiresVisaEU', 'Need EU sponsorship'], ['authorizedInUK', 'Authorized to work in the UK'],
    ['requiresVisaUK', 'Need UK sponsorship'], ['authorizedInUS', 'Authorized to work in the US'],
    ['requiresVisaUS', 'Need US sponsorship'], ['willingToRelocate', 'Willing to relocate']
  ];
  const answerFields = [
    ['previousEmployee', 'Previously employed here'], ['age18Plus', 'At least 18'],
    ['sponsorshipRequired', 'Sponsorship required'], ['relocation', 'Open to relocation']
  ];
  let skills = [];
  let customAnswers = [];

  function status(text, error = false) { $('saveStatus').textContent = text; $('saveStatus').classList.toggle('error', error); }
  function dirty() { status('Unsaved changes'); }
  function field(key, labelText, value = '', kind = 'text') {
    const label = document.createElement('label'); label.className = 'field';
    const title = document.createElement('span'); title.textContent = labelText;
    const control = document.createElement(kind === 'textarea' ? 'textarea' : 'input');
    if (kind !== 'textarea') control.type = kind;
    control.dataset.key = key;
    control.value = value || '';
    if (/Date$/.test(key)) {
      control.placeholder = 'YYYY-MM'; control.inputMode = 'numeric'; control.pattern = '\\d{4}(-\\d{2})?';
      const hint = document.createElement('small'); hint.className = 'hint'; hint.textContent = 'YYYY-MM; older year-only values are kept';
      label.append(title, control, hint);
    } else label.append(title, control);
    if (kind === 'textarea') label.classList.add('wide');
    return label;
  }
  function renderSimple(target, definitions, values, typeFor) {
    target.replaceChildren();
    for (const [key, label] of definitions) target.append(field(key, label, values[key], typeFor(key)));
  }
  function emptyMessage(target, label) {
    if (target.querySelector('.entry')) return;
    const note = document.createElement('p'); note.className = 'empty'; note.textContent = `No ${label} added yet.`; target.append(note);
  }
  function retitle(target, title) {
    target.querySelectorAll('.entry-head h3').forEach((heading, index) => { heading.textContent = `${title} ${index + 1}`; });
  }
  function addEntry(type, item = {}) {
    const title = type === 'education' ? 'Education' : 'Experience';
    const target = $(type === 'education' ? 'educationList' : 'experienceList');
    target.querySelector('.empty')?.remove();
    const card = document.createElement('article'); card.className = 'entry';
    const head = document.createElement('div'); head.className = 'entry-head';
    const heading = document.createElement('h3');
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove'; remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove ${title.toLowerCase()} entry`);
    remove.addEventListener('click', () => { card.remove(); retitle(target, title); emptyMessage(target, type); dirty(); });
    head.append(heading, remove);
    const grid = document.createElement('div'); grid.className = 'field-grid';
    for (const [key, label] of type === 'education' ? educationFields : experienceFields) {
      grid.append(field(key, label, item[key], key === 'description' ? 'textarea' : 'text'));
    }
    const current = document.createElement('label'); current.className = 'check-field wide';
    const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.dataset.key = 'current'; checkbox.checked = item.current === true;
    current.append(checkbox, document.createTextNode(type === 'education' ? 'Currently studying' : 'Current role'));
    grid.append(current); card.append(head, grid); target.append(card); retitle(target, title);
  }
  function collectEntries(target) {
    return Array.from(target.querySelectorAll('.entry')).map(card => {
      const item = {};
      card.querySelectorAll('[data-key]').forEach(control => { item[control.dataset.key] = control.type === 'checkbox' ? control.checked : control.value.trim(); });
      return item;
    }).filter(item => Object.entries(item).some(([key, value]) => key !== 'current' && value));
  }
  function renderSkills() {
    $('skillChips').replaceChildren();
    for (const skill of skills) {
      const chip = document.createElement('span'); chip.className = 'chip';
      const text = document.createElement('span'); text.textContent = skill;
      const remove = document.createElement('button'); remove.type = 'button'; remove.textContent = '×'; remove.setAttribute('aria-label', `Remove ${skill}`);
      remove.addEventListener('click', () => { skills = skills.filter(item => item !== skill); renderSkills(); dirty(); });
      chip.append(text, remove); $('skillChips').append(chip);
    }
  }
  function addPendingSkills() {
    const input = $('skillInput');
    const incoming = input.value.split(/[,\n]/).map(item => item.trim()).filter(Boolean);
    for (const skill of incoming) if (!skills.some(item => item.toLowerCase() === skill.toLowerCase())) skills.push(skill);
    input.value = ''; renderSkills();
    if (incoming.length) dirty();
  }
  function addLanguage(item = {}) {
    const target = $('languageList'); target.querySelector('.empty')?.remove();
    const row = document.createElement('article'); row.className = 'entry language-row';
    row.append(field('name', 'Language', item.name), field('proficiency', 'Proficiency', item.proficiency));
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove'; remove.textContent = 'Remove';
    remove.addEventListener('click', () => { row.remove(); emptyMessage(target, 'languages'); dirty(); });
    row.append(remove); target.append(row);
  }
  function collectLanguages() {
    return Array.from($('languageList').querySelectorAll('.entry')).map(row => ({
      name: row.querySelector('[data-key="name"]').value.trim(), proficiency: row.querySelector('[data-key="proficiency"]').value.trim()
    })).filter(item => item.name);
  }
  function choices(target, definitions, values, group) {
    target.replaceChildren();
    for (const [key, title] of definitions) {
      const fieldset = document.createElement('fieldset'); fieldset.className = 'choice-item';
      const legend = document.createElement('legend'); legend.textContent = title;
      const list = document.createElement('div'); list.className = 'choices';
      for (const [label, value] of [['—', ''], ['Yes', 'true'], ['No', 'false']]) {
        const item = document.createElement('label');
        const radio = document.createElement('input'); radio.type = 'radio'; radio.name = `${group}.${key}`; radio.value = value;
        radio.checked = values[key] === null ? value === '' : String(values[key]) === value;
        const text = document.createElement('span'); text.textContent = label;
        item.append(radio, text); list.append(item);
      }
      fieldset.append(legend, list); target.append(fieldset);
    }
  }
  function collectChoices(definitions, group) {
    return Object.fromEntries(definitions.map(([key]) => {
      const selected = document.querySelector(`input[name="${group}.${key}"]:checked`)?.value || '';
      return [key, selected === '' ? null : selected === 'true'];
    }));
  }
  function renderCustomAnswers() {
    const target = $('customAnswersList'); target.replaceChildren();
    if (!customAnswers.length) { const item = document.createElement('li'); item.className = 'empty'; item.textContent = 'No remembered answers.'; target.append(item); return; }
    for (const answer of customAnswers) {
      const row = document.createElement('li');
      const description = document.createElement('span'); description.textContent = answer.question;
      const scope = document.createElement('small'); scope.textContent = `${answer.platform || 'Site'} · ${answer.domain}`; description.append(scope);
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'remove'; remove.textContent = 'Remove';
      remove.addEventListener('click', () => { customAnswers = customAnswers.filter(item => item !== answer); renderCustomAnswers(); dirty(); });
      row.append(description, remove); target.append(row);
    }
  }
  function render(profile) {
    renderSimple($('personalFields'), personalFields, profile.personal, key => key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text');
    renderSimple($('linkFields'), linkFields, profile.links, () => 'url');
    $('educationList').replaceChildren(); profile.education.forEach(item => addEntry('education', item)); emptyMessage($('educationList'), 'education');
    $('experienceList').replaceChildren(); profile.experience.forEach(item => addEntry('experience', item)); emptyMessage($('experienceList'), 'experience');
    skills = [...profile.skills]; $('skillInput').value = ''; renderSkills();
    $('languageList').replaceChildren(); profile.languages.forEach(addLanguage); emptyMessage($('languageList'), 'languages');
    choices($('authorizationFields'), authorizationFields, profile.workAuthorization, 'workAuthorization');
    choices($('answerFields'), answerFields, profile.commonAnswers, 'commonAnswers');
    customAnswers = [...profile.customAnswers]; renderCustomAnswers();
  }
  function collect() {
    const profile = schema.emptyProfile();
    for (const [group, target] of [['personal', $('personalFields')], ['links', $('linkFields')]]) {
      target.querySelectorAll('[data-key]').forEach(control => { profile[group][control.dataset.key] = control.value.trim(); });
    }
    profile.education = collectEntries($('educationList'));
    profile.experience = collectEntries($('experienceList'));
    profile.skills = [...skills, ...$('skillInput').value.split(/[,\n]/).map(item => item.trim()).filter(Boolean)]
      .filter((skill, index, all) => all.findIndex(item => item.toLowerCase() === skill.toLowerCase()) === index);
    profile.languages = collectLanguages();
    profile.workAuthorization = collectChoices(authorizationFields, 'workAuthorization');
    profile.commonAnswers = collectChoices(answerFields, 'commonAnswers');
    profile.customAnswers = customAnswers;
    return schema.normalizeProfile(profile);
  }
  function exportProfile(profile) {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'quick-apply-profile.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('profileForm').addEventListener('submit', async event => {
    event.preventDefault();
    try { await storage.save(collect()); addPendingSkills(); status('Profile saved in this browser.'); }
    catch (error) { status(error.message, true); }
  });
  $('profileForm').addEventListener('input', dirty);
  $('skillInput').addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); addPendingSkills(); }
  });
  $('addEducation').addEventListener('click', () => { addEntry('education'); dirty(); });
  $('addExperience').addEventListener('click', () => { addEntry('experience'); dirty(); });
  $('addLanguage').addEventListener('click', () => { addLanguage(); dirty(); });
  $('import').addEventListener('click', () => $('importFile').click());
  $('importFile').addEventListener('change', async () => {
    try {
      const file = $('importFile').files?.[0]; if (!file) return;
      const input = JSON.parse(await file.text());
      render(Array.isArray(input.workExperience) ? schema.fromJobPrefill(input) : schema.normalizeProfile(input));
      status('Imported. Review the fields and save your profile.');
    } catch (error) { status(`Import failed: ${error.message}`, true); }
    finally { $('importFile').value = ''; }
  });
  $('export').addEventListener('click', () => { exportProfile(collect()); status('Profile exported. Keep the downloaded file private.'); });
  $('clear').addEventListener('click', async () => {
    if (!confirm('Permanently clear your saved Quick Apply profile from this browser?')) return;
    try { await storage.clear(); render(schema.emptyProfile()); status('Profile cleared.'); }
    catch (error) { status(error.message, true); }
  });
  storage.load().then(profile => { render(profile); status('Profile loaded.'); }).catch(error => status(error.message, true));
})();
