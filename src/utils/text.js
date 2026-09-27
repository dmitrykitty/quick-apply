(function (root) {
  'use strict';
  function normalize(value) {
    return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/ł/gi, 'l')
      .normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/[_-]/g, ' ')
      .replace(/\b(required|optional|wymagane|opcjonalne)\b/g, ' ')
      .replace(/[^\p{L}\p{N}]+/gu, ' ').trim().replace(/\s+/g, ' ');
  }
  root.OpenApplyText = { normalize };
  if (typeof module !== 'undefined') module.exports = { normalize };
})(globalThis);
