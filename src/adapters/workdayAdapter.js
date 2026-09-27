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
      // Workday's custom comboboxes vary widely. Only native controls are changed.
      return fields;
    }
  }
  root.OpenApplyWorkdayAdapter = WorkdayAdapter;
})(globalThis);
