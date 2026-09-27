const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/utils/text');

class MockInput {
  constructor(value = '') { this._value = value; this._checked = false; this.events = []; }
  get value() { return this._value; }
  set value(value) { this._value = value; }
  get checked() { return this._checked; }
  set checked(value) { this._checked = value; }
  dispatchEvent(event) { this.events.push(event.type); }
}
class MockTextarea extends MockInput {}
class MockSelect extends MockInput {
  constructor(options) { super(''); this.options = options; }
  get value() { return this._value; }
  set value(value) { this._value = value; }
}
globalThis.HTMLInputElement = MockInput;
globalThis.HTMLTextAreaElement = MockTextarea;
globalThis.HTMLSelectElement = MockSelect;
require('../src/utils/events');
const { fill } = require('../src/content/fieldFiller') || globalThis.OpenApplyFiller;

test('fills empty text and dispatches framework events', () => {
  const element = new MockInput();
  assert.equal(fill({ element, type: 'text' }, 'Ada'), 'filled');
  assert.equal(element.value, 'Ada');
  assert.deepEqual(element.events, ['input', 'change']);
  assert.equal(fill({ element, type: 'text' }, 'Other'), 'already-filled');
});

test('selects an exact native option and skips nonmatching options', () => {
  const element = new MockSelect([{ text: 'Choose one', value: '' }, { text: 'Poland', value: 'PL' }]);
  assert.equal(fill({ element, type: 'select' }, 'Poland'), 'filled');
  assert.equal(element.value, 'PL');
  assert.equal(fill({ element, type: 'select' }, 'France'), 'unmatched-option');
});

test('answers one radio choice without touching the other', () => {
  const yes = new MockInput('yes');
  const no = new MockInput('no');
  const field = { element: yes, type: 'radio', options: [{ element: yes, text: 'Yes' }, { element: no, text: 'No' }] };
  assert.equal(fill(field, false), 'filled');
  assert.equal(no.checked, true);
  assert.equal(yes.checked, false);
});

test('does not check a checkbox when the saved answer is false', () => {
  const element = new MockInput();
  assert.equal(fill({ element, type: 'checkbox' }, false), 'already-filled');
  assert.equal(element.checked, false);
});
