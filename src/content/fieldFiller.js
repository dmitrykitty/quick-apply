(function (root) {
  'use strict';
  const normalize = root.OpenApplyText.normalize;
  const events = root.OpenApplyEvents;
  function yesNo(value) { return value ? ['yes', 'true', '1', 'tak'] : ['no', 'false', '0', 'nie']; }
  function textDate(value, field) {
    if (!/^\d{4}-\d{2}$/.test(value)) return value;
    const hint = normalize(field.placeholder);
    return hint === 'mm yyyy' ? `${value.slice(5, 7)}/${value.slice(0, 4)}` : value;
  }
  function fill(field, value) {
    const element = field.element;
    if (value === null || value === undefined || value === '') return 'no-profile-value';
    if (field.type === 'radio') {
      const choices = typeof value === 'boolean' ? yesNo(value) : [normalize(value)];
      const matching = field.options.filter(option => choices.includes(normalize(option.text)) || choices.includes(normalize(option.element.value)));
      if (matching.length !== 1) return 'unmatched-option';
      if (matching[0].element.checked) return 'already-filled';
      events.setChecked(matching[0].element, true);
      return 'filled';
    }
    if (field.type === 'checkbox') {
      if (typeof value !== 'boolean') return 'unsafe-checkbox';
      if (element.checked === value) return 'already-filled';
      if (!value) return 'unsafe-checkbox';
      events.setChecked(element, true);
      return 'filled';
    }
    if (field.type === 'select') {
      const choices = typeof value === 'boolean' ? yesNo(value) : [normalize(value)];
      const matching = Array.from(element.options).filter(option => choices.includes(normalize(option.text)) || choices.includes(normalize(option.value)));
      if (matching.length !== 1) return 'unmatched-option';
      if (element.value === matching[0].value) return 'already-filled';
      return events.setNativeValue(element, matching[0].value) ? 'filled' : 'unsupported-control';
    }
    if (typeof value === 'boolean') return 'unsupported-control';
    if (element.value?.trim()) return 'already-filled';
    if (field.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return 'unsupported-format';
    if (field.type === 'month' && !/^\d{4}-\d{2}$/.test(String(value))) return 'unsupported-format';
    const output = field.type === 'text' ? textDate(String(value), field) : String(value);
    return events.setNativeValue(element, output) ? 'filled' : 'unsupported-control';
  }
  root.OpenApplyFiller = { fill };
  if (typeof module !== 'undefined') module.exports = { fill };
})(globalThis);
