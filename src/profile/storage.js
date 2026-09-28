(function (root) {
  'use strict';

  const LEGACY_KEY = 'openApplyProfile';
  const COLLECTION_KEY = 'quickApplyProfiles';
  const ACTIVE_KEY = 'activeProfileId';
  const RESULT_KEY = 'quickApplyLastResult';
  const profiles = root.OpenApplyProfiles;

  async function saveCollection(collection) {
    const clean = profiles.normalizeCollection(collection);
    await chrome.storage.local.set({ [COLLECTION_KEY]: clean, [ACTIVE_KEY]: clean.activeProfileId });
    await chrome.storage.local.remove(LEGACY_KEY);
    return clean;
  }

  async function loadCollection() {
    const values = await chrome.storage.local.get([COLLECTION_KEY, ACTIVE_KEY, LEGACY_KEY]);
    if (values[COLLECTION_KEY]) {
      const saved = values[COLLECTION_KEY];
      const id = saved.profiles?.some(item => item.id === values[ACTIVE_KEY]) ?
        values[ACTIVE_KEY] : saved.activeProfileId;
      return profiles.normalizeCollection({ ...saved, activeProfileId: id });
    }
    const migrated = profiles.emptyCollection(
      values[LEGACY_KEY] ? root.OpenApplySchema.normalizeProfile(values[LEGACY_KEY]) : undefined
    );
    return saveCollection(migrated);
  }

  const api = {
    loadCollection,
    saveCollection,
    async load() {
      const collection = await loadCollection();
      return profiles.resolve(collection);
    },
    async save(profile, id) {
      const collection = await loadCollection();
      const targetId = id || collection.activeProfileId;
      const updated = profiles.setProfile(collection, targetId, profile);
      await saveCollection(updated);
      return profiles.resolve(updated, targetId);
    },
    async selectProfile(id) {
      const collection = await loadCollection();
      return saveCollection(profiles.selectProfile(collection, id));
    },
    async clear() {
      await chrome.storage.local.remove([COLLECTION_KEY, ACTIVE_KEY, LEGACY_KEY, RESULT_KEY]);
    },
    async loadLastResult() {
      return (await chrome.storage.local.get(RESULT_KEY))[RESULT_KEY] || null;
    },
    async saveLastResult(result) {
      await chrome.storage.local.set({ [RESULT_KEY]: result });
    }
  };
  root.OpenApplyStorage = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
