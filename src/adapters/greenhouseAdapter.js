(function (root) {
  'use strict';
  class GreenhouseAdapter extends root.OpenApplyBaseAdapter {
    static matches(url, document) {
      return /(^|\.)boards\.greenhouse\.io$|(^|\.)job-boards\.greenhouse\.io$/.test(url.hostname) ||
        !!document.querySelector('form#application_form, #grnhse_app');
    }
    scanFields() {
      const application = document.querySelector('#application_form, #grnhse_app');
      return application ? root.OpenApplyScanner.scan(application) : [];
    }
  }
  root.OpenApplyGreenhouseAdapter = GreenhouseAdapter;
})(globalThis);
