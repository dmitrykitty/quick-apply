(function (root) {
  'use strict';
  function setNativeValue(element, value) {
    const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype :
      element instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (!setter) return false;
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  }
  function setChecked(element, checked) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked')?.set;
    setter.call(element, checked);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }
  root.OpenApplyEvents = { setNativeValue, setChecked };
})(globalThis);
