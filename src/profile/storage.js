(function (root) {
  'use strict';
  const KEY = 'openApplyProfile';
  const api = {
    async load() {
      const result = await chrome.storage.local.get(KEY);
      return root.OpenApplySchema.normalizeProfile(result[KEY]);
    },
    async save(profile) {
      const clean = root.OpenApplySchema.normalizeProfile(profile);
      await chrome.storage.local.set({ [KEY]: clean });
      return clean;
    },
    async clear() { await chrome.storage.local.remove(KEY); }
  };
  root.OpenApplyStorage = api;
})(globalThis);
