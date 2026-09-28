const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/profile/countries');
const schema = require('../src/profile/schema');
const profiles = require('../src/profile/profileSet');
const storage = require('../src/profile/storage');

function mockStore(initial = {}) {
  const values = { ...initial };
  globalThis.chrome = { storage: { local: {
    get: async keys => Object.fromEntries((Array.isArray(keys) ? keys : [keys]).map(key => [key, values[key]])),
    set: async entries => Object.assign(values, entries),
    remove: async keys => { for (const key of Array.isArray(keys) ? keys : [keys]) delete values[key]; }
  } } };
  return values;
}

test('migrates saved single profile to Default and stores activeProfileId', async () => {
  const legacy = schema.normalizeProfile({ personal: { firstName: 'Ada' } });
  const values = mockStore({ openApplyProfile: legacy });
  const collection = await storage.loadCollection();
  assert.equal(collection.activeProfileId, 'default');
  assert.equal(collection.profiles[0].name, 'Default');
  assert.equal(profiles.resolve(collection).personal.firstName, 'Ada');
  assert.equal(values.activeProfileId, 'default');
  assert.equal(values.openApplyProfile, undefined);
  assert.equal(values.quickApplyProfiles.schemaVersion, 3);
});

test('selects only on explicit call and saves sparse variant changes', async () => {
  const values = mockStore();
  let collection = await storage.loadCollection();
  collection = profiles.duplicateProfile(collection, 'default', 'Remote');
  const variantId = collection.activeProfileId;
  collection = profiles.selectProfile(collection, 'default');
  await storage.saveCollection(collection);
  assert.equal((await storage.loadCollection()).activeProfileId, 'default');
  await storage.selectProfile(variantId);
  assert.equal(values.activeProfileId, variantId);
  const variant = await storage.load();
  variant.personal.city = 'Berlin';
  await storage.save(variant);
  assert.deepEqual(values.quickApplyProfiles.profiles[1].overrides, { personal: { city: 'Berlin' } });
  assert.equal((await storage.load()).personal.city, 'Berlin');
});

test('clear removes collections, legacy profile, active ID, and last result', async () => {
  const values = mockStore({ openApplyProfile: {}, quickApplyProfiles: profiles.emptyCollection(), activeProfileId: 'default', quickApplyLastResult: {} });
  await storage.clear();
  assert.deepEqual(values, {});
});
