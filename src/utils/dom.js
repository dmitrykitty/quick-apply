(function (root) {
  'use strict';
  function visible(element) {
    if (!element || element.disabled || element.hidden || element.closest('[hidden], [aria-hidden="true"], [inert]')) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  }
  function text(element) { return element?.textContent?.replace(/\s+/g, ' ').trim() || ''; }
  function labelFor(element) {
    const labels = element.labels ? Array.from(element.labels).map(text).filter(Boolean) : [];
    if (labels.length) return labels.join(' ');
    const ids = (element.getAttribute('aria-labelledby') || '').split(/\s+/).filter(Boolean);
    const aria = ids.map(id => text(document.getElementById(id))).filter(Boolean).join(' ');
    if (aria) return aria;
    return text(element.closest('label'));
  }
  function container(element) {
    return element.closest('[data-automation-id$="-section"], .field, .form-field, .application-question, .input-wrapper, fieldset') || element.parentElement;
  }
  root.OpenApplyDom = { visible, text, labelFor, container };
})(globalThis);
