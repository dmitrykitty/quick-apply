(function (root) {
  'use strict';
  class LeverAdapter extends root.OpenApplyBaseAdapter {
    static matches(url, document) {
      return /(^|\.)jobs\.lever\.co$/.test(url.hostname) ||
        !!document.querySelector('form.application-form, .lever-application-form');
    }
    scanFields() {
      return root.OpenApplyScanner.scan(document.querySelector('form.application-form, .lever-application-form') || document);
    }
  }
  root.OpenApplyLeverAdapter = LeverAdapter;
})(globalThis);
