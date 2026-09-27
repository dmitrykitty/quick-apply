(function () {
  'use strict';
  const storage = globalThis.OpenApplyStorage;
  const normalize = globalThis.OpenApplyText.normalize;
  const files = [
    'src/utils/text.js', 'src/utils/dom.js', 'src/utils/events.js',
    'src/content/formScanner.js', 'src/content/fieldMatcher.js', 'src/content/fieldFiller.js',
    'src/adapters/baseAdapter.js', 'src/adapters/greenhouseAdapter.js', 'src/adapters/leverAdapter.js',
    'src/adapters/workdayHelpers.js', 'src/adapters/workdayAdapter.js', 'src/content/index.js'
  ];
  const $ = id => document.getElementById(id);
  const reason = {
    'already-filled': 'Already filled', 'no-profile-value': 'No saved answer', 'unknown-field': 'Unknown field',
    'unmatched-option': 'Option not found', 'unsupported-control': 'Unsupported control',
    'unsupported-workday-control': 'Unsupported Workday control', 'unsupported-format': 'Date format not supported',
    'unsafe-checkbox': 'Checkbox needs review', 'repeated-field-needs-review': 'Repeated field needs review'
  };

  function message(text, state = '') { $('message').textContent = text; $('message').className = `message ${state}`; }
  function status(platform, label, state) {
    $('platform').textContent = platform;
    $('siteBadge').textContent = label;
    $('siteBadge').className = `badge ${state}`;
  }
  function profileStatus(profile) {
    const checks = [
      ['Personal information', !!(profile.personal.firstName && profile.personal.lastName && profile.personal.email)],
      ['Education', profile.education.some(item => item.institution || item.degree)],
      ['Experience', profile.experience.some(item => item.company || item.title)],
      ['Work authorization', Object.values(profile.workAuthorization).some(value => value !== null)],
      ['Skills & languages', profile.skills.length > 0 || profile.languages.length > 0]
    ];
    $('profileStatus').replaceChildren();
    for (const [label, ready] of checks) {
      const item = document.createElement('li'); item.textContent = label; item.className = ready ? 'ready' : '';
      $('profileStatus').append(item);
    }
  }
  function renderResult(summary) {
    if (!summary || summary.error) return;
    $('emptyResult').hidden = true;
    $('resultBody').hidden = false;
    $('resultPlatform').textContent = summary.platform;
    $('filledCount').textContent = summary.filled;
    $('skippedCount').textContent = summary.skipped;
    $('reviewCount').textContent = summary.review;
    $('detailGroups').replaceChildren();
    for (const [category, title] of [['filled', 'Filled'], ['skipped', 'Skipped'], ['review', 'Need review']]) {
      const items = summary.details.filter(item => item.category === category);
      if (!items.length) continue;
      const group = document.createElement('div'); group.className = 'detail-group';
      const heading = document.createElement('h3'); heading.textContent = title;
      const list = document.createElement('ul');
      for (const item of items) {
        const row = document.createElement('li');
        const label = document.createElement('span'); label.textContent = item.label; row.append(label);
        if (item.result !== 'filled') {
          const note = document.createElement('small'); note.textContent = reason[item.result] || item.result; row.append(note);
        }
        if (item.result === 'unknown-field' && item.learnable && summary.domain &&
            ['text', 'textarea', 'select', 'radio'].includes(item.type)) addRemember(row, item, summary);
        list.append(row);
      }
      group.append(heading, list); $('detailGroups').append(group);
    }
  }
  function addRemember(row, item, summary) {
    const trigger = document.createElement('button'); trigger.type = 'button'; trigger.className = 'remember-trigger'; trigger.textContent = 'Remember answer';
    trigger.addEventListener('click', () => {
      trigger.remove();
      const form = document.createElement('form'); form.className = 'remember';
      const input = document.createElement('input'); input.required = true; input.setAttribute('aria-label', `Answer for ${item.label}`);
      const save = document.createElement('button'); save.type = 'submit'; save.textContent = 'Save';
      form.append(input, save); row.append(form); input.focus();
      form.addEventListener('submit', async event => {
        event.preventDefault();
        try {
          const profile = await storage.load();
          profile.customAnswers = profile.customAnswers.filter(answer => !(answer.domain === summary.domain &&
            answer.platform === summary.platform && answer.controlType === item.type && normalize(answer.question) === normalize(item.label)));
          profile.customAnswers.push({ question: item.label, answer: input.value.trim(), controlType: item.type, domain: summary.domain, platform: summary.platform });
          profile.customAnswers = profile.customAnswers.slice(-100);
          await storage.save(profile);
          form.replaceWith(document.createTextNode('Saved for this site.'));
          message('Answer saved locally.', 'success');
        } catch (error) { message(error.message, 'error'); }
      });
    });
    row.append(trigger);
  }
  async function currentTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }
  async function inspectPage() {
    try {
      const tab = await currentTab();
      const url = new URL(tab?.url || '');
      if (!/^https?:$/.test(url.protocol)) {
        status('Browser page', 'Unavailable', 'error'); $('fill').disabled = true; return;
      }
      const host = url.hostname;
      const platform = /(?:^|\.)greenhouse\.io$/.test(host) ? 'Greenhouse' :
        /(?:^|\.)jobs\.lever\.co$/.test(host) ? 'Lever' :
          /(?:^|\.)myworkdayjobs\.com$|(?:^|\.)myworkdaysite\.com$/.test(host) ? 'Workday' : 'Other site';
      status(platform, platform === 'Other site' ? 'Check page' : 'Ready', platform === 'Other site' ? 'warning' : 'ready');
    } catch { status('Page unavailable', 'Unavailable', 'error'); $('fill').disabled = true; }
  }
  async function fill() {
    const button = $('fill'); button.disabled = true; button.firstChild.textContent = 'Filling application ';
    message('Scanning visible fields…');
    try {
      const tab = await currentTab();
      if (!tab?.id || !/^https?:\/\//.test(tab.url || '')) throw new Error('Open an application page in a normal browser tab first.');
      const profile = await storage.load();
      await chrome.scripting.executeScript({ target: { tabId: tab.id }, files });
      const [injection] = await chrome.scripting.executeScript({
        target: { tabId: tab.id }, func: data => globalThis.OpenApplyRun(data), args: [profile]
      });
      const summary = injection?.result;
      if (!summary || summary.error) throw new Error(summary?.error || 'Could not read the application page.');
      await storage.saveLastResult(summary);
      renderResult(summary);
      message(`Finished. Review ${summary.review} field${summary.review === 1 ? '' : 's'} before submitting.`, 'success');
    } catch (error) {
      const protectedPage = /cannot access|cannot be scripted|permission|chrome:\/\//i.test(error.message || '');
      message(protectedPage ? 'This page does not allow extension filling. Open the application itself and try again.' : error.message, 'error');
    } finally { button.disabled = false; button.firstChild.textContent = 'Fill application '; }
  }
  $('fill').addEventListener('click', fill);
  $('edit').addEventListener('click', () => chrome.runtime.openOptionsPage());
  Promise.all([storage.load(), storage.loadLastResult(), inspectPage()]).then(([profile, last]) => {
    profileStatus(profile); renderResult(last);
  }).catch(error => message(error.message, 'error'));
})();
