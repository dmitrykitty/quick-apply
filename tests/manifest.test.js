const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('Manifest V3 paths exist and permissions stay narrow', () => {
  const root = path.resolve(__dirname, '..');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.name, 'Quick Apply');
  assert.deepEqual(manifest.permissions, ['storage', 'activeTab', 'scripting']);
  assert.equal(manifest.host_permissions, undefined);
  for (const file of [manifest.action.default_popup, manifest.options_page, ...Object.values(manifest.icons)]) {
    assert.equal(fs.existsSync(path.join(root, file)), true, `${file} must exist`);
  }
});
