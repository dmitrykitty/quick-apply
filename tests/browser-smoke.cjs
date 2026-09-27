const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { chromium } = require(process.argv[2] || process.env.QUICK_APPLY_PLAYWRIGHT_PATH || 'playwright');
const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const contentFiles = [
  'src/utils/text.js', 'src/utils/dom.js', 'src/utils/events.js',
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
      get: async key => ({ [key]: window.__store[key] }),
      set: async values => Object.assign(window.__store, values),
      remove: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete window.__store[key]; }
    } } }; });
    for (const file of ['src/profile/schema.js', 'src/profile/storage.js', 'src/options/options.js']) {
      await page.addScriptTag({ content: read(file) });
    }
    await page.locator('#personalFields [data-key="firstName"]').fill('Ada');
    await page.locator('#personalFields [data-key="lastName"]').fill('Lovelace');
    await page.locator('#personalFields [data-key="email"]').fill('ada@example.test');
    await page.locator('#personalFields [data-key="city"]').fill('Krakow');
    await page.locator('#personalFields [data-key="country"]').fill('Poland');
    await page.locator('#addEducation').click();
    await page.locator('#educationList [data-key="institution"]').fill('Example University');
    await page.locator('#educationList [data-key="degree"]').fill('BS');
    await page.locator('#educationList [data-key="endDate"]').fill('2028-02');
    await page.locator('#addExperience').click();
    await page.locator('#experienceList [data-key="company"]').fill('Example Co');
    await page.locator('#experienceList [data-key="title"]').fill('Engineer');
    await page.locator('#experienceList [data-key="location"]').fill('Warsaw');
    await page.locator('#experienceList [data-key="startDate"]').fill('2024-06');
    await page.locator('input[name="workAuthorization.euCitizen"][value="true"]').check();
    await page.locator('#addLanguage').click();
    await page.locator('#languageList [data-key="name"]').fill('English');
    await page.locator('#languageList [data-key="proficiency"]').fill('Fluent');
    await page.locator('#skillInput').fill('JavaScript');
    await page.locator('#skillInput').press('Enter');
    await page.locator('button[form="profileForm"]').click();
    const profile = await page.evaluate(() => window.__store.openApplyProfile);
    assert.equal(profile.personal.firstName, 'Ada');
    assert.equal(profile.education[0].endDate, '2028-02');
    assert.equal(profile.experience[0].startDate, '2024-06');
    assert.deepEqual(profile.skills, ['JavaScript']);
    assert.equal(profile.languages[0].name, 'English');
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
            const option = document.createElement('div'); option.setAttribute('role', 'option'); option.textContent = 'Example University';
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
        assert.equal(await formPage.locator('#eu-citizen').inputValue(), 'yes');
      }
      if (fixture === 'lever.html') {
        assert.equal(await formPage.locator('input[name="experience_company"]').inputValue(), 'Example Co');
        assert.equal(await formPage.locator('input[name="experience_start_date"]').inputValue(), '2024-06');
      }
      if (fixture === 'workday.html') {
        assert.equal(result.details.find(item => item.label === 'Country')?.result, 'filled');
        assert.equal(result.details.find(item => item.label === 'University')?.result, 'filled');
        assert.equal(await formPage.locator('#wd-graduation').inputValue(), '2028-02');
        assert.equal(await formPage.locator('#wd-school-2').inputValue(), '');
      }
      console.log(`${expectedPlatform} fixture: PASS (${result.filled} filled)`);
      await formPage.close();
    }
    const popup = await browser.newPage({ viewport: { width: 400, height: 620 } });
    await popup.goto('data:text/html,' + encodeURIComponent(read('src/popup/popup.html')));
    await popup.addStyleTag({ content: read('src/popup/popup.css') });
    await popup.evaluate(saved => {
      window.__store = { openApplyProfile: saved };
      window.chrome = {
        storage: { local: {
          get: async key => ({ [key]: window.__store[key] }),
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
    }, profile);
    for (const file of ['src/profile/schema.js', 'src/profile/storage.js', 'src/utils/text.js', 'src/popup/popup.js']) {
      await popup.addScriptTag({ content: read(file) });
    }
    await popup.locator('#fill').click();
    assert.equal(await popup.locator('#filledCount').textContent(), '2');
    await popup.locator('#resultDetails').evaluate(element => element.open = true);
    await popup.locator('.remember-trigger').click();
    await popup.locator('.remember input').fill('University career fair');
    await popup.locator('.remember button').click();
    const savedAnswers = await popup.evaluate(() => window.__store.openApplyProfile.customAnswers);
    assert.equal(savedAnswers[0].answer, 'University career fair');
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
