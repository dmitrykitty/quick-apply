(function (root) {
  'use strict';
  class BaseAdapter {
    static matches() { return false; }
    scanFields() { return root.OpenApplyScanner.scan(); }
    async fillField(field, value) { return root.OpenApplyFiller.fill(field, value); }
    async fill(profile) {
      const summary = { platform: this.constructor.name.replace('Adapter', ''), filled: 0, skipped: 0, unknown: [], details: [] };
      const fields = this.scanFields();
      if (!fields.length) return { ...summary, error: 'No visible application fields found on this page.' };
      for (const field of fields) {
        const match = root.OpenApplyMatcher.match(field);
        const label = field.label || field.ariaLabel || field.name || field.id || 'Unlabeled field';
        if (!match) { summary.unknown.push(label); continue; }
        const result = await this.fillField(field, root.OpenApplyMatcher.valueAt(profile, match.path));
        summary[result === 'filled' ? 'filled' : 'skipped']++;
        summary.details.push({ label, path: match.path, result });
      }
      return summary;
    }
  }
  root.OpenApplyBaseAdapter = BaseAdapter;
})(globalThis);
