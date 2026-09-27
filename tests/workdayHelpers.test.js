const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/utils/text');
globalThis.OpenApplyDom = { text: element => element?.textContent || '', container: () => null, labelFor: () => '' };
const helpers = require('../src/adapters/workdayHelpers');

test('bounded Workday wait observes delayed rendering', async () => {
  let element = null;
  setTimeout(() => { element = { id: 'rendered' }; }, 35);
  assert.equal((await helpers.waitForElement(() => element, 250, {})).id, 'rendered');
  assert.equal(await helpers.waitForElement(() => null, 30, {}), null);
});

test('Workday combobox considers placeholder empty and selected text filled', () => {
  const control = textContent => ({ tagName: 'BUTTON', textContent,
    getAttribute: () => null, querySelector: () => null });
  assert.equal(helpers.getCurrentComboboxValue(control('Select one')), '');
  assert.equal(helpers.getCurrentComboboxValue(control('Select an option')), '');
  assert.equal(helpers.getCurrentComboboxValue(control('Poland')), 'Poland');
});
