(function (root) {
  'use strict';
  const helpers = root.OpenApplyWorkdayHelpers;
  class WorkdayAdapter extends root.OpenApplyBaseAdapter {
    static matches(url, document) {
      return /(^|\.)myworkdayjobs\.com$|(^|\.)myworkdaysite\.com$/.test(url.hostname) ||
        !!document.querySelector('[data-automation-id="jobPostingPage"], [data-automation-id="applyFlowPage"]');
    }
    scanFields() {
      const application = document.querySelector('[data-automation-id="applyFlowPage"], [data-automation-id="applyFlow"], form[data-automation-id="applyFlowForm"]');
      if (!application) return [];
      const fields = root.OpenApplyScanner.scan(application);
      for (const field of fields) {
        field.label = helpers.getWorkdayLabel(field.element) || field.label;
        field.record = helpers.getRepeatedIndex(field.element);
      }
      for (const element of application.querySelectorAll('[role="combobox"]')) {
        if (!root.OpenApplyDom.visible(element) || fields.some(field => field.element === element)) continue;
        const field = root.OpenApplyScanner.metadata(element, {
          label: helpers.getWorkdayLabel(element)
        });
        field.record = helpers.getRepeatedIndex(element);
        fields.push(field);
      }
      return fields;
    }
    async fillField(field, value) {
      const control = field.element;
      if (control.getAttribute('role') !== 'combobox') return super.fillField(field, value);
      if (value === null || value === undefined || value === '') return 'no-profile-value';
      if (helpers.getCurrentComboboxValue(control)) return 'already-filled';
      const before = new Set(helpers.visibleLists());
      control.click();
      const list = await helpers.waitForList(control, before);
      if (!list) return 'unsupported-workday-control';
      const desired = typeof value === 'boolean' ? (value ? ['yes', 'true', 'tak'] : ['no', 'false', 'nie']) : [root.OpenApplyText.normalize(value)];
      const options = Array.from(list.querySelectorAll('[role="option"], [data-automation-id="promptOption"]')).filter(root.OpenApplyDom.visible);
      let matches = options.filter(option => desired.includes(root.OpenApplyText.normalize(root.OpenApplyDom.text(option))));
      if (!matches.length && typeof value === 'string') {
        const input = helpers.searchInput(control, list);
        if (input) {
          root.OpenApplyEvents.setNativeValue(input, value);
          const found = await helpers.waitForVisibleOptions(control, before, 1800,
            option => desired.includes(root.OpenApplyText.normalize(root.OpenApplyDom.text(option))));
          matches = found?.options.filter(option => desired.includes(root.OpenApplyText.normalize(root.OpenApplyDom.text(option)))) || [];
          if (matches.length !== 1) root.OpenApplyEvents.setNativeValue(input, '');
        }
      }
      if (matches.length !== 1) return 'unmatched-option';
      matches[0].click();
      return 'filled';
    }
  }
  root.OpenApplyWorkdayAdapter = WorkdayAdapter;
})(globalThis);
