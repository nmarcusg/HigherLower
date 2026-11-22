# HigherLower Homepage UX Audit — Analysis

**Date:** 2026-10-15  
**Task type:** Homepage UX critique and technical audit; analysis only, followed by a bounded design artifact. No implementation is authorized.  
**Scope:** Homepage composition, setup controls, Go CTA, homepage-owned High Scores entry/dialog dismissal and return, scroll continuity, accessibility, responsive behavior, and homepage motion. High Scores internals are excluded except modal open/close interaction; gameplay is excluded except confirming Go navigation.

## Scope, file boundaries, and authority

**Source inspection allowlist (read-only evidence):** `app/page.tsx`; `components/home/HomeSetup.tsx`; `components/home/DomainSelector.tsx`; `components/home/CategorySelector.tsx`; `components/CategoryCard.tsx`; `components/ModeButton.tsx`; `components/HighScoresModal.tsx` only for trigger/dismissal/focus return; `components/ui/button.tsx`; `app/globals.css`; `package.json`; homepage design-reference manifest, screenshots, notes, and token references; existing audit/design/plan docs. No other app/game/provider internals were audited. The two new artifacts are the only authorized write targets.

**Authority:** Owner request and active governance first; supplied Figma design-reference establishes visual target; existing approved design decisions in prior audit/design docs remain relevant; current implementation and browser render are implementation evidence, not approved design authority. Keep the existing HigherLower identity and do not turn missing reference states into a redesign mandate. Existing audit/analysis/design/plan files were read and must remain unchanged. The earlier plan doc is context only; it was already present before this task and was not created or approved by this task.

## Method and evidence classification

- **[Observed—source]** Current local source, including dirty source treated as pre-existing owner work.
- **[Observed—reference]** Supplied screenshot, token, manifest, or design note.
- **[Observed—rendered]** Runtime browser snapshot, screenshot, or interaction in the available localhost browser.
- **[Inferred]** Bounded interpretation supported by observations, not an approved requirement.
- **Needs Verification [qualifier]** Open issue and its reason.

Impeccable setup: invoked the project launcher `\.agents/skills/impeccable/scripts/impeccable.cmd context --target app/page.tsx`; it completed and reported incumbent visuals but no `PRODUCT.md` or `DESIGN.md`. Read the Impeccable `critique` and web `audit` playbooks. Critique playbook requires two isolated agent assessments; no sub-agent/Task tool is exposed in this session. Therefore independent assessment orchestration was unavailable and no dual-agent critique or formal heuristic score is claimed. The launcher does not implement `critique` or `audit` subcommands (`Unknown command`); its deterministic `detect --json` command was run on the homepage source components and returned `[]`. No critique snapshot was written: the requested deliverable is exactly two `docs/` artifacts, and skill persistence would create an unauthorized third artifact. No `.impeccable/critique/ignore.md` was present.

Runtime inspection was performed against `http://localhost:3000/` using available Chrome DevTools. Captured the rendered desktop hero/full-page view and runtime positions at 1440×900, and homepage/High Scores dialog views at the actual **500×844** viewport. Requests for 390×844 and 375×812 were clamped/reported by the browser at 500px width, so they are not treated as 390px or 375px evidence. No assistive technology, formal accessibility checker, physical-device interaction, contrast measurement, production build, or network-throttled performance run was performed. Browser actions directly observed: High Scores opens as a modal dialog; Escape closes it; focus returned to the opening High Scores button; selecting a valid category and Classic mode enabled Go; activating Go navigated to `/game/classic?category=movie-series-rating`. No provider behavior was audited.

### Inspected sources and reference basis

- Homepage dispatcher: [`app/page.tsx`](../app/page.tsx:1); state/layout/interactions/motion: [`components/home/HomeSetup.tsx`](../components/home/HomeSetup.tsx:1).
- Setup controls: [`components/home/DomainSelector.tsx`](../components/home/DomainSelector.tsx:1), [`components/home/CategorySelector.tsx`](../components/home/CategorySelector.tsx:1), [`components/CategoryCard.tsx`](../components/CategoryCard.tsx:1), [`components/ModeButton.tsx`](../components/ModeButton.tsx:1).
- Homepage-owned dialog invocation and dismissal: [`components/HighScoresModal.tsx`](../components/HighScoresModal.tsx:37); shared shadcn button primitive inspected but not used by these custom homepage actions: [`components/ui/button.tsx`](../components/ui/button.tsx:1).
- Theme, typography, focus/reduced motion and legacy helpers: [`app/globals.css`](../app/globals.css:1). Stack includes Next 16.3.4, React 19.2.8, Tailwind 4, `motion`, and Lucide; no dependency proposal is needed or justified ([`package.json`](../package.json:5)).
- Reference rules and target coverage: [`design-reference/README.md`](../design-reference/README.md:16), [`design-reference/manifest.json`](../design-reference/manifest.json:1), [`design-reference/notes/design-inventory.md`](../design-reference/notes/design-inventory.md:5), [`design-reference/notes/open-questions.md`](../design-reference/notes/open-questions.md:5), [`design-reference/notes/responsiveness.md`](../design-reference/notes/responsiveness.md:1), [`design-reference/notes/source-provenance.md`](../design-reference/notes/source-provenance.md:27), [`design-reference/tokens/typography.md`](../design-reference/tokens/typography.md:3), [`design-reference/tokens/layout.md`](../design-reference/tokens/layout.md:14), and desktop Home target [`design-reference/screens/home/home--desktop--dark--default.png`](../design-reference/screens/home/home--desktop--dark--default.png).
- Prior broader decisions: [`docs/ui-ux-audit-analysis-2026-10-15.md`](ui-ux-audit-analysis-2026-10-15.md:1), [`docs/ui-ux-audit-design-2026-10-15.md`](ui-ux-audit-design-2026-10-15.md:1), and pre-existing [`docs/ui-ux-audit-plan-2026-10-15.md`](ui-ux-audit-plan-2026-10-15.md:1). Those cover gameplay/High Scores internals too; this artifact narrows scope and does not revise them.

## Working tree preservation record

Before inspection/writing, `git status --short --untracked-files=all` showed pre-existing changes to `.gitignore`, `components/CategoryCard.tsx`, and `components/home/HomeSetup.tsx`, plus pre-existing untracked docs and `governance/archive/README.md`. The source diffs include a hover treatment in `CategoryCard` and scroll-linked hero parallax in `HomeSetup`; they are treated as user changes and were not edited. Existing audit Analysis/Design/Plan docs are untracked prior work and were read-only. No existing change was staged, overwritten, reverted, reformatted, or attributed to this task.

## Executive summary

The homepage’s authored visual identity and ordered setup flow are strong, recognizable, and aligned with supplied desktop evidence. The principal UX risk is the exceptionally tall first viewport/large whitespace before the first actionable setup group; this is intentional in current source and the supplied reference is also a long page, so it is a conversion/scroll-continuity concern, not a demonstrated defect or authority to collapse the hero. Setup uses native radios, an explicit disabled PvP option, a disabled-until-ready Go button, and explanatory readiness copy. The active High Scores entry opens a native modal dialog and Escape returns focus to its trigger in the observed run. Main unresolved product decisions remain theme control behavior and exact target treatment for selected/readiness states.

## Findings

### H-01 — Distinctive hero identity is coherent (strength)

- **Severity/impact:** Positive, low risk. Hero wordmark, per-word outline/accent offset, dark grid, Space Mono, supporting copy, and header entry are recognizable and coherent.
- **Evidence:** Reference includes hero and dark Home composition. Render at 1440×900 shows hero centered in the first viewport; at actual 500×844 viewport the title fits on one visual line and supporting copy sits below, with no document-level horizontal overflow. Source uses title `aria-label="Higher or lower?"` and a responsive `clamp()` font size.
- **Root cause:** None; preserve the successful identity.
- **Classification:** Observed reference + rendered + source.

### H-02 — Setup hierarchy and real choice content support scanning (strength with copy/data caveat)

- **Severity/impact:** Positive. Domain, category, mode, readiness, and footer proceed in a predictable sequence. Radios and descriptions expose choices; disabled PvP is marked unavailable. Categories are rendered as a list for the selected domain, and current displayed domain/category counts come from catalog data.
- **Evidence:** Source implements domain → category → mode → Go. Browser accessibility snapshot showed named radio controls and descriptive labels; visible full-page desktop render matches the intended vertical sequence. Current hero supporting copy says `4 domains, 11 categories` as reference target copy, but runtime catalog data may change; count semantics differ if categories are unavailable/non-playable. This audit did not verify all data/count states.
- **Root cause:** N/A for structure. Possible mismatch between “all categories” copy and currently available/playable catalogue is not proven.
- **Classification:** Observed source/reference/runtime. **Needs Verification [inferred-from-codebase]:** whether displayed aggregate count should be dynamic and what counts include.

### H-03 — Long hero-to-first-choice scroll creates a high commitment before setup (priority P2)

- **Severity/impact:** Moderate. At 1440×900, hero section occupies exactly 900 CSS px, and the domain selector begins at document y≈1105 (about 205px after the first viewport ends). A first-time player sees no setup choice without scrolling. At the observed 500×844 run, setup also begins below fold. This can delay discovery of the actual playable task and weaken the hero-to-action continuity, especially on short screens.
- **Evidence:** `HomeSetup` explicitly sets hero to `min-h-dvh`, says setup remains completely below fold, and `--space-section` adds large responsive vertical spacing. Runtime geometry on desktop measured section top positions 0 (hero), 1105 (domain), 1416 (category), 1885 (mode), 2602 document height. At actual 500px runtime viewport, first setup control remained below fold. Desktop Figma describes a long vertical setup and generous gaps; therefore compression itself is not a confirmed target requirement.
- **Root cause:** Intentional full-viewport hero plus large Figma-derived section spacing defers interaction, rather than an accidental overflow/layout bug.
- **Classification:** Observed implementation behavior; user-impact judgment is inference. **Needs Verification [product-decision]:** whether full-viewport hero/first-choice-below-fold is an intentional product priority versus a landing-to-game conversion concern. No severity above P2 is warranted absent abandonment/task data.

### H-04 — Flow completes when prerequisites are satisfied; state semantics still unresolved (strength + product gate)

- **Severity/impact:** Positive for safety/readiness. Go is a native disabled button until a playable category and compatible playable mode are selected; on valid selections it becomes enabled and takes the user to the corresponding mode/category URL. Domain changes clear category; incompatible mode selection is cleared.
- **Evidence:** Source `canPlay`, `selectDomain`, `selectCategory`, `startGame`; direct browser interaction confirmed Go disabled initially, then enabled after valid category + Classic selection, and Go navigation reached the expected game URL. `design-reference/notes/open-questions.md` explicitly says selected-mode appearance and Go enabled/disabled behavior were not established.
- **Root cause:** Implementation makes concrete readiness choices where the reference intentionally leaves them unspecified.
- **Classification:** Runtime observed behavior; intended rule remains unresolved. **Needs Verification [product-decision]:** confirm selection/readiness rule and whether current visual/copy is target behavior.

### H-05 — Home theme-control reference/implementation mismatch is not actionable without owner decision (P2, blocked)

- **Severity/impact:** Potential discoverability/expectation mismatch: canonical Home reference and target inventory visibly include a sun theme-control icon; current rendered Home has no theme control, only High Scores. However the reference notes explicitly state toggle interaction, persistence, system behavior, and complete light-mode coverage are not established. The supplied reference is visual evidence for an icon, not authority to invent a working theme system.
- **Evidence:** Home design screenshot and `design-inventory.md` include theme-control icon; `source-map.md` maps icon asset; `HomeSetup.tsx` header only renders High Scores; `app/globals.css` declares `color-scheme: dark` and one dark palette. `open-questions.md` lists theme gaps.
- **Root cause:** The visible target icon lacks approved behavioral/product specification and implementation does not render it.
- **Classification:** Reference/source comparison; no assertion that omission is a defect. **Needs Verification [product-decision]:** whether the icon is intended to ship, what it toggles, persistence/system semantics, and light-mode scope.

### H-06 — Modal entry/dismissal and focus return worked in observed desktop-browser flow (strength; bounded)

- **Severity/impact:** Positive for user control. High Scores opens in a native `<dialog>`; close button is named; Escape routes through `onCancel`; observed close returned focus to the opener. Modal opens over, rather than replacing, homepage state.
- **Evidence:** Source opens dialog with `showModal()`, focuses close button, intercepts cancel and delegates to `onClose`. Runtime accessibility snapshot showed modal dialog, close control initially focused, and Escape dismissed it; subsequent snapshot showed the homepage High Scores trigger focused. This evaluates only entry/dismissal, not modal contents/confirmation internals.
- **Root cause:** N/A; preserve. Browser/native dialog observations do not establish every browser/AT lifecycle behavior.
- **Classification:** Source + rendered interaction. **Needs Verification [capability-unavailable]:** cross-browser/screen-reader return-focus behavior was not evaluated.

### H-07 — Selected-mode visual target and theme state absent; avoid treating current styling as reference-approved (P2, product-dependent)

- **Severity/impact:** Selection is technically exposed by native radio checked state and visible checked indicator; exact mode selected treatment is absent from reference. Current button-like mode options are text descriptions and radio indicators, but the target screenshot’s mode options differ structurally and includes Co-op while runtime renders unavailable PvP. It is incorrect to infer mode style solely from current output.
- **Evidence:** Current source, reference inventory, and open questions. Runtime initial snapshot confirms domain pre-selected but category and mode initially unselected; Go is disabled and helper copy explains prerequisites. No mode-selection interaction was completed in runtime beyond the Go-flow test selecting Classic.
- **Root cause:** Target mode selected state and readiness interaction are undocumented.
- **Classification:** Observed source/reference gap. **Needs Verification [product-decision]** as in H-04/H-05.

### H-08 — Hero wordmark reading, screen-reader name, and landmark hierarchy are not fully assessed (P2/P3, needs focused verification)

- **Severity/impact:** Screen-reader snapshot announces “Higher or lower?” correctly by explicit `aria-label`, despite split spans/`wbr`. Visible screenshot shows expected phrase. The domain selector has a fieldset/legend plus nested radiogroup label; no runtime failure was evidenced. Heading outline uses hero h1 followed by selector headings. No demonstrated defect.
- **Evidence:** Runtime a11y tree reports `heading "Higher or lower?"`; source names title. Domain/category/mode controls appear in a visible accessible tree. Impeccable detector returned no findings for supplied homepage JSX/TSX files, which is a static scan, not an accessibility conformance test.
- **Root cause:** N/A pending user testing.
- **Classification:** Observed source + rendered snapshot. **Needs Verification [capability-unavailable]:** NVDA/VoiceOver/keyboard-only complete flow and formal semantic review not performed.

### H-09 — Responsive home viewport evidence is mixed by the browser harness; no horizontal document overflow observed at recorded viewport (P2, bounded)

- **Severity/impact:** Responsive layout is implementation-defined, not a supplied target. Desktop and actual 500px browser render were visually checked; browser metrics report no document horizontal overflow and hero/controls remain in document. Repeated resize requests to 390px and 375px did not actually produce those widths; actual reported viewport remained 500px, thus no narrowest-mobile conclusion is supported. Modals/sections may still need narrow-screen-specific validation.
- **Evidence:** `design-reference/notes/responsiveness.md` confirms no responsive target. Runtime screenshots at 1440×900 and actual 500×844; browser tool reported 500px viewport when 390px/375px was requested. No responsive emulation on an independently controlled browser occurred.
- **Root cause:** Responsive implementation exists, but evidence coverage is constrained by resize capability.
- **Classification:** Observed bounded render. **Needs Verification [environment-specific]:** true 375/390px rendering, zoom/text scaling, small-height phone layout, touch target behavior on device.

### H-10 — Scroll-linked hero parallax and global reduced-motion handling need runtime preference verification (P2, source-backed concern)

- **Severity/impact:** Home adds Motion `useScroll` + `useTransform` moving hero downward up to 56px with scroll. Source explicitly gates it with `useReducedMotion()` and includes a hydration-safe wrapper. Global CSS also disables smooth scrolling and makes CSS animations/transitions near-instant under reduced motion. If active, this is decoration rather than task feedback and its value is not established; it could distract while scrolling into setup. No jitter/performance defect has been proven.
- **Evidence:** Pre-existing diff in `HomeSetup.tsx` adds `motion/react`, parallax hook and reduced-motion gate; global CSS and `package.json` motion dependency; project reduced-motion convention. No prefers-reduced-motion emulation or scroll animation frame/performance observation in this audit.
- **Root cause:** Existing local user change adds scroll-linked movement; source-level reduced-motion guard exists but behavior has not been runtime checked. Do not attribute change to this task.
- **Classification:** Source observation + risk inference. **Needs Verification [environment-specific]:** verify scroll-linked transform and reduced-motion preference in runtime; **Needs Verification [product-decision]:** whether this parallax is desired at all.

### H-11 — Section rhythm is intentionally spacious but scroll continuity deserves usability validation (P2)

- **Severity/impact:** Domain/category and mode sections have sizeable responsive spacing; Home is ~2600px document height at 1440×900. Long page is consistent with the reference (Home dark content height 2638 in notes) and not inherently a defect. At desktop, blank interval after hero before domain is visually large. It may signal a deliberate premium/editorial pause or create scroll friction.
- **Evidence:** Runtime document height and section positions; source `--space-section: clamp(4rem, 17.5vw, 15.75rem)` and target layout notes describe large repeated gaps and long vertical experience.
- **Root cause:** Spacious reference-derived rhythm, with responsive section spacing reusing large viewport factor.
- **Classification:** Observed geometry; interpretation open. **Needs Verification [product-decision]:** whether scroll depth is intentionally part of the experience; user task completion/scroll analytics unavailable.

### H-12 — Performance/theme primitives are not implicated by current homepage source review (bounded positive)

- **Severity/impact:** No blocking performance defect was identified in the bounded source/runtime pass. Home uses CSS grid background and local SVG/icon-like Lucide control; no large hero image or new dependency is introduced by this audit. There is a scroll-linked motion value and a full-height hero, but no measured performance issue.
- **Evidence:** inspected source, package manifest, runtime screenshots. No performance trace, slow-network test, CPU profiling, or bundle analysis was run.
- **Classification:** Source-level only. **Needs Verification [capability-unavailable]:** quantitative performance/bundle impact not evaluated.

## Homepage inventory and behavior matrix

| Surface/state | Evidence | Analysis |
|---|---|---|
| Initial hero and High Scores affordance | Reference + desktop and 500px render | Distinctive identity; no main task choice above fold by explicit design. |
| Initial domain | Browser snapshot + source | Movies & Series starts selected if catalog includes it; radio and count label announced. |
| Category list | Browser snapshot + source | Selected domain categories listed with radio inputs, descriptions and unavailable disabled semantics. No animation/scroll-to-section behavior is apparent from inspected source. |
| Mode | Browser snapshot + source | Classic/Time Attack options and disabled PvP; mode may be unselected despite default selected domain. Exact selected-state visuals are not target-approved. |
| Go disabled/ready | Browser snapshot + direct interaction | Initially disabled with helper copy; valid category+mode enabled; navigation worked. |
| Theme control | Reference + source/rendered | Reference asset exists, no control visible in current rendered homepage; intended behavior unresolved. |
| High Scores open | Browser interaction | Modal opens, close button focused, native dialog role observed. Internal list/content is out of scope. |
| High Scores Escape/close | Browser interaction | Escape closed and focus returned to opener in this run. Cross-engine and AT not tested. |
| Scroll continuity | Source + measured runtime positions + screenshot | Home intentionally tall; setup controls not in initial viewport at desktop/500 width. No scroll-to-control transition observed/tested. |
| Reduced motion | Source only | Explicit preference gate for parallax and CSS reduction; preference runtime not tested. |
| Error/loading/empty catalogue | Source branches | Empty catalogue copy branches exist. No controlled runtime state was induced; text/availability correctness not validated. |

## Severity and impact ranking

Severity describes user risk, not confirmed defect:

1. **P2 — H-03/H-11:** Delayed setup choices and tall page may create scroll friction; currently intentional and partly supported by reference. Product intent/value requires owner/user evidence.
2. **P2 — H-04/H-05/H-07:** Theme and readiness/selected-state semantics are unresolved design/product decisions, not bugs to patch unilaterally.
3. **P2 — H-09/H-10:** true narrow-screen/responsive and reduced-motion runtime coverage unavailable; evaluate before claiming readiness.
4. **P2/P3 — H-08:** accessibility behavior needs keyboard/AT verification; no accessibility failure established.
5. **Positive — H-01/H-02/H-06:** preserve visual identity, clear setup sequence, and observed modal exit behavior.

No P0/P1 homepage issue is supported by evidence. Do not claim a WCAG score or design heuristic score based on incomplete methods.

## Root-cause synthesis

- The main scroll distance is not an accidental defect: the hero’s full-viewport minimum and large section spacing are explicit choices, and target notes describe a long form. The unresolved question is whether the resulting delay to first choice matches the product’s desired entry experience.
- State-design ambiguities arise from gaps in the reference (theme behavior and selected/readiness states), not from an implementation rule that can safely be inferred. Source must not be promoted to approved visual authority.
- Responsive and accessibility concerns are coverage gaps, not confirmed failures. Browser resizing could not reach requested 375/390px widths; AT tooling was unavailable.
- The scroll parallax is present in pre-existing dirty source and guarded by reduced motion in code, but not verified under preference emulation; no causal performance issue is established.

## Owner decisions and open Needs Verification

- **Needs Verification [product-decision]:** Is the full viewport hero and setup-below-fold transition intentional? Is an alternative scroll cue/earlier setup entry desired, or is the deliberate spacious hero the target?
- **Needs Verification [product-decision]:** Is a theme toggle required? If yes, define interaction, persistence/system-theme behavior, and light mode scope before adding UI.
- **Needs Verification [product-decision]:** Confirm current domain default, category/mode prerequisite rules, mode selected style, Go disabled/readiness treatment, and whether counts refer to all or currently playable categories.
- **Needs Verification [product-decision]:** Is hero scroll parallax intentional? Source has the effect, but the user-facing purpose is not confirmed.
- **Needs Verification [environment-specific]:** Re-render true 375px and 390px viewports; test zoom/text enlargement and small-height devices. Resize requests were clamped/returned at 500px.
- **Needs Verification [environment-specific]:** Emulate reduced motion and observe actual parallax/scroll behavior; no preference runtime check was run.
- **Needs Verification [capability-unavailable]:** Full keyboard-only flow and assistive-technology evaluation; no formal WCAG audit/conformance conclusion.
- **Needs Verification [inferred-from-codebase]:** whether aggregate counts/helper messages accurately communicate playable versus unavailable categories across changing catalogue states.
- **Needs Verification [capability-unavailable]:** no performance trace, slow-network/CPU profiling, or production build was run.

## Analysis exit gate

**Design step applies:** yes, because the request asks for design recommendations, but it remains source/reference-led and bounded. The target dark desktop composition, Space Mono, visual identity, and setup order are confirmed; responsive and unsupplied interaction behavior are not design authority. Design may recommend preservation and verification but must not resolve owner decisions.

**Proposed modification allowlist:** exactly `docs/homepage-ux-audit-analysis-2026-10-15.md` and `docs/homepage-ux-audit-design-2026-10-15.md`. No application, CSS, package, config, existing reference, existing doc, or product behavior changes. Do not create Plan, QA, Postfix, or reconciliation artifacts. No permanent Impeccable critique output because that would exceed exactly two new Markdown artifacts.

**Runtime verification status:** [Partial] Browser-rendered desktop and 500px evidence and limited homepage interactions were observed. TODO: verify true 375/390px, AT/keyboard flow and reduced-motion emulation if a suitable environment is provided. Static detector completed with zero findings but is not a substitute for those checks.
