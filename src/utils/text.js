(function (root) {
  'use strict';
  function normalize(value) {
    return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ')
      .toLowerCase().replace(/\b(required|optional)\b/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  root.OpenApplyText = { normalize };
  if (typeof module !== 'undefined') module.exports = { normalize };
})(globalThis);
