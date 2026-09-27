(function (root) {
  'use strict';
  const dom = root.OpenApplyDom;
  const allowed = new Set(['text', 'email', 'tel', 'url', 'number', 'date', 'month', 'radio', 'checkbox']);

  function metadata(element, overrides = {}) {
    const box = dom.container(element);
    return {
      element, type: element.tagName.toLowerCase() === 'input' ? (element.type || 'text').toLowerCase() : element.tagName.toLowerCase(),
      label: overrides.label || dom.labelFor(element), ariaLabel: element.getAttribute('aria-label') || '',
      placeholder: element.getAttribute('placeholder') || '', name: element.getAttribute('name') || '', id: element.id || '',
      nearby: overrides.nearby || dom.text(box?.querySelector('label, legend, [data-automation-id$="-label"], .field-label')),
      options: overrides.options || []
    };
  }

  function scan(rootElement = document) {
    const fields = [];
    const radioGroups = new Set();
    for (const element of rootElement.querySelectorAll('input, textarea, select')) {
      if (!dom.visible(element) || element.readOnly) continue;
      const type = element.tagName.toLowerCase() === 'input' ? (element.type || 'text').toLowerCase() : element.tagName.toLowerCase();
      if (type === 'input' || (element.tagName === 'INPUT' && !allowed.has(type))) continue;
      if (type === 'radio') {
        const key = element.name || element.id;
        if (key && radioGroups.has(key)) continue;
        if (key) radioGroups.add(key);
        const group = key ? Array.from(rootElement.querySelectorAll('input[type="radio"]')).filter(item => item.name === key && dom.visible(item)) : [element];
        const fieldset = element.closest('fieldset');
        const box = dom.container(element);
        fields.push(metadata(element, {
          label: dom.text(fieldset?.querySelector('legend')) || dom.text(box?.querySelector('legend, .field-label')) || dom.labelFor(element),
          options: group.map(item => ({ element: item, text: dom.labelFor(item) || item.value }))
        }));
      } else fields.push(metadata(element));
    }
    return fields;
  }
  root.OpenApplyScanner = { scan, metadata };
})(globalThis);
