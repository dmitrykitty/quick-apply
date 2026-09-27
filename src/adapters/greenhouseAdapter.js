(function (root) {
  'use strict';
  class GreenhouseAdapter extends root.OpenApplyBaseAdapter {
    static matches(url, document) {
      return /(^|\.)boards\.greenhouse\.io$|(^|\.)job-boards\.greenhouse\.io$/.test(url.hostname) ||
        !!document.querySelector('form#application_form, #grnhse_app');
    }
  }
  root.OpenApplyGreenhouseAdapter = GreenhouseAdapter;
})(globalThis);
