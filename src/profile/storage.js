(function (root) {
  'use strict';
  const KEY = 'openApplyProfile';
  const RESULT_KEY = 'quickApplyLastResult';
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
    async clear() { await chrome.storage.local.remove([KEY, RESULT_KEY]); },
    async loadLastResult() { return (await chrome.storage.local.get(RESULT_KEY))[RESULT_KEY] || null; },
    async saveLastResult(result) { await chrome.storage.local.set({ [RESULT_KEY]: result }); }
  };
  root.OpenApplyStorage = api;
})(globalThis);
