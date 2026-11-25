# Contact workspace verification

**Branch:** feat/contact-workspace-redesign  
**Scope:** frontend only; no database migration or API contract changes.  
**Status:** implementation committed for local review; full browser/build validation pending.

## Local commands (PowerShell)

Run from the existing fork clone. Make sure the worktree is clean first.

```powershell
git status --short
git fetch origin feat/contact-workspace-redesign
git switch --track origin/feat/contact-workspace-redesign
cd frontend
npm ci
npm run test:contact-workspace
npm run build
npm run lint
npm run dev
```

If the branch already exists locally, replace the switch line with:

```powershell
git switch feat/contact-workspace-redesign
git pull --ff-only origin feat/contact-workspace-redesign
```

Confirm origin points to ThunderKhan/crm-vsph (git remote -v). If it does not, fetch from the fork explicitly. Preserve existing frontend/.env and backend/.env; VITE_API_URL must point to a working API. See [RUN.md](../RUN.md) for local startup. Avoid destructive database setup commands on any shared database. Start the existing backend in a separate terminal if testing against a local API.

## Manual browser checks (use a disposable/test contact)

| Area | Check |
| --- | --- |
| Routing | Open from contact list and global search; reload URL; change contact ID; return to list; check list refresh after edit/delete. |
| Layout | 1440x900, 1280x720, 768x1024, 390x844 and 320px width; all controls and fields reachable; no nested primary panel scroll or horizontal overflow. |
| Identity | Name, record ID, actual status, owner; missing mobile/account and long values render clearly. |
| Properties | Expand/collapse every group, inspect all original fields, use email/phone/account/profile links and copy actions; invalid profile links are not executable. |
| Composer | Open via header and quick actions; switch call/task/email modes and collapse/reopen; drafts persist within the same contact; navigate to another contact and verify no draft leakage. |
| Calls/tasks | Submit valid and invalid values; network failure retains form; rapid clicks do not duplicate; real confirmed record appears in history; task date is local-time correct. |
| Email | Inspect external mail client recipient/subject/body; no claim of delivery or email activity event. Missing email cannot submit. |
| Timeline | All activity default; calls/tasks filter independently; confirm notes, real timestamps, priority, status and due dates; verify pagination and retry on failure. |
| Edit/campaign/delete | Existing contact edit persists; campaign options load with permission; select a disposable record's campaign and verify assignment; delete confirmation, cancel and failure paths. Never delete real data during tests. |
| Permissions | Admin and limited employee: actions hidden or unavailable as appropriate; backend still enforces existing rules. |
| Accessibility | Tab/Shift+Tab, Escape, ArrowUp/Down on menu, focus restoration, native dialog focus containment, 44px targets and visible focus, screen reader labels and status messages. |
| Motion | Inspect press/release, menu anchoring, composer/accordion expansion and dialog entry; rapid interruptions do not trap focus; emulate reduced-motion and touch; no animation on tab navigation. |
| Branding | Actual existing VSPH navigation artwork, no stretched logo; 64px symbol favicon; verify browser tab and navigation at desktop/mobile. |
| Regression | Other pages, global search, navigation, login, contact list, contact creation and normal modal behavior unaffected. |

## Evidence and limitations

- Reviewed source of contact, call and task API controllers and relevant frontend permissions, routes, existing modal and CSS.
- Ran seven Node.js 22 utility tests in an isolated local harness (Asia/Kolkata timezone); all seven passed. The tested utility module's Git blob SHA matches the feature-branch source (5e9be7cae13d9cbc3e40383d50a567ccfab6dbcd). The tested file is added at frontend/tests/contact-workspace.test.mjs.
- Verified the original VSPH PNG's format and decompressed checksum before generating a cropped 64x64 PNG from existing artwork; visually inspected the cropped symbol.
- This environment cannot fetch the entire repository using local Git or install dependencies from the network. Full Vite build, ESLint, browser, authenticated API and accessibility/performance testing have not been run here. Do not treat the implementation as production-ready until these checks are completed.
- The organization repository was not modified. A single upstream PR is planned only after local acceptance.

## Offline visual review

When backend credentials are unavailable, follow [contact-preview.md](contact-preview.md). The preview exercises the real components against isolated fixture data; it does not replace the live API test matrix above.

### Composer refinement checks

- [ ] Call subject/outcome, call notes and task subject show their required asterisks inline with label text; native required validation still works.
- [ ] No top-right composer collapse toggle and no Reset button; Cancel closes each composer without an API mutation, restores quick-action focus and preserves draft when reopened.
- [ ] Cancel disabled during save; after a failed save, Cancel remains available. The same behavior appears in the seeded preview and the real workspace.

### Contact summary alignment checks

- [ ] Full, reference and long-content fixtures show the same label and value start positions across all six summary rows; no right-aligned ragged text.
- [ ] Email and phone remain on a single line, showing an ellipsis only if necessary. Hover displays the complete value, copy returns the complete value, and expanded details expose readable professional email and mobile values. The underlying mailto/tel destinations are unchanged.
- [ ] Long account/designation/campaign text wraps naturally without horizontal overflow. Verify at desktop, laptop and narrow mobile widths, including copy focus and failed clipboard feedback.

### Identity simplification checks

- [ ] Identity header contains avatar, contact name, record code and permitted actions only; no call-status indicator or duplicated owner. Owner remains in Contact details and call status in expanded Additional information.
- [ ] Header has no leftover blank status/owner row; content is vertically centered on desktop and wraps at narrow widths.

### Expanded property formatting checks

- [ ] Open every property group; label and value tracks align with the summary at desktop and mobile widths, with identical typography and row spacing.
- [ ] External profile/navigator URL labels truncate gracefully; icons remain beside the text and links open the complete destination. Expanded email and phone values remain readable/copyable; long descriptive values wrap without horizontal overflow.

## Motion refinement acceptance (M1–M4)

Run `npm run test:contact-motion` alongside existing preview/workspace tests. For optional browser automation, in frontend run `npm install --no-save --package-lock=false @playwright/test`, `npx playwright install chromium`, then `npm run test:contact-browser` (Playwright owns a dedicated Vite process on port 4174). The optional test tool is not a committed production dependency. Test normal and reduced motion, keyboard, clipboard, failure/retry, mode changes, no replay on filter, modal exit/focus, delayed loading and long mobile content. Inspect at desktop/tablet/mobile and record DevTools performance with CPU throttling; no continuous animations except pending spinner/skeleton, no forced animation on page entry, only measured layout changes. Source helper tests executed in available JS runtime; full browser suite, Vite build and lint not executed in this environment (Git DNS and dependency access unavailable).

### Dialog focus regression — local evidence, 24 November 2026

At commit `8aeface`, local Node tests passed 17/17 and Vite built successfully (505ms; non-blocking bundle-size warning). Browser tests passed 2/3: selection/composer and mobile/reduced motion passed; edit dialog Cancel failed `toBeFocused()` after dismissal. The fix closes native dialogs during layout cleanup and explicitly restores the recorded opener after the modal unmounts. Original regression test retained; two additional cases exercise Escape, close icon, campaign/delete cancellation with normal and reduced motion. Rerun `npx playwright test tests/contact-motion.browser.spec.mjs --workers=1` with Vite running; expected 5 tests. These browser results have not yet been verified after the fix.

### Visual feedback round 1

Local browser results at `f49e2d3`: 5/5 passed (15.5s), including both motion preferences and original focus regression. New changes need local rerun: verify centered idle save label, right-aligned footer, no duplicate header call action, red Pending and green Completed, checked state only on confirmed API success, preserved state on failure, audited completion actor, filter persistence, reopening, permission/transition guards and reduced motion. Added two motion utility cases, one preview fixture case and one browser case; expected totals 20 utility and 6 browser tests. Live API validation remains separate.

### Browser runner isolation — 24 November 2026

Local evidence at `c7c38f7`: 20/20 utility tests and production build passed (536ms). Browser suite passed the first four cases, then the reduced-motion test failed before the contact heading appeared, and the task completion test could not navigate (`ERR_CONNECTION_REFUSED`, port 5173). This confirms server unavailability by the sixth test, but does not establish the cause of the fifth failure or why the server stopped. Introduced a dedicated Playwright-managed Vite process on 127.0.0.1:4174, strict port binding, startup readiness, server logs, and failure traces/screenshots. All six existing scenarios and assertions are retained; no retries or relaxed assertion deadlines. The revised runner and all six scenarios require a local rerun. The earlier 5173 browser commands are superseded by `npm run test:contact-browser`.

### Expandable activity timeline

Baseline `2bad0ab`: user confirmed 6/6 browser scenarios (23.4s); prior build and 20 utility tests passed. New scope adds one utility test and one browser test (21 utility / 7 browser expected). Confirm local day groups, newest-first ordering, unknown dates, compact collapsed nodes, independent disclosures and checkboxes, keyboard operation, semantic status colors, audited completion in expanded details, status failure visibility and narrow viewports. Browser suite uses a fixed Asia/Kolkata timezone for reproducible fixture dates. Run all utility suites, build, and `npm run test:contact-browser`. No live API/browser validation claimed for this revision until rerun.

### Round 2 feedback acceptance

Six approved feedback items implemented: no date divider lines; no progress cursor; morphing checkbox loader; full-width disclosure; functional search, sort and task filters; editable status and task details. Verify checkbox and status selector never toggle expansion, both filters and global alphabetical ordering compose, Escape and focus work, edits persist and invalid changes do not overwrite data, permissions and failure handling remain intact. Expected 25 utility tests (9 workspace, 9 fixture, 7 motion) and 9 browser cases. Run all utility scripts, `npm run build` and `npm run test:contact-browser`. Full Vite and browser validation not yet performed for this revision.

### Round 3 feedback acceptance

Review thin search focus ring, grouped filter radios/checkmarks/priority chips, keyboard radio selection, active count, reset, popup bounds, and compact toolbar at desktop/mobile. Verify Add activity menu keyboard navigation and permissions, native modal focus and Escape, independent drafts, validation, failure/retry, save lock, saved feedback, focus restoration, unchanged active filters and hidden-record notice, new record highlight after close, email mailto disclaimer, and reduced motion. Existing 9 browser scenarios adapted to modal workflow; 2 additional browser tests (11 total expected). Utility suites unchanged (25 tests). Run all utility scripts, build and `npm run test:contact-browser`; actual Vite and browser execution remains local.

### Skill-led design audit acceptance

Retain all 11 prior browser cases and add one narrow-screen edit/validation regression (12 browser cases expected). Verify 320/375/390/768/1272/1600 CSS px, layout/keyboard and mouse across identity, properties, timeline, status selector, filter menu, activity dialogs, edit contact/campaign dialogs, missing/long/loading/error states and reduced motion. Inspect selected/focus/disabled/loading contrast and popup bounds; compare clean fixture before/after at the same size. Source contrast pairs checked independently; full browser/build and actual Impeccable detector unavailable remotely. See log/contact-workspace-design-audit.md.

### Persistent contact context layout

Expected 25 utility and 13 browser cases. Existing browser assertions updated to the renamed workspace switch, reduced-motion indicator and existing linked opportunity data. New regression checks desktop column geometry and 12px identity/details gap, persistent details disclosure, switching with search/sort/expanded node state, contextual controls, preview URL refresh and mobile order/no horizontal overflow. Test actual production deep links with real auth/backend separately. Run all existing Node suites, build and npm run test:contact-browser. Rendered verification remains pending.

### Post-layout final craft pass

Expected 25 utility and 14 browser cases. Existing regressions retained. New case covers arrow navigation, accessible heading, 1024px filter bounds, existing labelled billing address rows, minimal-contact opportunity deep-link refresh and absence of horizontal overflow. Review both view skeletons and narrow/long content on real browser. All prior test commands remain unchanged. No rendered detector or browser pass claimed remotely.

### Code-quality refactor acceptance

Expected 27 utility tests and 14 browser tests. Previous browser assertions unchanged. New unit coverage checks single-pass selection, stable chronology/alphabetical ties, invalid dates, immutability and menu navigation boundaries. 432 deterministic comparisons against the preceding selection pipeline passed; available JS harness passed 17/18 workspace/motion tests (URL global unavailable for one existing case). Run all utility scripts, build, and npm run test:contact-browser locally. No measured browser speedup or full lint pass claimed.

### BDE milestone 1

Run all existing suites plus deadline/queue regression. Inspect upcoming and past groups, alphabetical global sorting, due filters, missing dates, search descriptions, task completion movement, restricted task visibility and responsive wrapping. Local rendered/build tests pending.

### BDE milestone 2

Apply migration only to disposable database first, generate Prisma, run backend tests; validate atomic linked task write including unauthorized/invalid assignee, cross-tenant contact, rejected request with no partial call, note isolation, manually logged timestamps, all activity filters, draft/error handling, mobile and keyboard. Verify existing calls and task history still work. No production migration performed.

### BDE milestone 3

Apply both additive migrations in disposable database, generate Prisma and run backend tests. Verify permissions and tenant isolation for opportunity create/edit/read and relationship edit, nullable value/currency, valid stage, explicit unset relationship, mobile dialog/focus and link. Do not deploy migration to production until review and database validation. Browser and full build pending.

### BDE workflow final verification

New browser regressions cover call + follow-up, notes and email, relationship, opportunity creation/edit, due filters and current-list navigation. Prior tests updated for intentional behavior changes, including neutral pending status, open work no longer appearing under historical dates, richer search and explicit admin assignee. Run all Node suites, native Prisma generate/validate, backend tests, disposable MySQL migrations and real browser suite; verify BDE employee role end-to-end and error/race paths. Do not claim production-ready without these gates.

### Final eight-finding hardening

Validate three additive migrations on disposable database; verify field allowlists and tenant-scoped relationships in legacy call/opportunity endpoints, explicit DNC opt-in, correction revision conflicts and audit snapshots, employee self-created open-task due-date only authorization, completion timestamp grouping, full opportunity fields, router blocker and neutral pending dot. Run frontend build/lint, all utility suites, backend tests and Playwright. Router provider now uses a data router for supported useBlocker; verify all CRM routes, browser history and preview navigation. No production migration or rendered checks performed remotely.

### Release validation workflow

CI runs frontend unit suites, production build, lint and Chromium browser tests, plus Prisma validation, all migrations on an isolated MySQL 8 service and backend tests. The contact HTTP regression creates synthetic users/tenants and checks authorization, atomic follow-up rejection, DNC persistence, self-created task rescheduling, revision conflicts, audit history and scoped commercial writes. It refuses any database other than crm_release_test. No production credentials or migrations used. CI execution and actual BDE usability acceptance must be recorded separately.

### First CI run — 45396967984

Frontend npm ci, contact Node suites and production build passed; Prisma validate/generate passed. Full lint reported 115 errors and 14 warnings across the repository. Browser launch blocked by Playwright 1.56.1 unsupported Ubuntu 26.04 default image. Full migration replay blocked at 20261102000000_central_client_onboarding (P3018 / MySQL 1146: tenants table does not exist). Keep that failure visible; do not rewrite historical migrations or mark them applied. Pin Ubuntu 24.04; separately replay the three new contact migrations on a reset, explicitly guarded disposable database built from the pre-change schema and check schema diff. Fix straightforward contact pagination and list lint findings; broader existing lint debt is not waived. No production database touched.

### Browser failure triage — 45397332836

13/19 browser cases passed; six failures involved assignee/stage labels, preview refresh ordering, relative billing locator and activity correction field. Explicit select/textarea accessible names, synchronous preview URL mirroring, URL assertion before reload, correctly relative locator, named correction dialog and uncaught-page-error checks added. Extracted copy feedback hook; preserve tooltip behavior through event handlers; initialize keyed shared forms from record rather than synchronous effects. No design/CSS or backend changes. Full repository lint remains separately visible; rerun CI to confirm scoped fixes and browser outcome. New contact migrations, HTTP and full backend tests already passed against pre-change baseline; legacy migration replay remains a separate gate.

### Third validation run — 45414000705

19/19 Chromium browser scenarios passed (1.3m). Contact unit tests, frontend build, Prisma validation/generate, three new migrations and both backend test steps passed. Full lint: 89 errors and 10 warnings, none reported in the scoped contact/shared files. New strict lint:contact gate and guarded local empty-database baseline bootstrap are added; raw historical migration replay is unsupported and preserved as a documented known gap, not claimed fixed. CI now tests normal migrate deploy from the verified baseline and refusal to bootstrap a nonempty database. Existing deployment schema/ledger reconciliation requires staging evidence and approval. See backend/prisma/baselines/README.md. No production operations.

### Fourth validation run — 45416392720

Frontend build, all contact unit suites, strict scoped lint and 19/19 Chromium cases passed (1.6m). Full lint remains 89 errors / 10 warnings. Prisma validation and generation passed, but the new local bootstrap timed out acquiring its first MySQL connection (45028, no active connections). No baseline DDL or migration writes were reached; HTTP and full backend tests were skipped in that run. The bootstrap adapter now matches the already-tested app TLS settings on its strictly validated loopback target, with explicit connection/acquisition timeouts. Remote and mismatched-target refusal checks are added ahead of CI bootstrap. Existing nonempty refusal and schema/ledger verification remain mandatory. The cause is inferred from configuration differences, not yet proven; fresh CI must confirm it. No production access or migration.

### Fifth validation run — 45421580703

All contact-specific frontend unit tests, strict lint, production build and 19 Chromium browser scenarios passed. Backend job passed in full: Prisma validate/generate, remote/mismatched-target refusal, fresh baseline bootstrap with ordinary migrate deploy, second-bootstrap refusal and schema/ledger verification, contact HTTP regression and full backend suite. Full frontend lint alone remains failing (legacy modules). Validated commit: 00791e331956a17cc4a9fa73157354036168780a.

Project owner deferred BDE acceptance on 2026-11-24. Existing-database staging upgrade validation is a deployment prerequisite, not a prerequisite for opening a PR. Upstream main at f6f88fb58197e9896c9dde910d9bf42dd3b58f36 is 14 commits ahead of the common ancestor, including email sending/templates and owner-scoped list changes. Open a single draft PR for review; integrate upstream changes without removing new email functionality, preserve authorization semantics, reconcile email-template schema/migration, rerun tests on integrated head before marking ready. No production migration or upstream merge performed. CI evidence applies to validated code commit; this follow-up changes documentation only.

### Upstream reconciliation

Merged upstream main f6f88fb58197e9896c9dde910d9bf42dd3b58f36 into the feature branch, preserving new email API/template CRUD, navigation and owner-scoped lists. Contact composer uses CRM sending with template previews and retry handling; synthetic preview never sends real mail. Added additive email-template DDL, module-action checks and browser/HTTP regressions. Full lint is tracked against the pinned upstream baseline with strict scoped lint; no rules disabled. Rerun integrated branch CI before merging; existing database staging verification remains required.
