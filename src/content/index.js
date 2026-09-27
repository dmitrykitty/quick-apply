(function (root) {
  'use strict';
  function detect() {
    const url = new URL(location.href);
    for (const Adapter of [root.OpenApplyGreenhouseAdapter, root.OpenApplyLeverAdapter, root.OpenApplyWorkdayAdapter]) {
      if (Adapter.matches(url, document)) return new Adapter();
    }
    return null;
  }
  root.OpenApplyRun = async profile => {
    const adapter = detect();
    if (!adapter) return { platform: 'Unsupported', filled: 0, skipped: 0, unknown: [], details: [], error: 'This page is not a supported application form.' };
    return adapter.fill(profile);
  };
})(globalThis);
