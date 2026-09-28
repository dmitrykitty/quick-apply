const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require(process.argv[2] || process.env.QUICK_APPLY_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const contentFiles = [
  'src/utils/text.js', 'src/utils/dom.js', 'src/utils/events.js', 'src/profile/countries.js',
  'src/content/formScanner.js', 'src/content/fieldMatcher.js', 'src/content/fieldFiller.js',
  'src/adapters/baseAdapter.js', 'src/adapters/greenhouseAdapter.js', 'src/adapters/leverAdapter.js',
  'src/adapters/workdayHelpers.js', 'src/adapters/workdayAdapter.js', 'src/content/index.js'
];

(async () => {
  const browser = await chromium.launch({ channel: process.argv[3] || process.env.QUICK_APPLY_BROWSER_CHANNEL || 'chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1160, height: 900 } });
    await page.goto('data:text/html,' + encodeURIComponent(read('src/options/options.html')));
    await page.addStyleTag({ content: read('src/options/options.css') });
    await page.evaluate(() => { window.__store = {}; window.chrome = { storage: { local: {
      get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, window.__store[key]])),
      set: async values => Object.assign(window.__store, values),
      remove: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete window.__store[key]; }
    } } }; });
    for (const file of ['src/profile/schema.js', 'src/profile/countries.js', 'src/profile/profileSet.js', 'src/profile/storage.js', 'src/options/options.js']) {
      await page.addScriptTag({ content: read(file) });
    }
    await page.locator('#personalFields [data-key="firstName"]').fill('Ada');
    await page.locator('#personalFields [data-key="lastName"]').fill('Lovelace');
    await page.locator('#personalFields [data-key="email"]').fill('ada@example.test');
    await page.locator('#personalFields [data-key="city"]').fill('Krakow');
    await page.locator('#personalFields [data-key="country"]').fill('Poland');
    await page.locator('#personalFields [data-key="phoneCountry"]').selectOption('PL');
    await page.locator('#addEducation').click();
    await page.locator('#educationList [data-key="institution"]').fill('Example University');
    await page.locator('#educationList [data-key="degree"]').fill('BS');
    await page.locator('#educationList [data-date-key="graduationDate"] [data-part="year"]').fill('2028');
    await page.locator('#educationList [data-date-key="graduationDate"] [data-part="month"]').selectOption('02');
    await page.locator('#educationList [data-tag-key="institutionAlternatives"] input').fill('Alternate University');
    await page.locator('#educationList [data-tag-key="institutionAlternatives"] input').press('Enter');
    await page.locator('#addExperience').click();
    await page.locator('#experienceList [data-key="company"]').fill('Example Co');
    await page.locator('#experienceList [data-key="title"]').fill('Engineer');
    await page.locator('#experienceList [data-key="location"]').fill('Warsaw');
    await page.locator('#experienceList [data-date-key="startDate"] [data-part="year"]').fill('2024');
    await page.locator('#experienceList [data-date-key="startDate"] [data-part="month"]').selectOption('06');
    await page.locator('#experienceList [data-date-key="endDate"] [data-part="year"]').fill('2025');
    await page.locator('#experienceList [data-date-key="endDate"] [data-part="month"]').selectOption('01');
    await page.locator('#experienceList [data-key="current"]').check();
    assert.equal(await page.locator('#experienceList [data-date-key="endDate"]').isHidden(), true);
    await page.locator('#authorizationFields [data-key="defaultAuthorizedToWork"]').selectOption('true');
    await page.locator('#addLanguage').click();
    await page.locator('#languageList [data-key="name"]').fill('English');
    await page.locator('#languageList [data-key="proficiency"]').fill('Fluent');
    await page.locator('#skillInput').fill('JavaScript');
    await page.locator('#skillInput').press('Enter');
    await page.locator('button[form="profileForm"]').click();
    const profile = await page.evaluate(() => window.OpenApplyProfiles.resolve(window.__store.quickApplyProfiles));
    assert.equal(profile.personal.firstName, 'Ada');
    assert.equal(profile.education[0].graduationDate, '2028-02');
    assert.deepEqual(profile.education[0].institutionAlternatives, ['Alternate University']);
    assert.equal(profile.personal.phoneCountryCode, '+48');
    assert.equal(profile.experience[0].startDate, '2024-06');
    assert.equal(profile.experience[0].endDate, '');
    assert.deepEqual(profile.skills, ['JavaScript']);
    assert.equal(profile.languages[0].name, 'English');
    await page.locator('#duplicateProfile').click();
    await page.locator('#profileName').fill('Remote roles');
    await page.locator('#personalFields [data-key="city"]').fill('Berlin');
    await page.locator('button[form="profileForm"]').click();
    const variantId = await page.evaluate(() => window.__store.activeProfileId);
    const variants = await page.evaluate(() => window.__store.quickApplyProfiles.profiles);
    assert.equal(variants.length, 2);
    assert.equal(variants[1].name, 'Remote roles');
    assert.equal(variants[1].baseProfileId, 'default');
    assert.deepEqual(variants[1].overrides, { personal: { city: 'Berlin' } });
    await page.locator('#personalFields [data-key="city"]').fill('Prague');
    await page.locator('#profileSelect').selectOption('default');
    await page.locator('#profileSelect').selectOption(variantId);
    assert.equal(await page.locator('#personalFields [data-key="city"]').inputValue(), 'Prague');
    await page.locator('#personalFields [data-key="city"]').fill('Berlin');
    await page.locator('#createProfile').click();
    await page.locator('#profileName').fill('Independent');
    await page.locator('button[form="profileForm"]').click();
    assert.equal(await page.evaluate(() => window.__store.quickApplyProfiles.profiles.length), 3);
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#deleteProfile').click();
    await page.locator('button[form="profileForm"]').click();
    assert.equal(await page.evaluate(() => window.__store.quickApplyProfiles.profiles.length), 2);
    await page.locator('#profileSelect').selectOption(variantId);
    await page.locator('button[form="profileForm"]').click();
    await page.evaluate(() => {
      URL.createObjectURL = blob => { window.__templateBlob = blob; return 'blob:example'; };
      HTMLAnchorElement.prototype.click = () => {};
    });
    await page.locator('#template').click();
    const template = await page.evaluate(async () => JSON.parse(await window.__templateBlob.text()));
    assert.equal(template.schemaVersion, 3);
    assert.deepEqual(template.profiles.map(item => item.name), ['Example base', 'Example variant']);
    assert.equal(template.profiles[0].overrides.personal.firstName, 'Ada');
    assert.notEqual(template.profiles[0].overrides.personal.lastName, profile.personal.lastName);
    await page.locator('#export').click();
    const exported = await page.evaluate(async () => JSON.parse(await window.__templateBlob.text()));
    assert.equal(exported.schemaVersion, 3);
    assert.deepEqual(exported.profiles.map(item => item.name), ['Default', 'Remote roles']);
    assert.equal(exported.activeProfileId, variantId);
    const imported = JSON.parse(JSON.stringify(exported));
    imported.profiles[0].name = 'Imported base';
    await page.locator('#importFile').setInputFiles({ name: 'profiles.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(imported)) });
    assert.equal(await page.evaluate(() => window.__store.quickApplyProfiles.profiles[0].name), 'Default');
    await page.locator('button[form="profileForm"]').click();
    assert.equal(await page.evaluate(() => window.__store.quickApplyProfiles.profiles[0].name), 'Imported base');
    console.log('Options editor: PASS');

    for (const [fixture, expectedPlatform] of [
      ['greenhouse.html', 'Greenhouse'], ['lever.html', 'Lever'], ['workday.html', 'Workday']
    ]) {
      const formPage = await browser.newPage();
      await formPage.goto('data:text/html,' + encodeURIComponent(read(`tests/fixtures/${fixture}`)));
      await formPage.evaluate(() => { window.__submitted = false; document.addEventListener('submit', event => { event.preventDefault(); window.__submitted = true; }); });
      if (fixture === 'workday.html') {
        await formPage.evaluate(() => {
          document.getElementById('wd-country').addEventListener('click', () => {
            setTimeout(() => { document.getElementById('countries').hidden = false; }, 75);
          });
          const school = document.getElementById('wd-school');
          const schools = document.getElementById('schools');
          school.addEventListener('click', () => { schools.hidden = false; });
          school.addEventListener('input', () => setTimeout(() => {
            const option = document.createElement('div'); option.setAttribute('role', 'option');
            option.textContent = school.value === 'Alternate University' ? 'Alternate University' : 'Similar University';
            option.addEventListener('click', () => { school.value = option.textContent; });
            schools.replaceChildren(option);
          }, 75));
        });
      }
      for (const file of contentFiles) await formPage.addScriptTag({ content: read(file) });
      const result = await formPage.evaluate(data => window.OpenApplyRun(data), profile);
      assert.equal(result.platform, expectedPlatform);
      assert.ok(result.filled >= 2, JSON.stringify(result));
      assert.equal(await formPage.evaluate(() => window.__submitted), false);
      if (fixture === 'greenhouse.html') {
        assert.equal(await formPage.locator('#grad').inputValue(), '2028-02');
        assert.equal(await formPage.locator('#first_name').inputValue(), 'Ada');
      }
      if (fixture === 'lever.html') {
        assert.equal(await formPage.locator('input[name="experience_company"]').inputValue(), 'Example Co');
        assert.equal(await formPage.locator('input[name="experience_start_date"]').inputValue(), '2024-06');
      }
      if (fixture === 'workday.html') {
        assert.equal(result.details.find(item => item.label === 'Country')?.result, 'filled');
        assert.equal(result.details.find(item => item.label === 'University')?.result, 'filled');
        assert.equal(await formPage.locator('#wd-school').inputValue(), 'Alternate University');
        assert.equal(await formPage.locator('#wd-graduation').inputValue(), '2028-02');
        assert.equal(await formPage.locator('#wd-school-2').inputValue(), '');
      }
      console.log(`${expectedPlatform} fixture: PASS (${result.filled} filled)`);
      await formPage.close();
    }
    const popup = await browser.newPage({ viewport: { width: 400, height: 620 } });
    await popup.goto('data:text/html,' + encodeURIComponent(read('src/popup/popup.html')));
    await popup.addStyleTag({ content: read('src/popup/popup.css') });
    const savedCollection = await page.evaluate(() => window.__store.quickApplyProfiles);
    await popup.evaluate(saved => {
      window.__store = { quickApplyProfiles: saved, activeProfileId: saved.activeProfileId };
      window.chrome = {
        storage: { local: {
          get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, window.__store[key]])),
          set: async values => Object.assign(window.__store, values),
          remove: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete window.__store[key]; }
        } },
        tabs: { query: async () => [{ id: 1, url: 'https://jobs.lever.co/example/apply' }] },
        runtime: { openOptionsPage: async () => { window.__openedOptions = true; } },
        scripting: { executeScript: async request => request.files ? [] : [{ result: {
          platform: 'Lever', domain: 'jobs.lever.co', filled: 2, skipped: 1, review: 1,
          details: [
            { label: 'First name', result: 'filled', category: 'filled' },
            { label: 'Email', result: 'already-filled', category: 'skipped' },
            { label: 'How did you hear about us?', type: 'textarea', result: 'unknown-field', category: 'review', sensitive: false, learnable: true }
          ]
        } }] }
      };
    }, savedCollection);
    for (const file of ['src/profile/schema.js', 'src/profile/countries.js', 'src/profile/profileSet.js', 'src/profile/storage.js', 'src/utils/text.js', 'src/popup/popup.js']) {
      await popup.addScriptTag({ content: read(file) });
    }
    assert.equal(await popup.locator('#activeProfile').inputValue(), variantId);
    await popup.locator('#activeProfile').selectOption('default');
    assert.equal(await popup.evaluate(() => window.__store.activeProfileId), 'default');
    await popup.locator('#activeProfile').selectOption(variantId);
    assert.equal(await popup.evaluate(() => window.__store.activeProfileId), variantId);
    await popup.locator('#fill').click();
    assert.equal(await popup.locator('#filledCount').textContent(), '2');
    assert.match(await popup.locator('#resultPlatform').textContent(), /Remote roles/);
    await popup.locator('#resultDetails').evaluate(element => element.open = true);
    await popup.locator('.remember-trigger').click();
    await popup.locator('.remember input').fill('University career fair');
    await popup.locator('.remember button').click();
    const savedAnswers = await popup.evaluate(() => window.OpenApplyProfiles.resolve(window.__store.quickApplyProfiles).customAnswers);
    assert.equal(savedAnswers[0].answer, 'University career fair');
    assert.deepEqual(await popup.evaluate(() => window.OpenApplyProfiles.resolve(window.__store.quickApplyProfiles, 'default').customAnswers), []);
    await popup.locator('#edit').click();
    assert.equal(await popup.evaluate(() => window.__openedOptions), true);
    console.log('Popup summary and remembered answer: PASS');
    await popup.close();
    const rememberedPage = await browser.newPage();
    await rememberedPage.route('https://jobs.lever.co/example/apply', route => route.fulfill({
      status: 200, contentType: 'text/html', body: read('tests/fixtures/lever.html')
    }));
    await rememberedPage.goto('https://jobs.lever.co/example/apply');
    for (const file of contentFiles) await rememberedPage.addScriptTag({ content: read(file) });
    await rememberedPage.evaluate(data => window.OpenApplyRun(data), { ...profile, customAnswers: savedAnswers });
    assert.equal(await rememberedPage.locator('textarea[name="source"]').inputValue(), 'University career fair');
    console.log('Remembered answer on same domain: PASS');
    await rememberedPage.close();
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
