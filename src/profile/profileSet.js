(function (root) {
  'use strict';

  const schema = root.OpenApplySchema;
  const clone = value => JSON.parse(JSON.stringify(value));
  const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const unsafeKeys = new Set(['__proto__', 'prototype', 'constructor']);
  const validName = value => typeof value === 'string' && value.trim() ? value.trim() : null;

  function merge(base, overrides) {
    if (!object(base) || !object(overrides)) return clone(overrides);
    const result = clone(base);
    for (const [key, value] of Object.entries(overrides)) {
      if (unsafeKeys.has(key)) continue;
      result[key] = object(value) && object(result[key]) ? merge(result[key], value) : clone(value);
    }
    return result;
  }

  function diff(base, target) {
    if (equal(base, target)) return undefined;
    if (!object(base) || !object(target)) return clone(target);
    const changed = {};
    for (const [key, value] of Object.entries(target)) {
      const delta = diff(base[key], value);
      if (delta !== undefined) changed[key] = delta;
    }
    return changed;
  }

  function uniqueName(collection, requested, exceptId) {
    const name = validName(requested);
    if (!name) throw new Error('Profile name cannot be empty.');
    if (collection.profiles.some(item => item.id !== exceptId && item.name.toLowerCase() === name.toLowerCase())) {
      throw new Error('A profile with that name already exists.');
    }
    return name;
  }

  function nextName(collection, requested) {
    let name = requested;
    let suffix = 2;
    while (collection.profiles.some(item => item.name.toLowerCase() === name.toLowerCase())) {
      name = `${requested} ${suffix++}`;
    }
    return name;
  }

  function newId(collection) {
    let id;
    do {
      id = `profile-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    } while (collection.profiles.some(item => item.id === id));
    return id;
  }

  function emptyCollection(profile = schema.emptyProfile()) {
    return {
      schemaVersion: 3,
      activeProfileId: 'default',
      profiles: [{
        id: 'default',
        name: 'Default',
        baseProfileId: null,
        overrides: schema.normalizeProfile(profile)
      }]
    };
  }

  function resolve(collection, id = collection.activeProfileId, visiting = new Set()) {
    const record = collection.profiles.find(item => item.id === id);
    if (!record) throw new Error(`Profile ${id} was not found.`);
    if (visiting.has(id)) throw new Error('Profile inheritance contains a cycle.');
    visiting.add(id);
    const base = record.baseProfileId ? resolve(collection, record.baseProfileId, visiting) : schema.emptyProfile();
    visiting.delete(id);
    return schema.normalizeProfile(merge(base, record.overrides));
  }

  function normalizeCollection(input) {
    if (!object(input) || input.schemaVersion !== 3 || !Array.isArray(input.profiles) || !input.profiles.length) {
      throw new Error('Expected a schemaVersion 3 profile collection with profiles.');
    }
    if (input.profiles.length > 100) throw new Error('A collection can contain at most 100 profiles.');
    const profiles = input.profiles.map((item, index) => {
      if (!object(item)) throw new Error(`profiles[${index}] must be an object.`);
      if (typeof item.id !== 'string' || !item.id.trim()) throw new Error(`profiles[${index}].id is required.`);
      if (!validName(item.name)) throw new Error(`profiles[${index}].name is required.`);
      if (item.baseProfileId !== null && item.baseProfileId !== undefined && typeof item.baseProfileId !== 'string') {
        throw new Error(`profiles[${index}].baseProfileId must be a profile ID or null.`);
      }
      if (!object(item.overrides)) throw new Error(`profiles[${index}].overrides must be an object.`);
      return {
        id: item.id.trim(),
        name: item.name.trim(),
        baseProfileId: item.baseProfileId || null,
        overrides: clone(item.overrides)
      };
    });
    if (new Set(profiles.map(item => item.id)).size !== profiles.length) throw new Error('Profile IDs must be unique.');
    if (new Set(profiles.map(item => item.name.toLowerCase())).size !== profiles.length) throw new Error('Profile names must be unique.');
    for (const item of profiles) {
      if (item.baseProfileId && !profiles.some(parent => parent.id === item.baseProfileId)) {
        throw new Error(`Base profile for ${item.name} was not found.`);
      }
    }
    const activeProfileId = input.activeProfileId;
    if (!profiles.some(item => item.id === activeProfileId)) throw new Error('activeProfileId must identify an existing profile.');
    const normalized = { schemaVersion: 3, activeProfileId, profiles: [] };
    const done = new Map();
    const build = (id, visiting = new Set()) => {
      if (done.has(id)) return done.get(id);
      if (visiting.has(id)) throw new Error('Profile inheritance contains a cycle.');
      visiting.add(id);
      const record = profiles.find(item => item.id === id);
      const base = record.baseProfileId ? build(record.baseProfileId, visiting) : schema.emptyProfile();
      if (!record.baseProfileId && !object(record.overrides.personal)) {
        throw new Error(`Base profile ${record.name} needs a personal object.`);
      }
      const full = schema.normalizeProfile(merge(base, record.overrides));
      visiting.delete(id);
      done.set(id, full);
      return full;
    };
    for (const record of profiles) {
      const full = build(record.id);
      const base = record.baseProfileId ? build(record.baseProfileId) : null;
      normalized.profiles.push({
        id: record.id,
        name: record.name,
        baseProfileId: record.baseProfileId,
        overrides: base ? diff(base, full) || {} : full
      });
    }
    return normalized;
  }

  function setProfile(collection, id, fullProfile) {
    const result = clone(collection);
    const record = result.profiles.find(item => item.id === id);
    if (!record) throw new Error('Profile was not found.');
    const full = schema.normalizeProfile(fullProfile);
    record.overrides = record.baseProfileId ? diff(resolve(result, record.baseProfileId), full) || {} : full;
    return result;
  }

  function selectProfile(collection, id) {
    if (!collection.profiles.some(item => item.id === id)) throw new Error('Profile was not found.');
    return { ...collection, activeProfileId: id };
  }

  function createProfile(collection, name) {
    const result = clone(collection);
    const chosen = uniqueName(result, name);
    const id = newId(result);
    result.profiles.push({ id, name: chosen, baseProfileId: null, overrides: schema.emptyProfile() });
    result.activeProfileId = id;
    return result;
  }

  function duplicateProfile(collection, id, name) {
    const result = clone(collection);
    const source = result.profiles.find(item => item.id === id);
    if (!source) throw new Error('Profile was not found.');
    const chosen = uniqueName(result, name || nextName(result, `${source.name} copy`));
    const newProfileId = newId(result);
    result.profiles.push({ id: newProfileId, name: chosen, baseProfileId: id, overrides: {} });
    result.activeProfileId = newProfileId;
    return result;
  }

  function renameProfile(collection, id, name) {
    const result = clone(collection);
    const record = result.profiles.find(item => item.id === id);
    if (!record) throw new Error('Profile was not found.');
    record.name = uniqueName(result, name, id);
    return result;
  }

  function deleteProfile(collection, id) {
    const result = clone(collection);
    const record = result.profiles.find(item => item.id === id);
    if (!record) throw new Error('Profile was not found.');
    const children = result.profiles.filter(item => item.baseProfileId === id);
    const effective = new Map(children.map(item => [item.id, resolve(result, item.id)]));
    let newParent = record.baseProfileId;
    if (!newParent && children.length) {
      const promoted = children.shift();
      promoted.baseProfileId = null;
      promoted.overrides = effective.get(promoted.id);
      newParent = promoted.id;
    }
    for (const child of children) {
      child.baseProfileId = newParent;
      child.overrides = newParent ? diff(resolve(result, newParent), effective.get(child.id)) || {} : effective.get(child.id);
    }
    result.profiles = result.profiles.filter(item => item.id !== id);
    if (!result.profiles.length) return emptyCollection();
    if (result.activeProfileId === id) result.activeProfileId = newParent || result.profiles[0].id;
    return result;
  }

  function importCollection(input) {
    if (object(input) && input.schemaVersion === 3) return normalizeCollection(input);
    return emptyCollection(schema.importProfile(input));
  }

  function exampleCollection() {
    const collection = emptyCollection(schema.exampleProfile());
    collection.profiles[0].name = 'Example base';
    const withVariant = duplicateProfile(collection, 'default', 'Example variant');
    const variant = resolve(withVariant);
    variant.applicationDefaults.preferredWorkLocation = 'Hybrid';
    return setProfile(withVariant, withVariant.activeProfileId, variant);
  }

  const api = {
    emptyCollection, normalizeCollection, importCollection, exampleCollection, resolve, setProfile,
    selectProfile, createProfile, duplicateProfile, renameProfile, deleteProfile, merge, diff
  };
  root.OpenApplyProfiles = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
