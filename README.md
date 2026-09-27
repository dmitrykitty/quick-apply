# Quick Apply

Quick Apply is a privacy-first Chrome and Edge extension for autofilling repetitive job applications. It stores your profile in your browser, fills the current application when you click, and never submits it for you. Greenhouse and Lever standard forms are the primary targets; Workday support covers common controls with clear limits.

## Install and use

1. Clone or download this repository.
2. Open `chrome://extensions` or `edge://extensions`, turn on **Developer mode**, choose **Load unpacked**, and select the folder containing `manifest.json`. There is no build step.
3. Open Quick Apply and choose **Edit profile**. Add your information in the full-size options page and save it.
4. Open an application and click **Fill application** in the popup. Review the Filled, Skipped, and Need review sections before you submit the form yourself.
5. On a later Workday step, advance manually and click **Fill application** again. Each click scans the current DOM afresh.

The options page supports personal details, links, repeatable education and experience entries, skill chips, repeatable language rows, work authorization, and common yes/no answers. Education and experience dates accept `YYYY-MM`; older saved education years remain visible as `YYYY` until you refine them. The first entry should be the most recent.

**Import JSON** accepts a Quick Apply export or a JobPrefill profile. Imported data is displayed for review before you save. JobPrefill résumé content and voluntary disclosures are excluded. **Export JSON** downloads your current profile, including remembered answers, so treat the file as private. **Clear profile** requires confirmation.

## Supported forms

| Platform | What works | Important limits |
| --- | --- | --- |
| Greenhouse | Visible standard text, email, phone, textarea, native select, radio, and safe checkbox fields inside its application form. | Embedded variations and custom widgets may need manual review. |
| Lever | Standard application controls, including a derived full name. | Custom questions need an explicit remembered answer. |
| Workday | Standard controls, `YYYY-MM` month fields, and comboboxes with a linked or newly opened listbox. Search is used only for clearly editable controls; an exact unique option is required. | Calendar widgets, ambiguous dropdowns, uploads, and many tenant-specific controls remain manual. |

The weighted matcher reads labels, ARIA labels, associated label IDs, identifiers, placeholders, and nearby section context. It supports common English and Polish labels, including **expected graduation date** and **przewidywana data ukończenia studiów**. Generic history dates require education or experience context. Low-confidence or tied matches are left for review. Existing nonempty answers are preserved.

When Workday exposes explicit repeated education or experience rows, Quick Apply maps them to matching profile entries. If it cannot identify a repeated row safely, it reports the field for review instead of copying the first entry into every row. Each dropdown wait is bounded; the extension never clicks Next or Submit.

## Remembered answers

In a fill result, an unknown nonsensitive question can offer **Remember answer**. You type the answer and save it deliberately. It is kept in `chrome.storage.local` with the exact normalized question, control type, platform, and site domain. Future fills use it only for that same question and scope. The option is withheld for demographic, disability, veteran, gender, ethnicity, consent, certification, and similar sensitive questions. You can remove remembered answers in **Data & privacy**.

## Privacy and permissions

Quick Apply has no backend, telemetry, analytics, remote code, automatic submission, or extension-initiated network requests. Its profile and last result remain in `chrome.storage.local`. The manifest requests `storage`, `activeTab`, and `scripting`; it requests no permanent host permissions. `activeTab` provides temporary access when you invoke the popup, and local scripts run in the extension's isolated world. Browser-protected pages and some cross-origin embedded forms cannot be filled under this permission model.

## Architecture

- `src/profile/` normalizes, migrates, imports, and stores profiles.
- `src/content/` scans visible controls, scores matches, fills controls, and summarizes results.
- `src/adapters/` detects ATS platforms and handles their specific DOM behavior. Workday helpers manage bounded waits and associated dropdowns.
- `src/utils/` contains DOM, Unicode text, and native event helpers.
- `src/popup/` provides the compact fill action and structured result.
- `src/options/` provides the full profile editor.
- `tests/fixtures/` contains synthetic, redacted ATS-like forms.

Internal `OpenApply*` symbols remain for compatibility with the existing modules; the product, package, UI, and exports use **Quick Apply**.

To add an adapter, extend `OpenApplyBaseAdapter`, implement `matches(url, document)`, and override `scanFields()` or `fillField()` only where the platform needs it. Register the file in the ordered injection list in `src/popup/popup.js` and in detection in `src/content/index.js`. Add a synthetic fixture and matching tests. Keep uncertain controls as review items.

## Development and tests

Run `npm test` for dependency-free Node unit tests and manifest checks. GitHub Actions runs these tests on pull requests and pushes to `main` with Node 24 LTS.

An optional real-browser smoke test covers the options page, popup result and remembered-answer flow, and Greenhouse, Lever, and Workday fixtures:

```sh
npm install --no-save playwright
npm run test:browser
```

Use Node 20 or newer and installed Chrome, or set `QUICK_APPLY_BROWSER_CHANNEL=msedge` for Edge. The browser test uses synthetic values and does not contact an ATS or submit an application. Live ATS pages can change, so it does not prove full compatibility with every tenant.

Manual checklist:

1. Load the extension unpacked in Chrome and Edge; check the icon, popup, and options page.
2. Import a profile, verify old education years and month-level dates, save, close, and reopen the editor.
3. Try a Greenhouse and Lever application. Confirm prefilled answers stay unchanged and unknown questions appear under Need review.
4. Try several Workday steps. Check an exact dropdown match, a search dropdown, expected graduation month, and a control that must be skipped.
5. Save one nonsensitive remembered answer, refill the same site, then remove it. Confirm sensitive questions have no Remember option.
6. Check that no form is submitted automatically.

## Known limitations

- Workday is **partial**. Tenant-specific widgets, date pickers requiring a day, file uploads, deeply nested or cross-origin frames, and ambiguous option lists remain unsupported.
- A month-level saved date is not converted to a full calendar date by guessing a day.
- Repeated rows without recognizable structure are reported for review.
- Live application sites have not been exhaustively tested; use the result panel and review all fields.

## Screenshots

- Popup: screenshot to be added after an unpacked-extension visual pass.
- Profile editor: screenshot to be added after an unpacked-extension visual pass.

## Contributing

Open an issue with the ATS URL pattern, field label and control type, and a **redacted** HTML snippet. Do not post a real profile or application answers. Add narrow aliases, tests, and an adapter override only where needed. Run `npm test` and the optional browser smoke test before opening a pull request.

MIT licensed; see [LICENSE](LICENSE).
