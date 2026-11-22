# HigherLower Frontend UI/UX Audit — Plan

**Date:** 2026-10-15  
**Phase:** Plan only. This is an advisory sequence for future owner-approved work; it does not authorize implementation.  
**Evidence:** [`docs/ui-ux-audit-analysis-2026-10-15.md`](ui-ux-audit-analysis-2026-10-15.md:1), [`docs/ui-ux-audit-design-2026-10-15.md`](ui-ux-audit-design-2026-10-15.md:1), active governance in [`.roo/rules/`](../.roo/rules/00-governance.md:1), and the existing broader [`docs/high-low-redesign-plan.md`](high-low-redesign-plan.md:1), consulted to avoid conflicts.  
**Plan artifact scope:** This new document only. The requested path was confirmed absent in the workspace listing and a targeted search before creation. No existing document, source, CSS, component, design reference, dependency, or other file is in the current write scope.

## Executive Verdict

Advance a focused, preservation-led improvement sequence, not a rebrand. HigherLower already has a distinctive visual identity, a coherent Home setup progression, consistent two-card gameplay grammar, text-labeled outcome feedback, and useful native semantics. The highest-value work is to verify and improve constrained gameplay/header and dialog usability, then close verified keyboard/focus and existing-state presentation gaps. Product-dependent visual behavior stays blocked until the owner decides it; a concern is not automatically a defect.

This plan preserves current behavior and the supplied target visual language. It does not authorize changes to gameplay mechanics, route/provider/data behavior, category availability, persistence policy, or design references. The larger [`docs/high-low-redesign-plan.md`](high-low-redesign-plan.md:1) addresses broader architecture/product decisions; this audit plan does not replace or silently revise it. Any apparent conflict between its locked decisions and unresolved audit questions must be surfaced to the owner before implementation rather than resolved by this plan.

### Senior final assessment

The product is strongest where its identity and primary choice are visible. The meaningful risks are evidence gaps around narrow layouts and interaction/state behavior—not a demonstrated failure of the desktop default screens. Work should therefore be ordered from low-assumption verification and preservation, through responsive/focus fixes supported by evidence, to owner-decided visual states. A trustworthy result depends on distinguishing observed behavior from target authority, especially where no mobile or state references exist.

## Strengths to Preserve

- Distinctive dark-grid canvas, Space Mono typography, outlined/offset accents, and recognizable Home hierarchy.
- Progressive domain/category/mode/Go setup with semantic selector controls and clearly unavailable mode treatment.
- Shared Classic/Time Attack two-card comparison grammar, center divider, mode status, and paired Higher/Lower controls.
- Correct/incorrect text labels and Time Attack time-delta feedback; color remains supplemental.
- Native High Scores dialog structure and explicit, cancellable destructive confirmation.
- Mode-specific reveal timing, timer behavior, game rules, reduced-motion support, existing theme, and established ownership boundaries.

## Prioritized Recommendation Matrix

Priority is relative to this audit scope. Severity describes potential user consequence if a concern is confirmed, not a claim that a defect exists. Product-dependent rows are not implementable until the indicated owner decision is recorded.

| Priority | Finding | Classification | Type | Severity | User Impact | Recommended Direction | Effort |
|---|---|---|---|---|---|---|---|
| P0 | G-04, I-02: gameplay header/status compression at observed effective 500×844; broader responsive evidence includes 375×812 but is not a designed target | Observed narrow-render concern; exact visual defect [environment-specific] | Responsive / layout | Moderate | Long labels, back action, score, and timer may compete for limited space | Inspect attributable captures and verify representative narrow cases; if a collision or loss of hierarchy is confirmed, use a bounded reflow that preserves reading order and decision priority. Do not treat either viewport as approved design authority. | Medium |
| P1 | G-03, A-03/A-04: gameplay shortcut focus interactions, High Scores tab keyboard model, and game-over dialog focus lifecycle were not fully verified | Observed source gaps in evidence; failure [inferred-from-codebase] | Accessibility / interaction verification | Moderate | Keyboard users could encounter undiscoverable controls, shortcut conflicts, or unclear focus transitions if issues are confirmed | Verify focus and keyboard paths first; change only demonstrated gaps. Keep focus distinct from selected state and preserve native controls/dialog where adequate. | Medium |
| P1 | G-06, A-04: outcome/game-over/restart and failure states lack complete visual-reference coverage; game-over overlays need focus lifecycle verification | Missing target evidence; source behavior exists | State completeness / accessibility | Moderate | Players may have less clear recovery or interruption handling at end of run or on a confirmed content failure | Inventory current states and render only states that actually exist. Preserve game rules; derive bounded visual treatment from the established system, with focus behavior explicitly checked. | Medium |
| P1 | A-01/A-02: High Scores has solid native dialog and destructive confirmation structure, but narrow behavior and full keyboard/focus model are not established | Strength with unverified behavior | Dialog / responsive / accessibility | Moderate | Dialog navigation or content reachability may be impaired in constrained viewports or keyboard use | Preserve current hierarchy and safety copy; verify tab semantics, scrolling, controls, focus return, and confirmation behavior before making targeted corrections. | Small–Medium |
| P2 | A-05: Time Attack timer/urgent announcement cadence not assessed with assistive technology | Unverified, requiring capability | Accessibility / live feedback | Moderate | Excessive or insufficient urgency announcements could distract or omit meaningful time changes | Validate announcements with available assistive technology; do not alter cadence, urgency, or timer mechanics without evidence and owner approval where policy is product-facing. | Small–Medium |
| P2 | I-04/I-05: source indicates reduced-motion handling, but no runtime preference-emulation pass was performed | Source-observed behavior; runtime [environment-specific] | Motion / verification | Low–Moderate | Motion may remain distracting or state transitions unclear under reduced motion if source behavior is incomplete | Verify existing transitions under reduced motion and retain understandable state changes without changing game timing; no new decorative motion. | Small |
| P2 — blocked on owner decision | H-04/H-02: theme control, selected-mode state, and Go readiness visuals/behavior are unresolved by the supplied reference | Product/design decision required | Home interaction / visual state | Moderate | Users may have ambiguity about selection/readiness or theme behavior, but intended behavior is not established | Obtain owner decisions before planning implementation of these branches. Do not infer an active theme toggle, light theme, changed readiness rule, or new copy. | Medium after decision |
| P2 — blocked on owner decision | I-06/G-06: Time Attack low-time/expiry, bonus/penalty emphasis, and unsupplied interaction-state visuals are undefined | Product/design decision required | Gameplay state / motion | Moderate | Urgency and state feedback could be misleading if invented | Owner defines urgency and expected state meaning first; subsequent design derives restrained treatment while preserving timing/mechanics. | Medium after decision |
| P3 — verify before deciding | H-03: accessible text snapshot concatenates hero phrase; visual or spoken defect is not established | Inference from serialization; not confirmed defect | Content / accessible naming | Low | Potentially unclear phrase reading only if confirmed visually or with assistive technology | Verify rendered spacing and pronunciation/name first. Do not alter the wordmark, visible spacing, or accessible label based on serialization alone. | Small if needed |
| P3 — conditional | G-03: possible shortcut hint/disclosure | Product-dependent and contingent on verification | Discoverability / copy | Low | A hint may help only if supported shortcuts are otherwise undiscoverable | Consider a concise hint only if shortcuts are confirmed intentional and tests show a discoverability need; no tutorial or new help surface. | Small if approved |

## Execution Order and Passes

Passes are grouped around user outcomes, not one task per minor finding. Each pass has a **proposed future implementation allowlist** only. The lists are not current write permission. Before any code work, the owner must approve implementation, confirm decisions, and approve an updated plan/scope. If a required file is outside that pass allowlist, stop and request scope approval.

### Pass 1 — Evidence-led responsive and interaction baseline

- **Objective:** Confirm narrow-layout and keyboard/focus concerns against real behavior before changing UI; establish which follow-up work is justified.
- **Affected screens/components:** Home setup, Classic and Time Attack gameplay header/controls, High Scores dialog, and game-over overlays where renderable.
- **Findings addressed:** G-03, G-04, A-03, A-04, I-02/I-03; secondarily the unverified responsive risk for dialogs.
- **UX outcome:** Identify reproducible collisions, unreachable controls, confusing focus movement, or shortcut conflicts without treating source observations as proven failures.
- **Constraints:** No product mechanics or visual target changes; no claim that mobile references exist. Analysis observed gameplay at effective **500×844**; other CSS responsive checks include **375×812**. These are separate evidence points, not interchangeable universal coverage or design approval. Inspect corresponding gameplay capture at 500×844 before judging the reported header concern. Do not conflate browser/source verification with assistive-technology acceptance.
- **Likely reusable primitives:** Existing shared `GameplayShell`, `DecisionControls`, `HighScoresModal`, and native dialog/control semantics; prefer existing structures and avoid new primitives unless a confirmed need requires owner approval.
- **Accessibility/responsive considerations:** Keyboard-only path through decisions, tabs, back/restart/return, predictable focus and focus restoration; long category labels, timer/status, narrow widths/heights, dialog scrolling, no horizontal overflow for core actions.
- **Verification strategy:** Read current source and existing attributable capture evidence; when implementation is later authorized and a suitable browser exists, reproduce at 500×844 and 375×812 separately plus a representative wider viewport, test keyboard interaction and focus transitions, and use assistive technology for the tab/dialog paths if available. Record unavailable checks rather than claiming pass. No CI or test framework is assumed.
- **Dependencies:** None for evidence review. Any fixes depend on a confirmed finding and a subsequent approved scope.
- **Risks:** Overfitting to a single screenshot/viewport; mistaking text-snapshot serialization for visual truth; changing focus or keyboard behavior without confirming expected semantics.
- **Owner decisions:** None for verification-only. Approval required before any proposed code change.
- **Proposed future implementation allowlist if a finding is confirmed:** `components/game/GameplayShell.tsx`; `components/game/DecisionControls.tsx`; `components/HighScoresModal.tsx`; `components/game/ClassicGame.tsx`; `components/game/TimeAttackGame.tsx`; `app/globals.css` only if a narrowly justified shared responsive/focus style requires it. Remove any unused file before the owner approves implementation scope.

### Pass 2 — Confirmed responsive reflow and focus corrections

- **Objective:** Correct only demonstrated layout or interaction defects from Pass 1 while retaining the current desktop target and product grammar.
- **Affected screens/components:** Gameplay shell/status header, decision controls, and any High Scores/game-over surfaces with verified reachability/focus issues.
- **Findings addressed:** Confirmed subset of G-04, G-03, A-03, A-04, I-02/I-03, and A-01.
- **UX outcome:** Category/mode, back action, score/timer, choices, dialog content, and recovery actions remain legible and operable on constrained screens and by keyboard.
- **Constraints:** Desktop compositions remain the visual anchor; no mobile/tablet mock exists. Structure/breakpoints are implementation-derived. No global redesign, theme changes, or gameplay timing changes.
- **Likely reusable primitives:** Existing `GameplayShell`, `GameplayStatus`, `DecisionControls`, native buttons/radios/dialog; maintain shared presentation where Classic and Time Attack actually share behavior and keep mode-specific state local.
- **Accessibility/responsive considerations:** Preserve logical source/reading order, visible focus distinct from selected state, target usability, escape/focus restoration where appropriate, long labels, short viewport height, touch and keyboard paths.
- **Verification strategy:** If approved, render wide and narrow layouts including 500×844 gameplay and separate 375×812 checks; test keyboard-only navigation, dialog scroll/focus, and no unintended horizontal overflow. Use browser/device emulation only when available. Do not claim WCAG conformance.
- **Dependencies:** Pass 1 must identify a specific reproducible issue; future owner approval and updated allowlist are prerequisites.
- **Risks:** A reflow can compress comparison cards or reorder status/action importance; focus fixes can conflict with native dialog behavior if implemented unnecessarily.
- **Owner decisions:** No new product decisions if fixes are strictly corrective; any behavior choice beyond verified defect correction returns to owner.
- **Proposed future implementation allowlist:** `components/game/GameplayShell.tsx`; `components/game/GameplayStatus.tsx`; `components/game/DecisionControls.tsx`; `components/HighScoresModal.tsx`; `components/game/ClassicGame.tsx` and/or `components/game/TimeAttackGame.tsx` only if a corresponding verified mode-specific lifecycle requires correction; `app/globals.css` only for specifically justified responsive/focus styles.

### Pass 3 — Existing gameplay states and recovery clarity

- **Objective:** Make confirmed existing reveal, end-of-run, restart/return, and loading/image-failure states understandable and recoverable, without creating new mechanics or unsupported states.
- **Affected screens/components:** Classic and Time Attack game surfaces, game cards, and the existing game-over/recovery UI.
- **Findings addressed:** G-02/G-05 preservation constraints; G-06 and A-04 where verification supports a state/focus correction; state completeness table entries for game over, restart, return, and loading/image error only when those states are confirmed to exist.
- **UX outcome:** Players understand the result and can confidently continue, restart, or return; content failure does not erase the card’s meaning or decision context.
- **Constraints:** Preserve all existing rules, score/timer behavior, mode-specific reveal intervals, and callbacks. Missing design-reference states are not proof of a defect or authority to remove functionality. Do not invent retries, provider messages, extra end-of-run data, or mechanics.
- **Likely reusable primitives:** Existing `DerivedGameState`, `GameCard`, `GameplayStatus`, plus mode-owned Classic/Time Attack lifecycle and existing dialog pattern. Shared pieces remain presentational; timing/state ownership remains page/mode-specific.
- **Accessibility/responsive considerations:** Meaningful headings/status announcements, focus placement and restoration, keyboard reachability of recovery actions, non-color-only outcomes, fallback text/imagery semantics, narrow presentation without obscuring actions.
- **Verification strategy:** First source/state inventory and existing rendered evidence. If authorized, exercise each confirmed state using safe controlled inputs or an existing supported renderer; verify both modes independently, focus lifecycle, reduced-motion-compatible transitions, and unchanged timing. Do not assume Storybook or test infrastructure exists; if no safe renderer is available, record limitation and seek separate approval rather than creating fixture routes/config/dependencies.
- **Dependencies:** Pass 1 focus findings; confirmation that a state exists; Pass 2 where a shared layout/focus correction is needed.
- **Risks:** Generic fallback may conceal the meaningful error; shared state presentation can accidentally change mode-specific transitions or timing.
- **Owner decisions:** Additional game-over content or behavior beyond current choices requires owner decision. Loading/image fallback wording is unresolved if it implies provider/retry behavior.
- **Proposed future implementation allowlist:** `components/game/DerivedGameState.tsx`; `components/game/GameCard.tsx`; `components/game/ClassicGame.tsx`; `components/game/TimeAttackGame.tsx`; `components/game/GameplayStatus.tsx` only if shared presentation proves necessary.

### Pass 4 — High Scores and assistive feedback validation

- **Objective:** Verify existing High Scores dialog interaction and Time Attack announcement behavior; make only evidence-backed accessibility corrections.
- **Affected screens/components:** High Scores native dialog and mode tabs/filter/confirmation; Time Attack timer and result feedback; game-over dialogs only if earlier passes identify related gaps.
- **Findings addressed:** A-01 through A-05, with A-06 retained as a no-conformance-claim boundary.
- **UX outcome:** Keyboard and assistive-technology users can identify dialog purpose, navigate its choices, understand meaningful gameplay changes, and avoid noisy timer announcements.
- **Constraints:** Preserve the existing native dialog and destructive action scope/copy. No score storage/key behavior is part of this audit plan. Do not change announcement cadence or urgency on assumption; avoid repeated timer announcements and do not claim WCAG status.
- **Likely reusable primitives:** Existing native `<dialog>`, tab/list semantics, polite status and timer semantics; no new dependency or primitive without evidence and separate owner approval.
- **Accessibility/responsive considerations:** Tab keyboard model and panel association, dialog initial/contained/restored focus, escape behavior where appropriate, polite versus urgent announcement intent, large text/zoom and scroll reachability.
- **Verification strategy:** When the relevant browser and assistive technology are available, test tab keyboard movement, selected state/panel relationship, dialog open/close/focus return, confirmation status, routine timer and urgent announcements. Keep browser semantics checks separate from human perceptual/assistive-technology assessment; unavailable AT is `[Not tested]` or `[Blocked]` as applicable. No CI/test framework is assumed.
- **Dependencies:** Pass 1; a suitable assistive-technology capability for announcement acceptance; owner direction if a proposed change alters product urgency.
- **Risks:** Over-announcement, lost urgency, unnecessary custom tab/dialog behavior, or disturbing native semantics with a custom workaround.
- **Owner decisions:** Time Attack urgency and expiration announcement policy if evidence does not resolve intent; dependency approval if native behavior is demonstrably insufficient.
- **Proposed future implementation allowlist:** `components/HighScoresModal.tsx`; `components/game/TimeAttackGame.tsx`; `components/game/ClassicGame.tsx` only if a verified shared game-over focus issue requires a mode-specific change. Do not include storage modules or score persistence files absent a separate explicit request.

### Pass 5 — Owner-decided Home and Time Attack states; conditional polish

- **Objective:** Only after owner decisions, define and implement the approved Home selection/readiness/theme branch and/or Time Attack urgency treatment; separately close H-03/shortcut discoverability only if verification warrants it.
- **Affected screens/components:** Home setup and mode selector; Time Attack status/feedback; optional shortcut hint or hero accessible-name handling only if evidence establishes need.
- **Findings addressed:** H-02/H-04, I-06, Time Attack portion of G-06/A-05, and conditional H-03/G-03.
- **UX outcome:** Approved selection/readiness and urgency states communicate the owner’s intended product behavior consistently and accessibly; no unrequested onboarding or visual embellishment.
- **Constraints:** Product decisions are hard gates. Do not infer theme activation, persistence, system behavior, light-mode scope, Go prerequisites, shortcut support, urgency thresholds, hero copy, or a new help surface. Preserve existing theme/tokens and gameplay timing unless separately approved.
- **Likely reusable primitives:** Existing `HomeSetup`, `ModeButton`, `CategoryCard`, `GameplayStatus`, existing motion support and CSS reduced-motion handling. Shared/page-specific distinction: reusable semantics and styling may be shared; state ownership remains with Home or the specific gameplay mode.
- **Accessibility/responsive considerations:** Selection distinct from focus, native disabled/selected semantics, concise labels, non-color state cues, reduced-motion support, no time-dependent visual-only signal, narrow layout legibility.
- **Verification strategy:** Before any implementation, record owner decisions in the task scope and update/approve the plan. Then verify each chosen state in keyboard and responsive rendering, plus reduced-motion emulation if motion is used. A theme branch would require its own explicit scope and completeness review, not an assumed audit fix. No new animation library or timing changes.
- **Dependencies:** Written owner decisions; earlier relevant verification; updated plan and owner-approved implementation scope.
- **Risks:** Speculating product behavior from an icon/reference gap, visual treatment changing game meaning, introducing a theme branch inconsistent with the broader redesign plan.
- **Owner decisions:** Theme control’s function/persistence/system semantics/light-mode scope; selected mode and Go readiness behavior/copy; shortcut support/disclosure; Time Attack low-time/expiry and bonus/penalty emphasis; any additional game-over information.
- **Proposed future implementation allowlist:** Only after each decision, likely `components/home/HomeSetup.tsx`, `components/ModeButton.tsx`, and/or `components/CategoryCard.tsx` for approved Home behavior; `components/game/GameplayStatus.tsx` and `components/game/TimeAttackGame.tsx` for approved Time Attack presentation; `app/globals.css` only for narrowly approved visual-state styling. Do not include `app/layout.tsx` or theme infrastructure unless the owner explicitly scopes theme implementation.

## Architecture and Scope Guardrails

- **Preserve shared architecture:** Use the existing shared gameplay presentation grammar for genuinely shared layout/status/control behavior. Avoid duplicating a correction across modes when the shared component owns it.
- **Preserve page/mode-specific ownership:** Home selection remains in Home setup; Classic and Time Attack keep their independent rules, timers, score flow, and lifecycle. Shared components are presentation-oriented and must not become a universal rules engine.
- **No application-code changes in this phase.** The allowlists above describe possible future changes only. This plan is advisory and confers no permission. Future code requires explicit owner approval and an updated, approved scope. Any outside-file need stops for approval.
- Do not alter the broader redesign plan’s catalog, routes, provider behavior, persistence, availability, or product decisions. If that plan and this audit material appear inconsistent, flag the exact decision for owner resolution.
- Do not add dependencies, CI, tests, fixture routes, or infrastructure by assumption. The project has no confirmed test framework or CI. Use only existing safe capabilities or request narrow approval when necessary.
- Do not treat the local design-reference discrepancy as a confirmed defect. Desktop references establish supplied visual target evidence; absent mobile or state designs do not establish defect, expected structure, or permission to remove behavior.
- Impeccable critique is degraded supplementary evidence only: its CLI was unavailable in the audit context. It is not authority, no generated score/findings are claimed, and recommendations here are grounded in completed analysis/design and project evidence.

## Cross-pass Verification Matrix

Verification is for future approved implementation, not performed by this plan:

| Change type | Proportionate future verification |
|---|---|
| Responsive/layout | Render affected screens at evidence points including 500×844 gameplay and separate 375×812 responsive checks, plus a wider viewport; inspect long labels, status/action hierarchy, scrolling, and horizontal overflow. Add device emulation only when available and relevant. |
| Keyboard/focus/dialog | Keyboard-only walkthrough of affected controls, tabs, dialog opening/closing, focus containment/restoration, restart/return, and shortcut focus interactions. Test browser behavior; use assistive technology where available and report that evidence separately. |
| State/recovery | Exercise only confirmed existing states in both applicable modes with safe controlled inputs or an existing supported renderer; check status comprehension, action reachability, and preserved mode-specific timing. |
| Motion/announcements | Emulate reduced motion if capability is available; confirm state remains understandable without motion and gameplay timing is unchanged. Validate announcement cadence with assistive technology where available. |
| Documentation-only plan artifact | Read back the created plan and confirm artifact scope. No browser QA, code review, build, lint, or implementation is part of this phase. |

There is no assumed CI or test framework. A build/lint is not a substitute for interactive, responsive, or assistive-technology verification and is not requested in this planning phase. Provider behavior is outside scope.

## What Not to Change

- No global rebrand, generic component-library reskin, token replacement, invented light mode, or theme behavior inferred from the icon.
- No redesign of coherent desktop defaults for novelty; preserve typography, palette, Home order, hero treatment, comparison board, paired decisions, and explicit result labels.
- No gameplay timing/rules/scoring, timer mechanics, category availability, routes, APIs, provider/data behavior, or persistence changes.
- No tutorial, onboarding flow, persistent coach marks, additional confirmation layer, decorative animation, or shortcut UI before intent and need are confirmed.
- No Co-op/PvP enablement or inferred Co-op flow from reference art.
- No WCAG conformance claim based on source/snapshot evidence.
- No edits to `design-reference/`, dependencies, configuration, or unrelated documentation/code.

## Owner Decisions Required / Needs Verification

- **Needs Verification [product-decision]:** Whether the Home theme icon is active; persistence/system-theme semantics and any light-mode scope; selected-mode appearance and Go readiness rule/copy.
- **Needs Verification [product-decision]:** Whether gameplay shortcuts remain supported globally, their intended disclosure, and whether Time Attack low-time/expiry/bonus/penalty needs additional visual or announcement emphasis.
- **Needs Verification [product-decision]:** Whether current game-over content is sufficient; no additional end-of-run information is assumed.
- **Needs Verification [inferred-from-codebase]:** Whether shortcut handlers conflict with focused controls; whether game-over focus placement/restoration is deficient; whether hero serialization corresponds to any visible or spoken issue; which loading/image-error states actually occur.
- **Needs Verification [environment-specific]:** Exact narrow header/dialog behavior at 500×844 gameplay and separate 375×812 responsive checks; reduced-motion runtime behavior. Current observations are bounded implementation evidence only, not designed mobile targets.
- **Needs Verification [capability-unavailable]:** No focused assistive-technology/formal accessibility testing was performed in the source analysis; announcement/tab acceptance and any conformance conclusion remain unavailable.
- **Needs Verification [capability-unavailable]:** Whether a suitable safe renderer or assistive-technology capability will be available at future implementation time; no test framework or CI is confirmed.
- **Plan-phase close:** The only authorized artifact in this task is this new plan document. After its read-back, no QA or implementation is authorized by this request.
