# Contact workspace: design-quality audit and remediation

Date: 24 November 2026. Baseline: `4c8c9e538a63fc99e9b523fcbb1c58807120f5e8`. Scope: contact detail workspace, its existing dialogs, activity controls and loading/empty/error states. No new product capabilities, no section reorder, no new dependencies or modifications to DESIGN.md.

## Sources reviewed

| Skill | Source | Relevant coverage |
|---|---|---|
| Impeccable 4.10.0 | https://github.com/pbakaus/impeccable/blob/main/plugin/skills/impeccable/SKILL.md (537d81c) | Operate mode; audit accessibility, performance, theming, responsiveness, implementation integrity; polish and craft floor; preserve incumbent system |
| Impeccable references | https://github.com/pbakaus/impeccable/tree/main/plugin/skills/impeccable/reference | audit.md, polish.md, operate.md, craft-floor.md |
| Unslop, Damir Sokolovsky (CC BY 4.0) | https://github.com/heydamir/unslop/blob/main/skills/unslop/SKILL.md (93eed69) | Light-polish mode: spacing, palette, icons, copy, type, layout, details, visuals and motion; signs.md and visuals.md |
| Unslop UI | https://github.com/andrasp/unslop-ui/tree/main/skills/unslop-ui (716bf5f) | Semantic HTML, keyboard/touch, restraint, no decorative motion, contrast, catalog of visual, structural, copy and code patterns |
| UI Unslop | https://github.com/Microck/ui-unslop/blob/main/SKILL.md (f45a9d1) | Whole-surface structure/system/instance audit; justify each treatment; verify against real viewport and states; pattern catalog |
| No AI Slop | https://github.com/claudiusararu/unslop-ui-skill (fd9f56f) | Type, color, layout, cards, iconography, copy, motion, consistency, mobile; TELLS.md |
| Anthropic Frontend Design | https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md (a533345) | Intentional typography, semantic structure, restrained feedback and concrete language |
| UI/UX Pro Max | https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md (e6cfdd5) | Accessibility, touch, performance, palette, reflow, semantic tokens, motion, forms, navigation; quick-reference and pro-rules reviewed |

These are external recommendations, not an authorization to replace the VSPH brand. Existing DESIGN.md and explicit decisions win. We read the source playbooks and apply relevant rules manually. The standalone scripts/search database/detector were not run: the repository and skill files are accessible through the GitHub connector but GitHub DNS/package access in the execution container is unavailable. No score or rendered screenshot is fabricated.

## Direction and scope

Product: CRM record workspace for staff reviewing a contact and recording work.
Character: precise, calm, trustworthy.
World: enterprise records and working history; quiet neutral surfaces and structured text.
Focal point: contact identity and actual activity, with a single primary creation action.
Signature: date-grouped activity connectors and clear VSPH navy/blue hierarchy; real status text and audit attribution.

Keep Inter, brand blue/navy, neutral surfaces, approved task status colors, asymmetric grid, existing order/fields, date headings without horizontal rules, independent task controls, disclosures, search/filter and creation modals. No imported display fonts, new accent palette, illustrations, hero, gradients, glass, glows, extra cards, metrics, badges or animation dependencies. The approved native modals protect multi-field task workflows; measured disclosure height and tab-indicator movement remain purposeful exceptions to transform-only advice. Existing shared dashboard navigation was inspected; global navigation behavior and unrelated pages are outside the requested page-local polish.

## Findings and fixes

| Priority | Area | Source evidence / change |
|---|---|---|
| P1 | Search/filter/menus | Hidden native radios inherited global min-height/padding. Reset their box; keep labelled visible rows and keyboard focus. Measure filter popup from actual toolbar bounds; batch scroll/resize work. Anchor Add activity within toolbar and flip above when needed. |
| P1 | Contact edit | Native inputs had unassociated labels; three validated fields used toast-only errors. Bind labels to IDs, provide field errors and focus the first invalid field. Preserve original submission and required fields. |
| P1 | Contact edit relationship selectors | Legacy div-click dropdowns lacked keyboard semantics. Use workspace-only button/search/option controls, Escape and focus restoration; existing account/industry/project mapping unchanged. |
| P1 | Contrast and focus | Light placeholders and control outlines were weak; centralize scoped semantic colors, strengthen field/checkbox borders, and use a single inset focus treatment for forms. Keep status words alongside color. |
| P2 | Loading | Skeleton still represented removed Quick actions card. Match current identity, properties, tabs and single activity toolbar; reduce event placeholders to two lines. No fake secondary card. |
| P2 | Timeline hierarchy | Global h3 selector overrode date heading sizing. Explicit scoped date style; tabular dates/times, calmer metadata, consistent note measure, remove duplicate hover fill. Retain vertical chronology and disclosed details. |
| P2 | Property hierarchy | Missing fields appeared as primary-weight navy. Make them muted regular; keep full values and copy/link behavior. Remove artificial minimum height in properties panel. |
| P2 | Responsive | Header wrapping and fixed popup widths risk overflow; constrain width, preserve mobile grid, narrow-screen spacing, reflow edit form columns at existing responsive breakpoints. |
| P2 | Task status | Expose menuitemradio semantics, checked state, keyboard arrows/Escape, and library checkmark rather than Unicode; maintain independent completion/status APIs and roles. |
| P2 | Modal presentation | Existing edit form used nested tinted cards, ornamental heading stripes, uppercase labels, an owner badge/shadow. In workspace variant, use existing section order with flat surfaces, spacing and subtle rules, sentence case labels and quiet owner metadata. No form field removed. |
| P2 | Motion | Stable dialog close callback avoids restarting confirmation timer on incidental renders. Keep meaningful pending/saved/failed, expand/collapse, new-item highlight and reduced motion. No new ambient motion. |
| P3 | Consistency | Reuse named scoped brand/semantic tokens; normalize avatar, spacing, placeholder, selection, icon and focus details. Remove obsolete skeleton/composer styling and redundant filter footer copy. |

## Checklist by category

- Structure: approved page arrangement, no landing-page pattern, no fake stats, no added cards, actual record data. Section boundaries only for ownership and interaction.
- Typography: chosen Inter retained, hierarchy by role, sentence case for edit fields, tabular dates, readable metadata and note measure.
- Color: brand tokens and approved semantic red/amber/green, neutral surfaces; no arbitrary accent or shadow/glow. Actual light-mode text/control color pairs are measured in the source check; no claim of dark mode support.
- Spacing: 4/8px rhythm, consistent margins, mobile fallbacks, 44px controls. Long or absent values preserved.
- Icons: Lucide outline family, semantic activity icons, checkmark and disclosure; no decorative illustration.
- Copy: actual subjects and names, no unsupported claims; missing/empty/error labels retained; remove redundant applied-instantly footer.
- Interaction: native buttons and dialog semantics, independent task controls, focus, keyboard, draft/API failure handling and state confirmation. Preserve explicit approved motion, no new scroll choreography.
- Performance: no new dependencies; remove obsolete skeleton layout; animation-frame throttle popup measurements; no route-wide bundle refactor in this page-only pass.
- Responsive: 320px source guards, existing 900/480px reflow; real rendered 320/375/390/768/1272/1600 and zoom checks still required.
- Shared navbar: inspected existing search/nav/profile behavior; no redesign or new global navigation controls. Native app/platform rules, dark theme, charts, marketing visuals and RTL are not relevant to this English light CRM surface.

## Verification and limitations

Manual source audit and narrow source assertions are not a substitute for a rendered audit. The user has not run the previous round's tests yet. Do not claim WCAG compliance, successful Vite build, detector pass, or a fresh visual score. Browser regression added for 320px, popup bounds, edit labels and validation. Run existing Node suites (25 cases), build and Playwright (12 cases), then compare actual desktop/mobile screenshots and interaction states. Live API remains separately unverified.

Follow-up gates: inspect visual hierarchy and alignment; check viewport/zoom/keyboard/touch, focus not obscured, overlay stacking and actual text/control contrast; check permission/read-only, long/minimal/reference fixtures, all dialog states and reduced motion. Fix confirmed visual regressions before opening the upstream PR.

### Calculated light-mode pairs

| Role | Ratio | Minimum |
|---|---:|---:|
| navy | 14.87:1 | 4.5:1 |
| secondary | 6.06:1 | 4.5:1 |
| secondary on subtle | 5.71:1 | 4.5:1 |
| accent | 5.45:1 | 4.5:1 |
| pending | 5.24:1 | 4.5:1 |
| completed | 5.08:1 | 4.5:1 |
| blocked | 4.87:1 | 4.5:1 |
| control border | 3.07:1 | 3:1 |

## Follow-up craft audit after persistent workspace redesign

Baseline: `9596e21ca84c52e87a5a5d083a5d8a166f16f591`. Reopened the same seven skill entry points and Impeccable Operate/polish/audit/craft-floor and Unslop signs references. Apply a light-polish pass, not a replacement. Preserve the approved 32/68 split, 12px card gap, status colors, typography, native dialogs, existing features and mobile order. The launcher/rendered detector could not run: the container's GitHub DNS lookup failed on git ls-remote, and the skill launcher and installed project are not present. Manual source inspection and targeted regression additions only; no numerical design score claimed.

| Severity | Finding | Fix |
|---|---|---|
| P2 | Activity header lost its semantic h2 when the workspace switch replaced the old heading. | Restore a visually hidden h2; preserve visible switch and add arrow/Home/End keyboard selection. |
| P2 | Mid-width toolbar can wrap unpredictably, and opportunity names and contact IDs need explicit wrapping. | Deterministic toolbar second row at constrained desktop widths, narrow-screen control alignment, and long-value safeguards. |
| P2 | Loading skeleton always shows activity actions and timeline, even when opening an opportunity deep link. | Match the current view and actual switch/action proportions. |
| P2 | Preview refresh may restore a different contact while retaining opportunity selection. | Mirror selected fixture ID in the preview URL without changing production routing. |
| P3 | Excess vertical whitespace in status rows and detail footer, inconsistent active/inactive switch feedback. | Tighten internal spacing, align status text to subject, retain 44px interaction targets, add restrained inactive hover feedback and rem heading sizes. |

The billing/shipping address field tuples were checked and are already correct; no source changes needed. Reviewed color, hierarchy, iconography, copy, motion, forms, loading/empty/error states, keyboard and touch, responsiveness and implementation integrity. No new decorative treatments, unnecessary cards, animations or dependencies. Existing semantic colors and intentional disclosure/motion behavior remain. Browser geometry and actual contrast across states still require local validation. Credit: Damir Sokolovsky's Unslop (CC BY 4.0), see original source links above.
