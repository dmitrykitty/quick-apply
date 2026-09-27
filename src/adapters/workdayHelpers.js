(function (root) {
  'use strict';
  const dom = root.OpenApplyDom;
  const optionSelector = '[role="option"], [data-automation-id="promptOption"]';
  const listSelector = '[role="listbox"], [data-automation-id="promptContainer"]';

  function getWorkdayFieldContainer(element) {
    return element.closest('[data-automation-id="formField"], [data-automation-id="formFieldContainer"], [data-automation-id="promptEntry"]') || dom.container(element);
  }

  function getWorkdayLabel(element) {
    const container = getWorkdayFieldContainer(element);
    return dom.text(container?.querySelector('[data-automation-id="formFieldLabel"], [data-automation-id="promptLabel"], label')) || dom.labelFor(element);
  }

  function getRepeatedIndex(element) {
    const row = element.closest('[data-automation-id="educationEntry"], [data-automation-id="educationItem"], [data-automation-id="workExperienceEntry"], [data-automation-id="workExperienceItem"]');
    if (!row?.parentElement) return null;
    const marker = row.getAttribute('data-automation-id');
    const siblings = Array.from(row.parentElement.children).filter(item => item.getAttribute('data-automation-id') === marker);
    const index = siblings.indexOf(row);
    return index < 0 ? null : { kind: marker.startsWith('education') ? 'education' : 'experience', index };
  }

  function getCurrentComboboxValue(element) {
    const direct = element.value || element.getAttribute('aria-valuetext') || element.getAttribute('data-value') ||
      dom.text(element.querySelector?.('[data-automation-id="selectedItem"], [data-automation-id="selectedValue"]'));
    const display = direct || (element.tagName === 'BUTTON' ? dom.text(element) : '');
    return /^(?:(?:select|choose|wybierz)(?:\s|$))/.test(root.OpenApplyText.normalize(display)) || !root.OpenApplyText.normalize(display) ? '' : display;
  }

  function waitForElement(find, timeoutMs = 1800, observedRoot = document) {
    return new Promise(resolve => {
      let settled = false;
      let observer;
      let interval;
      let timeout;
      const finish = value => {
        if (settled) return;
        settled = true;
        observer?.disconnect(); clearInterval(interval); clearTimeout(timeout);
        resolve(value || null);
      };
      const check = () => { try { const found = find(); if (found) finish(found); } catch { finish(null); } };
      check();
      if (settled) return;
      if (typeof MutationObserver !== 'undefined') {
        observer = new MutationObserver(check);
        observer.observe(observedRoot, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style', 'aria-expanded'] });
      }
      interval = setInterval(check, 75);
      timeout = setTimeout(() => finish(null), timeoutMs);
    });
  }

  function visibleLists(scope = document) {
    return Array.from(scope.querySelectorAll(listSelector)).filter(dom.visible);
  }

  function listFor(control, before = new Set()) {
    const id = control.getAttribute('aria-controls') || control.getAttribute('aria-owns');
    if (id) {
      const target = document.getElementById(id);
      if (target && dom.visible(target)) return target;
    }
    const container = getWorkdayFieldContainer(control);
    const local = visibleLists(container);
    if (local.length === 1) return local[0];
    const opened = visibleLists().filter(list => !before.has(list));
    return opened.length === 1 ? opened[0] : null;
  }

  function waitForList(control, before, timeoutMs = 1800) {
    return waitForElement(() => listFor(control, before), timeoutMs);
  }

  async function waitForVisibleOptions(control, before, timeoutMs = 1800, predicate = () => true) {
    return waitForElement(() => {
      const list = listFor(control, before);
      if (!list) return null;
      const options = Array.from(list.querySelectorAll(optionSelector)).filter(dom.visible);
      return options.some(predicate) ? { list, options } : null;
    }, timeoutMs);
  }

  function searchInput(control, list) {
    if (control.tagName === 'INPUT' && !control.readOnly && /^(list|both)$/i.test(control.getAttribute('aria-autocomplete') || '')) return control;
    const candidate = list?.querySelector('input[aria-autocomplete="list"], input[data-automation-id="searchBox"]');
    return candidate && !candidate.readOnly && dom.visible(candidate) ? candidate : null;
  }

  root.OpenApplyWorkdayHelpers = {
    getWorkdayFieldContainer, getWorkdayLabel, getRepeatedIndex, getCurrentComboboxValue,
    waitForElement, waitForList, waitForVisibleOptions, visibleLists, searchInput
  };
  if (typeof module !== 'undefined') module.exports = root.OpenApplyWorkdayHelpers;
})(globalThis);
