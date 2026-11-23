# HigherLower Frontend UI/UX Audit — Design

**Date:** 2026-10-15  
**Phase:** Design only. This artifact defines recommendations and decisions needed before planning; it does not authorize implementation.  
**Evidence source:** [`docs/ui-ux-audit-analysis-2026-10-15.md`](ui-ux-audit-analysis-2026-10-15.md:1), together with the target-design evidence in [`design-reference/`](../design-reference/README.md:1) and active UI/governance rules.  
**Artifact scope:** This file only: `docs/ui-ux-audit-design-2026-10-15.md`. The target path was confirmed absent before writing. No existing artifact is being replaced.

## 1. Design Intent and Executive Verdict

### Verdict

**Advance a focused, preservation-led design effort—not a redesign.** The existing HigherLower visual identity and core setup/comparison grammar are strong. The meaningful opportunity is to make important states, constrained layouts, and interaction/accessibility behavior dependable without adding visual systems or features that the evidence does not justify.

Keep the supplied desktop compositions and identity as the design anchor: dark navy/grid, Space Mono, white outlines, offset accent layers, the home hierarchy, and the two-card comparison board. The main design work should close high-value state gaps and address the observed narrow gameplay header pressure. Do not interpret missing references as defects or permission to remove existing behavior.

### Audience and success outcome

The player should be able to choose a comparison, understand the outcome, and continue or leave confidently. On the setup surface, selection and readiness should be legible. During play, the comparison, mode status, decision controls, and result should remain understandable at constrained widths and with keyboard or assistive technology. These are design outcomes inferred from the audited product purpose, not new feature requirements.

### Recommendation labels

- **Advance to planning:** Evidence supports a bounded design recommendation; planning can define implementation and verification details.
- **Owner decision:** Product intent or target behavior is unresolved; obtain confirmation before finalizing that branch.
- **Defer / reject:** Low value, unsupported by evidence, or unnecessary for this audit scope.

## 2. Authority, Constraints, and Strong Decisions to Preserve

1. Owner request and active governance outrank this document; the design-reference is authoritative for supplied target visuals. Current code/rendering is baseline evidence, not visual target authority. See [`design-reference/README.md`](../design-reference/README.md:16) and [`.roo/rules/00-governance.md`](../.roo/rules/00-governance.md:12).
2. Preserve the confirmed HigherLower identity and existing tokens. Do not replace it with generic shadcn styling, invent a light theme, or change the theme-control behavior by assumption. See [`.roo/rules/ui-design-system.md`](../.roo/rules/ui-design-system.md:79) and [`design-reference/notes/open-questions.md`](../design-reference/notes/open-questions.md:5).
3. Preserve the existing home content/order, native selection semantics, paired Higher/Lower actions, labeled correctness feedback, and mode-specific gameplay timing. Timing is gameplay behavior, not visual design authority. Evidence: analysis H-02, G-01, G-02, G-05; [`design-reference/notes/design-inventory.md`](../design-reference/notes/design-inventory.md:5).
4. Desktop is confirmed; mobile/tablet structure and breakpoints are implementation-defined, not designer-approved. Use mobile-first reflow that retains hierarchy and choice priority; never mechanically scale the 1440px reference. Any structural adaptation must be recorded as an implementation decision. See [`design-reference/notes/responsiveness.md`](../design-reference/notes/responsiveness.md:3).
5. Co-op art is evidence for a supplied reference sample, not approval to enable Co-op/PvP or expand gameplay scope. Keep currently unavailable modes unavailable unless product scope is explicitly decided.
6. Preserve semantic controls, visible focus, sensible target sizes, restrained live announcements, and existing reduced-motion support. Do not claim WCAG conformance based on this audit. See analysis A-06/I-04 and [`.roo/rules/ui-design-system.md`](../.roo/rules/ui-design-system.md:50).
7. No new dependency, route, provider, gameplay rule, data behavior, or broad refactor is part of this design. If implementation needs additional files or scope, it must be surfaced rather than assumed.

### Decisions already strong enough to retain

- A distinctive, coherent dark-grid/outlined visual language; no global reskin.
- A clear setup progression and disabled unavailable option/readiness affordance; refine only unresolved selected/readiness communication after owner direction.
- A shared comparison-board grammar across Classic and Time Attack, with mode accents and text-plus-glyph action labels.
- Textual result labels alongside tint; color remains supplemental rather than the sole signal.
- Native dialog and explicit destructive confirmation in High Scores; preserve scope clarity and cancel/confirm choices.
- Mode-specific result reveal and timer mechanics; visual feedback may clarify them but must not alter their timing.

## 3. Findings-to-Design Recommendations

Each finding below pairs the senior design recommendation with frontend-engineering implications. Recommendations define intended UX; they are not implementation assignments or proof of current defects.

### Home and global system

| Finding | Senior designer recommendation: outcome, principle, direction | Frontend engineer recommendation: responsive, accessibility, interaction | Disposition |
|---|---|---|---|
| **H-01, H-05 — coherent identity and preservation boundary** | Preserve the dark-grid canvas, Space Mono, outlined hero with word-specific offsets, established colors, and the target hierarchy. Optimize clarity within this language rather than replacing it. | Treat existing tokens and reference assets as constraints. Do not introduce a parallel theme or substitute typography. At smaller widths, reflow rather than shrink the desktop composition indiscriminately. | **Advance to planning** as the global visual guardrail; no standalone reskin work. |
| **H-02 — setup semantics/readiness strength** | Retain the progressive domain → category → mode → Go structure and clear unavailable-mode status. Clarify selection/readiness only where owner-confirmed target states require it. | Keep native radio semantics and disabled semantics aligned with visible states. Maintain usable focus and touch targets. The exact disabled/ready copy and selected-mode look are not established. | Preserve current proven grammar; **Owner decision** for unspecified state appearance/behavior. |
| **H-03 — concatenated hero text snapshot** | Do not alter visible spacing, copy, or accessible name based on a serialized text snapshot alone. Desired outcome is coherent visual reading and understandable pronunciation, using the supplied wordmark as visual authority. | First verify the rendered visual and screen-reader/name output in focused QA. Only then propose a semantic separation or accessible-name adjustment if evidence shows a real issue; do not infer defect from snapshot serialization. | **Defer** design change pending verification; **Needs Verification [inferred-from-codebase]**. |
| **H-04 — mode/Go/theme gaps** | Keep the theme-control icon and existing setup order. Do not design a light mode or assume theme toggle semantics. Selected mode and readiness should eventually be explicit and consistent, but no exact appearance is authorized by current evidence. | Model selected/focus/disabled distinctly and accessibly if owner confirms desired behavior; avoid coupling keyboard focus visuals to selection. Theme persistence/system behavior must not be invented. | **Owner decision** required for theme-control function, selected mode, and Go readiness behavior. |

### Classic and Time Attack gameplay

| Finding | Senior designer recommendation: outcome, principle, direction | Frontend engineer recommendation: responsive, accessibility, interaction | Disposition |
|---|---|---|---|
| **G-01, I-01 — shared comparison/actions** | Preserve the two-card comparison, divider/OR treatment, mode status, and broad paired Higher/Lower actions. Keep each action’s readable text and directional glyph; mode accent remains a supporting cue. | At narrow widths, retain both decisions as equally discoverable, reachable controls and preserve card comparison comprehension. Keep native button behavior, clear focus, and minimum comfortable target dimensions. | **Advance to planning** as a preservation requirement, not redesign. |
| **G-02 — readable result feedback** | Preserve explicit Correct/Incorrect and Time Attack time-delta language with visual tint as reinforcement. Feedback should be quickly understood without relying on color. | Keep status announcement semantics restrained and meaningful; verify state changes do not create duplicate or continuous noisy announcements. Maintain sufficient contrast and non-color cues. | **Advance to planning** for state consistency/verification; avoid cosmetic-only feedback work. |
| **G-03 — global keyboard shortcuts** | Make keyboard affordances discoverable only if shortcuts are intentionally supported; keep the decision buttons as the primary visible interaction. Avoid unsolicited shortcut legends that add clutter before confirming conflict behavior. | Verify `h`/`l` and arrows while focus is on controls and any editable/interactive context. Scope/ignore shortcuts where they would hijack another control. If retained, document shortcuts in a concise accessible help treatment. | **Advance to focused verification**; shortcut help/UI is conditional on findings. **Needs Verification [inferred-from-codebase]**. |
| **G-04, I-02/I-03 — constrained gameplay header** | Protect legibility of category/mode, score, and timer as priorities; the back action must remain findable. Do not force the desktop single-row composition at narrow widths if it compresses labels or creates collisions. | Design an implementation-defined reflow for narrow widths (for example, separate status from title/back row where needed), with long category names and timer/status included in checks. Keep content order logical and avoid horizontal overflow. Exact breakpoint/structure remains an engineering decision, not Figma approval. | **Advance to planning** for responsive validation and a bounded reflow; derive the layout from observed states, not invented designer authority. |
| **G-05 — mode-specific timing** | Keep Classic and Time Attack reveal cadence and timer semantics distinct. Design feedback so it fits those existing mechanics, not the reverse. | Preserve timing and business behavior exactly; visual transitions must not delay/advance rounds, alter score, or change timer behavior. Respect reduced motion without changing gameplay timing. | **Must not change** absent explicit gameplay authorization. |
| **G-06, I-06 — missing outcome/interaction states** | Create a coherent state treatment only for states needed to understand play: correct/wrong reveal, game-over, restart/return, and meaningful loading/image failure. Derive from current theme and board grammar; do not invent content or mechanics. Time Attack urgency/expiration treatment needs product direction. | Ensure actions remain reachable and state changes are communicated to assistive technology. Keep error fallback informative without treating missing mock imagery as evidence to remove image slots. Confirm actual state inventory before implementation. | **Advance to planning** for existing necessary states; **Owner decision** for timer urgency/expiry presentation. |

### Dialogs, accessibility, feedback, and motion

| Finding | Senior designer recommendation: outcome, principle, direction | Frontend engineer recommendation: responsive, accessibility, interaction | Disposition |
|---|---|---|---|
| **A-01/A-02 — High Scores and destructive confirmation** | Preserve native-dialog presentation, clear title/description, mode/filter/list hierarchy, empty state, and explicit destructive scope with Cancel/Confirm. Do not add extra confirmation layers. | Verify narrow-screen scrolling and dialog controls remain reachable. Validate tab semantics/keyboard model and focus return; retain clear action names and announcement after changes. | **Advance to planning** for focused keyboard/focus/responsive verification; no redesign indicated. |
| **A-03 — High Scores tab keyboard model** | Keep the mode-switching structure compact and recognizable; do not add redundant navigation UI. | Verify expected keyboard movement, roving tab stop, selected state, and tab-to-panel relationship with browser/assistive technology. Correct only demonstrated gaps. | **Advance to verification**; no defect asserted. **Needs Verification [capability-unavailable]** for AT result. |
| **A-04 — game-over custom dialog focus lifecycle** | Treat game over as a clear interruption and decision point; retain restart and return choices, with hierarchy consistent with gameplay. Avoid celebratory or urgent embellishments absent reference/product need. | On transition, place focus meaningfully in the dialog; contain/restore focus appropriately and ensure restart/return move focus to a sensible destination. Verify both modes and keyboard operation. | **Advance to planning** for existing dialog focus completeness; visual details remain derived from established theme. **Needs Verification [inferred-from-codebase]**. |
| **A-05 — Time Attack live announcements** | Keep urgency information purposeful and avoid turning every countdown tick into disruptive feedback. Preserve explicit correctness/time-delta text. | Validate announcement cadence with assistive technology; distinguish urgent low-time/expiration announcement policy from routine timer updates. Do not make a frequency or assertiveness change without evidence. | **Advance to focused accessibility verification**; cadence decision remains open pending test. **Needs Verification [capability-unavailable]**. |
| **I-04/I-05 — existing motion/reduced motion** | Motion should clarify transitions or feedback, not become decoration. Keep parallax and gameplay effects subordinate to reading and decision speed; reduced motion should retain understandable state changes without movement. | Preserve existing reduced-motion support and audit each relevant effect under emulation. Avoid new motion libraries. No animation may change gameplay/business timing. | **Advance to bounded verification**; no broad motion redesign. Runtime result **Needs Verification [environment-specific]**. |

## 4. State Completeness, Onboarding, and Mobile Ergonomics

### Valuable state-completeness work

Prioritize only states that support recovery, comprehension, or safe operation:

1. **Selection/readiness:** distinct selected, keyboard-focused, disabled, and ready states, contingent on owner resolution of the Home behavior question. Do not confuse focus with selection.
2. **Gameplay response:** correct/wrong feedback and subsequent-round transition, preserving current labels, color supplementation, and each mode’s existing timing.
3. **End of run:** game-over summary with clear restart and return choices, including correct focus placement/return and a legible narrow-screen presentation.
4. **Content failure:** an image/loading fallback that preserves the card’s semantic purpose and action context; define presentation only for failures confirmed to exist. Do not fabricate new provider or retry behavior.
5. **High Scores:** maintain populated and empty states and destructive confirmation; validate mode tabs, filter, scrolling, and focus lifecycle rather than adding more states.
6. **Time Attack urgency:** defer final low-time, timer-expiration, color, and animation decisions until product owner confirms intended urgency and the announcement approach is tested.

### Onboarding/help: minimal, conditional

Do **not** add a tutorial, multi-step onboarding, persistent coach marks, or a new help page. The setup already presents category prompts and mode descriptions, while gameplay offers labeled Higher/Lower controls. The only potentially valuable addition is a short, dismissible or always-available shortcut hint if verification confirms the keyboard shortcuts are intended and otherwise undiscoverable. No help copy is approved by this design; **Needs Verification [product-decision]** on shortcut discoverability and intended support.

### Mobile ergonomics

Mobile/tablet are not supplied design targets. A later implementation should nevertheless validate ergonomics as implementation-defined work: preserve reading order and choice priority; keep both actions easy to reach; ensure cards, title, back action, score/timer, dialogs and game-over actions do not collide or require horizontal scrolling; accommodate long labels and narrow viewport height; and preserve visible keyboard focus where relevant. The observed 500×844 gameplay header and 375×812 general captures are evidence points, not universal coverage or designer-approved compositions. Do not select exact breakpoints in this design artifact.

## 5. Work to Advance, Reject, or Defer

### Advance to planning

- A narrowly scoped responsive review/reflow for gameplay header and critical dialogs/game-over states, using the identified narrow viewport evidence and broader content cases.
- A state-completeness pass for existing gameplay result, game-over, restart/return, and confirmed loading/image-error conditions, preserving existing game mechanics.
- Focus lifecycle and keyboard interaction verification for gameplay shortcuts, game-over overlays, and High Scores tabs/dialog.
- A bounded accessibility verification pass for keyboard operation, meaningful focus, announcement cadence, contrast/non-color cues, and target usability. This is not a certification project and has no presupposed WCAG result.
- Reduced-motion runtime verification and ensure transitions communicate outcomes without affecting gameplay timing.

### Reject as unnecessary or unsupported

- Full visual rebrand, generic component-library reskin, wholesale token replacement, or invented light mode.
- Adding onboarding/tutorial flows, extra modals, decorative animations, shortcut UI before confirming shortcuts, or redundant action confirmations.
- Redesigning already coherent desktop default screens solely to create novelty.
- Reworking correct/incorrect color language when it is already paired with text.
- Expanding Co-op/PvP, introducing mechanics, changing category availability, or altering provider/gameplay behavior under an audit-design task.
- Broad WCAG compliance claim or audit sign-off based on source/snapshot evidence alone.

### Defer pending evidence/owner direction

- Home theme control activation, persistence, system-theme behavior, and light-mode completeness.
- Selected-mode appearance and exact Go enabled/disabled behavior/copy.
- Exact visual appearance of unsupplied hover, focus, pressed, disabled, reveal, game-over, restart, loading/error and transition states beyond the bounded principles above.
- Time Attack low-time urgency, timer color change, bonus/penalty motion, timer expiration state, and announcement cadence.
- Whether shortcut assistance is needed, and any visual change to the concatenated hero phrase/accessibility name.
- Any Co-op flow or its unresolved turn/action rules; outside this task’s currently rendered scope.

## 6. Owner Decisions Required Before Those Branches Are Planned

1. Is the Home theme-control icon an active theme toggle? If so, what are the intended persistence/system-theme semantics and is complete light mode in scope?
2. What should selecting a mode communicate, and under what confirmed prerequisites does Go enable? Is the existing readiness behavior the intended product rule?
3. Should keyboard shortcuts remain supported as global gameplay shortcuts? If yes, should the UI disclose them, and in what minimal surface?
4. What level of urgency should Time Attack communicate at low time and expiration? Should time additions/penalties have any visual emphasis beyond existing text/time feedback?
5. Are the current game-over choices and content sufficient, or is there any additional end-of-run product information intended? This design assumes no new mechanics or data.

Until confirmed, leave these choices unresolved rather than filling them with visual convention. Keyboard/focus and responsive concerns can be verified without presuming that observed source behavior is defective.

## 7. Planning Handoff and Verification Intent

The next authorized phase is **Plan**, not implementation. Planning should define a strict source-file allowlist after reviewing current working-tree changes; separate owner decisions from evidence-based work; and specify verification cases for desktop reference preservation, narrow gameplay/dialog states, keyboard/focus behavior, assistive announcements, and reduced motion. No source/CSS/component changes are authorized by this design artifact.

**Design applicability:** applicable and bounded; desktop direction is evidence-backed, while mobile structure is implementation-defined.  
**Current verification status:** recommendations are source/reference-based only. No runtime interaction, assistive-technology, formal accessibility, responsive re-render, or reduced-motion emulation was performed as part of this design phase.  
**Implementation status:** not started by request.

## 8. Open Questions / Needs Verification

- **Needs Verification [product-decision]:** Home theme control, light-theme scope, selected-mode/Go readiness rules; Time Attack urgency/expiration/feedback treatment; shortcut support/disclosure; and any additional game-over content.
- **Needs Verification [inferred-from-codebase]:** whether gameplay shortcuts conflict with focused controls; whether game-over focus placement/restoration is actually deficient; whether the hero text serialization reflects any visible or spoken issue.
- **Needs Verification [capability-unavailable]:** High Scores tab keyboard model and Time Attack announcements under assistive technology; no formal accessibility evaluation or WCAG conclusion is available.
- **Needs Verification [environment-specific]:** narrow gameplay header/dialog behavior across actual target viewports and reduced-motion runtime behavior. Existing local captures are bounded implementation observations only.
- **Needs Verification [inferred-from-codebase]:** exact list of user-visible loading/image-error states requiring designed fallbacks; confirm the states exist before adding UI.

No unresolved item above is silently treated as a defect or approved product behavior.
