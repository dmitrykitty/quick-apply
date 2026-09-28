(function (root) {
  'use strict';
  class BaseAdapter {
    static matches() { return false; }
    scanFields() { return root.OpenApplyScanner.scan(); }
    async fillField(field, value) { return root.OpenApplyFiller.fill(field, value); }
    async fill(profile) {
      const summary = { platform: this.constructor.name.replace('Adapter', ''), domain: location.hostname,
        filled: 0, skipped: 0, review: 0, unknown: [], details: [] };
      const fields = this.scanFields();
      if (!fields.length) return { ...summary, error: 'No visible application fields found on this page.' };
      const seenHistory = new Set();
      for (const field of fields) {
        const match = root.OpenApplyMatcher.match(field);
        const label = field.label || field.ariaLabel || field.name || field.id || 'Unlabeled field';
        const savedValue = match ? root.OpenApplyMatcher.valueAt(profile, match.path, field) : undefined;
        const learned = (!match || savedValue === undefined || savedValue === null || savedValue === '') &&
          root.OpenApplyMatcher.findCustomAnswer(profile, field, summary.platform, summary.domain);
        if (!match && !learned) {
          const sensitive = root.OpenApplyMatcher.isSensitiveQuestion(label);
          summary.unknown.push({ label, type: field.type, sensitive });
          summary.review++;
          summary.details.push({ label, type: field.type, result: 'unknown-field', category: 'review',
            sensitive, learnable: root.OpenApplyMatcher.isLearnableQuestion(label) });
          continue;
        }
        let path = learned ? 'custom' : match.path;
        if (field.record && path.startsWith(`${field.record.kind}.0.`)) {
          path = path.replace(`${field.record.kind}.0.`, `${field.record.kind}.${field.record.index}.`);
        }
        if (/^(education|experience)\.\d+\./.test(path) && seenHistory.has(path)) {
          summary.review++;
          summary.details.push({ label, type: field.type, path, result: 'repeated-field-needs-review', category: 'review' });
          continue;
        }
        if (/^(education|experience)\.\d+\./.test(path)) seenHistory.add(path);
        const optionControl = ['select', 'radio'].includes(field.type) || field.element.getAttribute?.('role') === 'combobox';
        const value = learned ? learned.answer : optionControl ?
          root.OpenApplyMatcher.candidatesAt(profile, path, field) : root.OpenApplyMatcher.valueAt(profile, path, field);
        const result = await this.fillField(field, value);
        const category = result === 'filled' ? 'filled' :
          ['already-filled', 'no-profile-value'].includes(result) ? 'skipped' : 'review';
        summary[category]++;
        summary.details.push({ label, type: field.type, path,
          confidence: learned ? 'high' : match.confidence, result, category });
      }
      return summary;
    }
  }
  root.OpenApplyBaseAdapter = BaseAdapter;
})(globalThis);
