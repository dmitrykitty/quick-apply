const { test } = require('node:test');
const assert = require('node:assert/strict');
require('../src/profile/countries');
const schema = require('../src/profile/schema');
const profiles = require('../src/profile/profileSet');

test('new collections wrap a v2 profile as Default', () => {
  const original = schema.normalizeProfile({ schemaVersion: 2, personal: { firstName: 'Ada' } });
  const collection = profiles.emptyCollection(original);
  assert.equal(collection.schemaVersion, 3);
  assert.equal(collection.activeProfileId, 'default');
  assert.deepEqual(collection.profiles.map(item => item.name), ['Default']);
  assert.deepEqual(profiles.resolve(collection), original);
});

test('variants store only overrides and inherit later base edits', () => {
  let collection = profiles.emptyCollection(schema.normalizeProfile({
    schemaVersion: 2, personal: { firstName: 'Ada', city: 'Warsaw' }, skills: ['JavaScript']
  }));
  collection = profiles.duplicateProfile(collection, 'default', 'Remote roles');
  const variantId = collection.activeProfileId;
  assert.equal(collection.profiles[1].baseProfileId, 'default');
  assert.deepEqual(collection.profiles[1].overrides, {});
  const editedVariant = profiles.resolve(collection);
  editedVariant.personal.city = 'Berlin';
  editedVariant.skills = [];
  collection = profiles.setProfile(collection, variantId, editedVariant);
  assert.deepEqual(collection.profiles[1].overrides, { personal: { city: 'Berlin' }, skills: [] });
  const editedBase = profiles.resolve(collection, 'default');
  editedBase.personal.firstName = 'Grace';
  collection = profiles.setProfile(collection, 'default', editedBase);
  assert.equal(profiles.resolve(collection, variantId).personal.firstName, 'Grace');
  assert.equal(profiles.resolve(collection, variantId).personal.city, 'Berlin');
  assert.deepEqual(profiles.resolve(collection, variantId).skills, []);
});

test('create, rename, select, duplicate, and delete preserve selected identity', () => {
  let collection = profiles.emptyCollection();
  collection = profiles.createProfile(collection, 'Engineering');
  const createdId = collection.activeProfileId;
  collection = profiles.renameProfile(collection, createdId, 'Engineering roles');
  collection = profiles.duplicateProfile(collection, createdId, 'Engineering remote');
  const variantId = collection.activeProfileId;
  assert.equal(collection.profiles.find(item => item.id === variantId).baseProfileId, createdId);
  collection = profiles.selectProfile(collection, 'default');
  assert.equal(collection.activeProfileId, 'default');
  collection = profiles.deleteProfile(collection, createdId);
  assert.equal(collection.profiles.find(item => item.id === variantId).baseProfileId, null);
  assert.equal(collection.profiles.find(item => item.id === variantId).name, 'Engineering remote');
  collection = profiles.deleteProfile(collection, 'default');
  assert.equal(collection.activeProfileId, variantId);
  collection = profiles.deleteProfile(collection, variantId);
  assert.deepEqual(collection.profiles.map(item => item.name), ['Default']);
});

test('deleting a base with children preserves their effective values', () => {
  let collection = profiles.emptyCollection(schema.normalizeProfile({ schemaVersion: 2, personal: { firstName: 'Ada' } }));
  collection = profiles.duplicateProfile(collection, 'default', 'One');
  const one = collection.activeProfileId;
  collection = profiles.duplicateProfile(collection, 'default', 'Two');
  const two = collection.activeProfileId;
  const edit = profiles.resolve(collection, two);
  edit.personal.city = 'Paris';
  collection = profiles.setProfile(collection, two, edit);
  const before = profiles.resolve(collection, two);
  collection = profiles.deleteProfile(collection, 'default');
  assert.deepEqual(profiles.resolve(collection, two), before);
  assert.equal(collection.profiles.find(item => item.id === one).baseProfileId, null);
  assert.equal(collection.profiles.find(item => item.id === two).baseProfileId, one);
});

test('collection JSON round trip preserves names, active ID, and sparse overrides', () => {
  let collection = profiles.emptyCollection(schema.exampleProfile());
  collection = profiles.duplicateProfile(collection, 'default', 'Hybrid');
  const updated = profiles.resolve(collection);
  updated.applicationDefaults.preferredWorkLocation = 'Hybrid';
  collection = profiles.setProfile(collection, collection.activeProfileId, updated);
  const imported = profiles.importCollection(JSON.parse(JSON.stringify(collection)));
  assert.deepEqual(imported, collection);
  assert.equal(imported.profiles[1].name, 'Hybrid');
  assert.deepEqual(imported.profiles[1].overrides, { applicationDefaults: { preferredWorkLocation: 'Hybrid' } });
});

test('collection import migrates single-profile and JobPrefill JSON', () => {
  const v2 = profiles.importCollection(schema.exampleProfile());
  assert.equal(v2.profiles[0].name, 'Default');
  assert.equal(profiles.resolve(v2).personal.firstName, 'Ada');
  const jobPrefill = profiles.importCollection({ personal: { firstName: 'Ada' }, workExperience: [], education: [] });
  assert.equal(profiles.resolve(jobPrefill).personal.firstName, 'Ada');
});

test('collection import rejects missing names, duplicate IDs, and cycles', () => {
  const base = profiles.emptyCollection();
  assert.throws(() => profiles.importCollection({ ...base, profiles: [{ ...base.profiles[0], name: '' }] }), /name is required/);
  assert.throws(() => profiles.importCollection({ ...base, profiles: [base.profiles[0], { ...base.profiles[0], name: 'Second' }] }), /IDs must be unique/);
  const cycle = { schemaVersion: 3, activeProfileId: 'a', profiles: [
    { id: 'a', name: 'A', baseProfileId: 'b', overrides: {} },
    { id: 'b', name: 'B', baseProfileId: 'a', overrides: {} }
  ] };
  assert.throws(() => profiles.importCollection(cycle), /cycle/);
});

test('example collection contains fixed named profiles with no user data', () => {
  const example = profiles.exampleCollection();
  assert.equal(example.schemaVersion, 3);
  assert.deepEqual(example.profiles.map(item => item.name), ['Example base', 'Example variant']);
  assert.equal(example.profiles[1].baseProfileId, 'default');
  assert.equal(example.profiles[0].overrides.personal.firstName, 'Ada');
  assert.deepEqual(example.profiles[1].overrides, { applicationDefaults: { preferredWorkLocation: 'Hybrid' } });
});
