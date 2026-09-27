# OpenApply Autofill

A small, open-source Chrome and Edge extension for filling repetitive job application fields. It uses Manifest V3, runs only when you click **Fill Current Application**, and never submits a form.

## Install and use

1. Download or clone this repository.
2. In Chrome, open `chrome://extensions`; in Edge, open `edge://extensions`.
3. Enable **Developer mode**, choose **Load unpacked**, and select this repository's root folder (the folder containing `manifest.json`). No build step is needed.
4. Open the extension popup, choose **Edit Profile**, enter your details, and click **Save Profile**. The extension's options page opens the same editor in a larger tab.
5. Open a job application on Greenhouse, Lever, or Workday, then click **Fill Current Application**. Review every answer before you submit the form yourself.

You can import a JSON profile from **JobPrefill** or a prior OpenApply export with **Import Profile JSON**. Import shows the converted values for review; click **Save Profile** to store them. The provided JobPrefill résumé data and voluntary disclosures are intentionally excluded. The profile editor stores job and school histories as JSON arrays; skills use one line per skill. The **Languages** section accepts one language per line, with optional proficiency after `|` (for example, `English | Fluent`). **Export Profile JSON** downloads the current editor values, which may contain private information, so keep that file somewhere safe.

## Supported ATS

| Platform | Current support |
| --- | --- |
| Greenhouse | Standard text, email, phone, textarea, native selects, yes/no radio groups, and matched checkboxes. |
| Lever | Same standard controls; full name is assembled from first and last name. |
| Workday | Standard controls and custom comboboxes with one identifiable listbox and an exact matching visible option. More complex components are skipped. |

The extension scans visible controls and scores label, ARIA label, name, ID, placeholder, and nearby label text against profile field aliases. A low or ambiguous match is reported as unknown. It does not replace a nonempty answer. For native controls it uses the browser's value or checked setter and dispatches `input` and `change` events. Exact options are required for selects and radios.

Clearly labeled plural language fields receive the saved language list. A singular language or proficiency field is filled only when the profile contains exactly one language; repeated language rows remain for manual review.

## Privacy and permissions

There is no backend, analytics, telemetry, network request, remote code, or automatic submission. Profile values are stored only in `chrome.storage.local`. The extension does not bundle or commit your profile. Importing a JobPrefill export discards embedded résumé data; the extension does not upload files.

The manifest asks for only:

- `storage` to save the profile locally;
- `activeTab` to access the tab after you open the popup and click fill;
- `scripting` to inject local autofill code into that tab.

There are no persistent host permissions or background service worker. Browser protected pages and some embedded cross-origin application frames cannot be filled with this permission model. The extension source runs in Chrome's isolated world.

## Architecture

- `src/profile/`: schema normalization, JobPrefill conversion, local storage.
- `src/content/`: visible field scan, weighted matching, safe control filling, orchestration.
- `src/adapters/`: platform detection and platform-specific behavior.
- `src/utils/`: text, DOM, and event helpers.
- `src/popup/`: profile editor, import/export, fill action, and summary.
- `tests/`: Node unit tests and representative HTML fixtures.

To add an ATS, extend `OpenApplyBaseAdapter`, implement `matches(url, document)`, override `scanFields()` or `fillField()` only where necessary, add the script to `scriptFiles` in `src/popup/popup.js`, and include it in `detect()` in `src/content/index.js`. Add a fixture and focused tests for new matching behavior.

## Test

Run `npm test` (Node 18 or newer). No install step or third-party package is required.

For a manual smoke test, use a fresh browser profile or test extension install:

1. Import a sample profile or enter non-sensitive test values.
2. Open a Greenhouse application. Verify first name, last name, email, phone, LinkedIn, and a clearly labeled languages field are filled. Verify an open-ended question remains unknown and the application is not submitted.
3. Repeat on Lever. Verify full name, email, phone, and portfolio. Check a yes/no radio group only when its wording matches the profile.
4. Repeat on Workday. Verify standard text fields. Check that a custom dropdown fills only with an exact visible option and unsupported widgets appear in the summary.
5. Set an existing answer before filling; verify it remains unchanged. Export, clear, and re-import the profile to verify local persistence and conversion.

`tests/fixtures/` contains mock form markup to guide manual checks. It is not an automated browser suite. Live ATS pages can change, so the next validation step is testing on current application pages in Chrome and Edge.

## Limitations and roadmap

- Workday support is partial. Repeating sections, search dropdowns with remote results, date widgets, and file attachments need separate adapters.
- The first education and experience entries are used for explicitly matched school, degree, current company, and title fields. The extension does not create additional history rows.
- Free-form questions, demographic disclosures, and consent controls are left to the applicant.
- The current summary is a short popup report. A future version could offer a review panel with every field and its match score.
- Cross-origin iframes and unusual embedded forms may need optional site permissions in a future release.

## Screenshots

Popup: _placeholder for a screenshot of the profile editor and fill summary._

## Contributing

Open an issue with the ATS URL pattern, the field label and control type, and a **redacted** HTML snippet. Do not include your personal profile or application answers. Keep new aliases narrow, add tests, and prefer skipping uncertain fields. Run `npm test` before sending a pull request.

Licensed under MIT; see [LICENSE](LICENSE).
