# HigherLower Homepage UX Audit — Design

**Date:** 2026-10-15  
**Phase:** Design recommendations only. No implementation or additional plan/QA artifact is authorized.  
**Source analysis:** [`docs/homepage-ux-audit-analysis-2026-10-15.md`](homepage-ux-audit-analysis-2026-10-15.md:1)  
**Prior decision context:** existing [`docs/ui-ux-audit-design-2026-10-15.md`](ui-ux-audit-design-2026-10-15.md:1) and pre-existing [`docs/ui-ux-audit-plan-2026-10-15.md`](ui-ux-audit-plan-2026-10-15.md:1) are context, not changed or superseded. Their broader gameplay scope is excluded here.

## 1. Design intent and governing constraints

### Intent

Preserve the homepage’s memorable dark-grid identity and orderly selection-to-play sequence while making the transition from hero to first actionable choice feel deliberate rather than like a blank gap. This is a bounded UX recommendation, not approval to collapse the hero or alter the target design. Maintain explicit, reversible choice controls, clear unavailable/readiness feedback, and a coherent return path from the homepage-owned High Scores dialog.

### Evidence and authority

The design derives only from the homepage analysis, supplied Home target screenshot/tokens/notes, and previous approved design decisions. Figma target evidence governs visual language and desktop composition; source and local browser behavior describe the implementation baseline only. The exact long hero spacing, content counts, theme control, Go state, and mobile layout cannot be assumed approved merely because source currently implements a behavior. See [`design-reference/README.md`](../design-reference/README.md:16), [`design-reference/notes/open-questions.md`](../design-reference/notes/open-questions.md:5), [`design-reference/notes/responsiveness.md`](../design-reference/notes/responsiveness.md:1), and analysis H-03–H-11.

### Preserve

- Dark navy grid, Space Mono, high-contrast outlined per-word hero with offset accent colors, large expressive type, and muted lavender copy.
- Vertical story: hero → domain/category → mode → Ready/Go; semantic labels and descriptive option content.
- Native radio controls, visible focus, non-color-only selected/disabled cues, explicit unavailable state, real disabled semantics for Go until product-approved prerequisites are met.
- Local High Scores as a modal entry from Home, with the current observed Escape/close route returning to the opener.
- Existing catalog and route behavior. The audit does not redefine counts, availability, default domain or navigation.
- Reduced-motion support and current dependency stack. No new dependency, primitive, route, or infrastructure is justified.

## 2. Finding-by-finding design disposition

| Analysis finding | Design outcome | Recommendation and rationale | Disposition |
|---|---|---|---|
| **H-01 — distinctive hero** | Retain | Keep its wordmark, dark grid, typography, outline/offset accents, and supporting-copy hierarchy. Refine only within these visual constraints; no generic landing-page pattern or new brand layer. | **Evidence-backed preserve.** No visual change requested. |
| **H-02 — setup sequence** | Retain; validate dynamic copy if needed | Keep domain/category/mode/Go order and content-rich choices. The displayed aggregate counts should not be changed until product semantics (all categories vs playable/available) are confirmed. Ensure empty/unavailable copy remains consistent with actual catalog state if later verified. | **Preserve + verification.** Counts meaning is an owner/product question, not a copy-edit assumption. |
| **H-03 / H-11 — scroll depth and section rhythm** | Treat as primary UX question, not proven defect | Preserve reference-led spacious composition while considering whether there is a subtle, accessible signpost from hero to setup or a modest rhythm adjustment that retains the deliberate hero pause. Any future recommendation must continue to make the first choice’s location and next step legible, avoid obscuring hero content, and be compared against the supplied desktop composition. Do not move domain choices into the hero or compress everything to fit one screen without a product/design decision. | **Conditional design exploration only.** Owner must confirm whether first-viewport hero pause is intentional and whether earlier setup discovery is a goal. No approval to alter current layout in this audit. |
| **H-04 / H-07 — selected/readiness treatment** | Keep semantics; resolve target behavior | Selected domain/category/mode must remain visibly distinct from focus, with native checked state. Disabled Go should remain genuinely disabled and accompanied by concise, contextual instruction if that is the approved readiness rule. Avoid inventing new prerequisites, status copy, or an alternate selection graphic. | **Owner decision before final design.** Current source behavior is not automatically target authority. |
| **H-05 — theme-control mismatch** | Do not add or activate on inference | The supplied reference icon alone does not specify a toggle, persistence, system-theme interaction, or complete light theme. Do not add the icon-only control, a theme system, or light-mode styling without explicit direction. If a control is approved later, define its accessible name/state and theme coverage as part of a separately scoped design. | **Blocked on owner decision.** No active theme feature in this design. |
| **H-06 — High Scores entry/exit** | Preserve observed interaction | Keep its header button discoverable and named, open a modal dialog, permit close button and Escape, and restore focus to the opener. Continue to leave the parent setup state intact when dismissed. Internal High Scores content, tabs, filters, storage and destructive actions remain out of scope. | **Evidence-backed preservation.** Observed in current browser; cross-engine/AT remains unverified. |
| **H-08 — semantic/assistive reading** | Preserve current heading/name; test before changes | Keep explicit accessible title name and semantic radio choices. Do not change visible word spacing, text, or label based on accessibility-tree serialization. Conduct keyboard-only and AT verification before concluding any custom radiogroup or modal behavior is deficient. | **Verification first.** No confirmed accessibility defect. |
| **H-09 — responsive behavior** | Preserve hierarchy, validate true widths | Treat 1440px as the target visual reference. On other widths use implementation-defined reflow that preserves title legibility, setup sequence, useful touch targets, and dialog containment. Avoid horizontal overflow; inspect long labels and short viewport height. Do not claim Figma approval for mobile/tablet. | **Future verification required.** Browser did not provide reliable 375/390px viewport during this audit. |
| **H-10 — hero parallax/reduced motion** | Keep disabled-motion semantics; question benefit | If the existing scroll-linked parallax remains, verify that reduced-motion preference fully neutralizes displacement and that movement does not compromise reading, scroll continuity, or performance. Since it does not convey task state, no additional animation is recommended. Whether the effect is desired is unresolved; the current dirty source is not this task’s change. | **Owner preference + runtime verification.** No motion edit authorized. |
| **H-12 — performance** | Avoid speculative optimization | No measured performance defect exists. Keep the CSS grid and current lightweight icon/header. Do not add image libraries, animation libraries, or optimization complexity without measurement. | **No action.** Quantitative checks were not run. |

## 3. Interaction and motion direction

### Setup and Go

- Preserve one predictable progression from category domain to comparison category to mode and Go.
- A selection change may update dependent options but should not silently change the user’s selected mode unless that compatibility rule is owner-confirmed. The current source clears incompatible selection; treat this as a product rule to confirm, not an approved design requirement.
- Distinguish focus from selected state using the existing visible focus treatment plus a separate checked cue; do not encode selection only through accent color or hover.
- Keep Go’s disabled affordance truly non-activatable until the approved prerequisites are satisfied. Readiness copy should tell users what remains without claiming that unavailable categories are selectable.
- Preserve scroll position and selection state when High Scores opens/closes; do not convert the modal to a route or reset the setup.

### Scroll continuity

- The page should still read as a spacious, intentional long-form setup. No mandatory sticky header, forced auto-scroll, scroll snapping, progress tracker, or forced focus movement is supported by evidence.
- If an owner approves a discoverability improvement, first test a restrained cue that clarifies “setup continues below” without competing with the wordmark or falsifying the supplied target composition. A cue must be non-color-only, keyboard/screen-reader neutral (decorative cue hidden from AT unless it contains meaningful instruction), and removed or made static under reduced motion.
- Any actual spacing revision should be measured against the approved desktop screenshot and then treated as implementation-defined responsive work; do not cite it as a mobile Figma design.

### Motion

- Preserve reduced-motion handling and the no-gameplay-timing boundary. Home has no need for a decorative motion addition.
- Verify the existing parallax under default and reduced-motion settings; its maximum source mapping is 56px. Check whether it visibly shifts hero content while the reader scrolls toward controls. No runtime reduced-motion setting was available in this audit.
- If motion is later approved, use existing `motion` support and transform-only movement, never block scroll/focus, and keep a meaningful static state. Do not add another animation dependency.

## 4. Accessibility, responsive, and performance acceptance intent

These are design acceptance goals for a separately authorized implementation/verification phase, not evidence that the current page passes:

- Keyboard users can traverse domain, category, mode and Go controls in visual/source order, distinguish focus from checked/disabled state, and reach High Scores.
- Modal open places focus inside; close button and Escape dismiss; focus returns to the invoking High Scores button; homepage state and scroll continuity are retained. Confirm using more than one browser/AT where available.
- Screen-reader output exposes a clear page title, setup section names, radio group names, category/mode descriptions, disabled status and Go instructions. Keep hero accessible name “Higher or lower?” unless a real AT test identifies a problem.
- Color supplements text/icon/state, not the sole cue. Keep visible focus and target usability, including at zoom/enlarged text. No contrast ratios are claimed; run measurements before making conformance claims.
- Validate desktop reference at 1440×900 and actual narrow widths (at least 390px and 375px if available), plus short height and 200% zoom. Test full page and modal without horizontal page scroll, clipped labels, inaccessible footer, or unreachable CTA. Mobile layout remains implementation-defined.
- Verify reduced motion and scroll parallax separately. Test performance only if a measured concern appears; the current audit has no quantitative profile.
- No WCAG conformance assertion should be derived from code inspection, the Impeccable `detect` result, or one Chromium accessibility snapshot.

## 5. Reuse, components, and scope boundaries

If future approved work is authorized, reuse the existing homepage ownership and components: `HomeSetup`, `DomainSelector`, `CategorySelector`, `CategoryCard`, `ModeButton`, and `HighScoresModal`; preserve native radio controls and the native dialog. Use existing tokens in `app/globals.css` and the existing `motion` dependency only if necessary. `components/ui/button.tsx` exists but the current Home uses tailored native buttons; do not replace those controls with the shared primitive just for consistency when the branded interaction differs.

No source file is authorized to change now. The two documentation artifacts are the full approved write allowlist. Excluded: gameplay and its dialogs, High Scores content/storage implementation, catalog/provider/routes/data, product behavior, CSS/tokens, dependencies, configuration, design-reference files, and all pre-existing documentation.

## 6. Evidence-backed recommendations, optional polish, and rejected over-design

### Evidence-backed recommendations

1. Preserve the target identity and existing semantic setup structure.
2. Preserve observed modal dismissal and opener focus return; verify wider browser/AT compatibility before changing it.
3. Retain existing true-disabled Go behavior only subject to owner confirmation of its prerequisite rule; keep explanation available in the page.
4. Check actual responsive widths and reduced-motion runtime before any claim or correction.
5. Treat full-viewport hero and ~2600px desktop page as intentional current behavior that warrants an owner decision, not a defect proven by audit.

### Optional polish (only if separately approved)

- A subtle static scroll cue or a small adjustment to hero-to-setup rhythm, only if the owner prioritizes earlier setup discovery and visual comparison confirms the desktop target remains respected.
- A low-noise count/readiness copy clarification, only if product semantics and real catalog behavior show the current wording is ambiguous.
- Preserve the current modal entry affordance and explicitly communicate its purpose in accessible text; its current label is already clear, so no copy revision is proposed.

### Rejected over-design

- Full homepage redesign, rebrand, cardification of all setup choices, generic shadcn conversion, new illustrations or imagery, added onboarding, tutorial/coach marks, sticky nav, progress wizard/stepper, auto-scroll, scroll snapping, or forced selection.
- Adding a theme toggle or light mode from an icon reference alone.
- New motion, sound, persistent parallax embellishment, or a new animation/UI dependency.
- Adding shortcuts, new menu surfaces, more modals, or redirecting High Scores to another route.
- Altering category availability, aggregate metrics, default selection, domain/mode compatibility, game rules, URL behavior, or state persistence without owner approval.

## 7. Unresolved product choices and verification disposition

### Owner decisions before a design can be finalized

1. **Hero / scroll:** Is the full-viewport hero and first-choice-below-fold composition intentionally a pause/brand moment, or should users discover the setup choices earlier? If earlier discovery is preferred, may a modest spacing/signpost adjustment be explored while preserving the target look?
2. **Theme:** Is a theme control required at all? If yes, define toggle semantics, persistence, system preference behavior and whether light mode is in scope.
3. **Selection/readiness:** Confirm initial domain selection, category/mode compatibility and reset behavior, exact prerequisites for Go, and the desired selected/disabled visual states/copy.
4. **Counts:** Do hero counts mean all catalog categories, available categories, or playable categories, and should they be dynamic?
5. **Parallax:** Is the current user-added hero parallax desired, or should it be removed in a future explicitly authorized task? Current audit does not decide.

### Needs Verification

- **Needs Verification [product-decision]:** Five choices above remain open; do not implement an assumed answer.
- **Needs Verification [environment-specific]:** True 375/390px views, zoom/text enlargement, short-height device layout, and touch affordances; available tool resized/clamped to 500px.
- **Needs Verification [environment-specific]:** Reduced-motion runtime and measured parallax perceptibility; source guard is not runtime proof.
- **Needs Verification [capability-unavailable]:** Keyboard-only and assistive-technology acceptance; no formal accessibility evaluation or WCAG result.
- **Needs Verification [inferred-from-codebase]:** Whether dynamic count wording and unavailable-category explanation remain accurate for all catalog states.
- **Needs Verification [capability-unavailable]:** Quantitative performance or production-build evidence; no trace/build run.

## 8. Planning/approval/verification disposition

- **Design applicability:** Applicable; recommendations stay within homepage and homepage-owned interaction scope.
- **Planning disposition:** No Plan artifact is authorized by this task. If future implementation is desired, obtain owner decisions above and separate authorization for a scoped plan/change. This design doc is not implementation approval.
- **Approval needed:** Any visual change to hero/spacing, theme behavior, mode selection/Go prerequisites, counts, or parallax requires owner decision. Routine targeted QA can establish whether current behavior works but cannot settle product intent.
- **Verification performed for this design:** Source/reference review plus bounded live browser observation documented in Analysis. No implementation, screenshot correction pass, accessibility certification, mobile-specific verification, reduced-motion emulation, or performance profiling was performed.
- **Runtime status:** [Partial] Desktop and actual 500px browser evidence plus High Scores open/Escape/focus return and Go navigation were observed. TODO: complete responsive/AT/reduced-motion checks only in an authorized follow-up with suitable capabilities.
- **Scope closure:** Exactly two new Markdown artifacts are authorized. Do not create/update Plan, QA, Postfix, reconciliation, implementation, or persistent Impeccable critique artifacts.
