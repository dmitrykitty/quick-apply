(function (root) {
  'use strict';
  class WorkdayAdapter extends root.OpenApplyBaseAdapter {
    static matches(url, document) {
      return /(^|\.)myworkdayjobs\.com$|(^|\.)myworkdaysite\.com$/.test(url.hostname) ||
        !!document.querySelector('[data-automation-id="jobPostingPage"], [data-automation-id="applyFlowPage"]');
    }
    scanFields() {
      const fields = super.scanFields();
      for (const field of fields) {
        const container = field.element.closest('[data-automation-id="formField"], [data-automation-id="formFieldContainer"]');
        if (container) field.label ||= root.OpenApplyDom.text(container.querySelector('[data-automation-id="formFieldLabel"], label'));
      }
      for (const element of document.querySelectorAll('[role="combobox"]')) {
        if (!root.OpenApplyDom.visible(element) || fields.some(field => field.element === element)) continue;
        const container = element.closest('[data-automation-id="formField"], [data-automation-id="formFieldContainer"]');
        fields.push(root.OpenApplyScanner.metadata(element, {
          label: root.OpenApplyDom.text(container?.querySelector('[data-automation-id="formFieldLabel"], label'))
        }));
      }
      return fields;
    }
    async fillField(field, value) {
      const control = field.element;
      if (control.getAttribute('role') !== 'combobox') return super.fillField(field, value);
      if (value === null || value === undefined || value === '' || typeof value === 'boolean') return 'no-profile-value';
      if (control.value?.trim() || control.getAttribute('aria-valuetext')) return 'already-filled';
      control.click();
      await new Promise(resolve => setTimeout(resolve, 150));
      const controlledId = control.getAttribute('aria-controls') || control.getAttribute('aria-owns');
      const list = controlledId ? document.getElementById(controlledId) :
        (() => { const lists = Array.from(document.querySelectorAll('[role="listbox"]')).filter(root.OpenApplyDom.visible); return lists.length === 1 ? lists[0] : null; })();
      if (!list) return 'unsupported-control';
      const desired = root.OpenApplyText.normalize(value);
      const choices = Array.from(list.querySelectorAll('[role="option"]')).filter(root.OpenApplyDom.visible);
      const matches = choices.filter(option => root.OpenApplyText.normalize(root.OpenApplyDom.text(option)) === desired);
      if (matches.length !== 1) return 'unmatched-option';
      matches[0].click();
      return 'filled';
    }
  }
  root.OpenApplyWorkdayAdapter = WorkdayAdapter;
})(globalThis);
