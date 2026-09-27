(function () {
  'use strict';
  const schema = globalThis.OpenApplySchema;
  const storage = globalThis.OpenApplyStorage;
  const fieldsRoot = document.getElementById('fields');
  const result = document.getElementById('result');
  const editor = document.getElementById('editor');
  const fileInput = document.getElementById('file');
  const scriptFiles = [
    'src/utils/text.js', 'src/utils/dom.js', 'src/utils/events.js',
    'src/content/formScanner.js', 'src/content/fieldMatcher.js', 'src/content/fieldFiller.js',
    'src/adapters/baseAdapter.js', 'src/adapters/greenhouseAdapter.js',
    'src/adapters/leverAdapter.js', 'src/adapters/workdayAdapter.js', 'src/content/index.js'
  ];
  const names = {
    firstName: 'First name', lastName: 'Last name', preferredName: 'Preferred name', email: 'Email', phone: 'Phone',
    city: 'City', country: 'Country', address: 'Street address', postalCode: 'Postal code',
    linkedin: 'LinkedIn', github: 'GitHub', portfolio: 'Portfolio',
    euCitizen: 'EU citizen', authorizedInEU: 'Authorized in EU', requiresVisaEU: 'Requires EU visa',
    authorizedInUK: 'Authorized in UK', requiresVisaUK: 'Requires UK visa',
    authorizedInUS: 'Authorized in US', requiresVisaUS: 'Requires US visa', willingToRelocate: 'Willing to relocate',
    previousEmployee: 'Previously employed here', age18Plus: 'At least 18',
    sponsorshipRequired: 'Sponsorship required', relocation: 'Open to relocation'
  };

  function show(message, error = false) {
    result.textContent = message;
    result.classList.toggle('error', error);
  }
  function makeFieldset(title) {
    const group = document.createElement('fieldset');
    const legend = document.createElement('legend');
    legend.textContent = title;
    group.append(legend);
    fieldsRoot.append(group);
    return group;
  }
  function addField(group, path, value) {
    const key = path.split('.').at(-1);
    const label = document.createElement('label');
    label.textContent = names[key] || key;
    let control;
    if (typeof value === 'boolean' || value === null) {
      control = document.createElement('select');
      for (const [text, choice] of [['Unanswered', ''], ['Yes', 'true'], ['No', 'false']]) {
        const option = document.createElement('option'); option.textContent = text; option.value = choice; control.append(option);
      }
    } else {
      control = document.createElement('input');
      control.type = key === 'email' ? 'email' : key === 'phone' ? 'tel' : ['linkedin', 'github', 'portfolio'].includes(key) ? 'url' : 'text';
    }
    control.dataset.path = path;
    label.append(control); group.append(label);
  }
  function build() {
    const empty = schema.emptyProfile();
    for (const [title, key] of [['Personal', 'personal'], ['Links', 'links'], ['Work authorization', 'workAuthorization'], ['Common answers', 'commonAnswers']]) {
      const group = makeFieldset(title);
      for (const [name, value] of Object.entries(empty[key])) addField(group, `${key}.${name}`, value);
    }
    const group = makeFieldset('Experience, education, skills');
    for (const [key, hint] of [
      ['experience', 'JSON array of jobs. First entry is used for matching current company and title.'],
      ['education', 'JSON array of schools. First entry is used for matching school and degree.'],
      ['skills', 'One skill per line.']
    ]) {
      const label = document.createElement('label'); label.className = 'wide'; label.textContent = key[0].toUpperCase() + key.slice(1);
      const control = document.createElement('textarea'); control.dataset.path = key; label.append(control);
      const note = document.createElement('span'); note.className = 'hint'; note.textContent = hint; label.append(note); group.append(label);
    }
  }
  function display(profile) {
    for (const control of fieldsRoot.querySelectorAll('[data-path]')) {
      const path = control.dataset.path;
      const value = path.split('.').reduce((current, part) => current?.[part], profile);
      control.value = path === 'skills' ? (value || []).join('\n') : Array.isArray(value) ? JSON.stringify(value, null, 2) : value === null ? '' : String(value ?? '');
    }
  }
  function collect() {
    const profile = schema.emptyProfile();
    for (const control of fieldsRoot.querySelectorAll('[data-path]')) {
      const path = control.dataset.path;
      if (path === 'skills') { profile.skills = control.value.split(/\r?\n/).map(v => v.trim()).filter(Boolean); continue; }
      if (path === 'experience' || path === 'education') {
        const parsed = JSON.parse(control.value.trim() || '[]');
        if (!Array.isArray(parsed)) throw new Error(`${path} must be a JSON array.`);
        profile[path] = parsed; continue;
      }
      const [group, key] = path.split('.');
      profile[group][key] = control.tagName === 'SELECT' ? control.value === '' ? null : control.value === 'true' : control.value;
    }
    return schema.normalizeProfile(profile);
  }
  async function save() { const profile = collect(); await storage.save(profile); show('Profile saved locally.'); return profile; }
  function downloadProfile(profile) {
    const blob = new Blob([JSON.stringify(profile, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a'); link.href = url; link.download = 'openapply-profile.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function fill() {
    const button = document.getElementById('fill'); button.disabled = true;
    try {
      const profile = await save();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error('No active tab found.');
      for (const file of scriptFiles) {
        await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: [file] });
      }
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async data => globalThis.OpenApplyRun(data), args: [profile]
      });
      const summary = injection.result;
      if (summary.error) { show(summary.error, true); return; }
      const unknown = [...new Set(summary.unknown)].slice(0, 12);
      show(`${summary.platform}: ${summary.filled} filled, ${summary.skipped} skipped, ${summary.unknown.length} unknown.` +
        (unknown.length ? `\nUnknown fields: ${unknown.join(', ')}` : '') +
        (summary.details.some(item => item.result !== 'filled') ? `\nSkipped: ${summary.details.filter(item => item.result !== 'filled').slice(0, 8).map(item => `${item.label} (${item.result})`).join(', ')}` : ''));
    } catch (error) { show(error.message || String(error), true); }
    finally { button.disabled = false; }
  }
  build();
  storage.load().then(display).catch(error => show(error.message, true));
  document.getElementById('edit').addEventListener('click', () => { editor.open = true; fieldsRoot.querySelector('input')?.focus(); });
  document.getElementById('profileForm').addEventListener('submit', event => { event.preventDefault(); save().catch(error => show(error.message, true)); });
  document.getElementById('fill').addEventListener('click', fill);
  document.getElementById('import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    try {
      const file = fileInput.files?.[0]; if (!file) return;
      const input = JSON.parse(await file.text());
      const profile = Array.isArray(input.workExperience) ? schema.fromJobPrefill(input) : schema.normalizeProfile(input);
      display(profile); editor.open = true; show('Imported into the editor. Review the fields and click Save Profile.');
    } catch (error) { show(`Import failed: ${error.message}`, true); }
    finally { fileInput.value = ''; }
  });
  document.getElementById('export').addEventListener('click', () => { try { downloadProfile(collect()); show('Profile exported.'); } catch (error) { show(error.message, true); } });
  document.getElementById('clear').addEventListener('click', async () => {
    if (!confirm('Clear the saved profile from this browser?')) return;
    try { await storage.clear(); display(schema.emptyProfile()); show('Saved profile cleared.'); }
    catch (error) { show(error.message, true); }
  });
})();
