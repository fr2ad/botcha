---
target: web/src/screens (whole app)
total_score: 29
max_score: 36
na_heuristics: 7
p0_count: 2
p1_count: 3
timestamp: 2026-08-27T12-00-43Z
slug: web-src-screens
---
Method: dual-agent (A: a5651dfbc5bf6ffb0 · B: a3c52dad644a6bb89)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Countdowns/vote-progress are excellent, but a dropped WebSocket mid-game shows nothing — `ws.onclose` silently retries with zero UI signal |
| 2 | Match System / Real World | 4 | Solid — Seat/Guess/Silent vocabulary matches the actual mental model throughout |
| 3 | User Control and Freedom | 3 | Nothing warns what leaving/backgrounding mid-Table costs (−10, no refund) before it happens |
| 4 | Consistency and Standards | 4 | Token/class system used disciplined-ly on every screen per DESIGN.md |
| 5 | Error Prevention | 3 | Spending your last Heart or 25 Coins is one tap, no confirm — inconsistent with the logout confirm pattern in the same file |
| 6 | Recognition Rather Than Recall | 4 | Seat strip stays visible throughout Table; color/name pairing never has to be memorized cold |
| 7 | Flexibility and Efficiency | n/a | Fixed-ruleset turn-based game by design — no power-user path is meant to exist |
| 8 | Aesthetic and Minimalist Design | 3 | Most screens are clean; Result and Table both stack more simultaneous groups than the minimalist direction elsewhere implies |
| 9 | Error Recovery | 2 | Onboarding/Profile show good inline errors, but a lost connection during Table/Guess gives zero diagnostic feedback |
| 10 | Help and Documentation | 3 | "How to play" modal reasonably covers the loop for a 3-minute game |
| **Total** | | **29/36** | **Good (81%)** |

*(Heuristic 7 scored n/a — fixed-ruleset game, no power-user path is meant to exist. Max renormalized to 36.)*

## Design Specificity Verdict

**LLM assessment**: Authored for Botcha specifically, not a reskinned chat app. The seat-color-as-ring-never-fill rule, the code-name system, the deliberate *absence* of a typing indicator (a real anti-cheat decision, documented as such), the LOCKED IN guess state, the SILENT badge, and copy like "one of these four is not human…" all encode the actual mechanic — anonymity plus suspicion — into the UI vocabulary. Where it slips toward generic: Home's Play-orb-plus-two-buttons layout and Result's stacked-card layout could belong to almost any casual mobile game; the specificity lives mostly in copy and the Table→Guess→Reveal sequence, less in Home/Result's structural layout.

**Deterministic scan**: `detect.mjs --json web/src/screens web/src/components` → exit 0, zero findings. No false positives to flag since nothing fired. Read plainly, this says less about the app's quality than about the detector's reach — it doesn't (and can't) catch the two most consequential issues this review found: an optimistic-UI state that outruns actual WebSocket delivery, and a viewport-overflow bug that only shows up once real chat content accumulates at runtime. Both came from source reading and live gameplay, not the static scan.

**Visual overlays**: Not applicable this run — no user-visible overlay was injected. In its place, Assessment B did a live gameplay walkthrough (mock login → Home → Profile sheet → Leaderboard → a full autonomous game through Table/Guess/Reveal/Result) with screenshots and direct DOM measurement, which is what actually surfaced the Table overflow bug below.

## Overall Impression

Botcha's visual/motion system is genuinely well-executed and consistently applied — DESIGN.md's rules are followed in practice, not just documented. The gap isn't polish, it's trust at the two moments that matter most: whether a Guess you just locked in actually reached the server, and whether you can even see the message box during a live timed Turn. Both are concrete, fixable, and both undercut the one thing a social-deduction game can't afford to get wrong — the player's confidence that their action counted.

## What's Working

- **`SeatAvatar`** (dark well + colored ring + initial, never a filled disc) is the single component decision that makes "you can't tell who's who" visually legible without ever leaking identity — applied with zero exceptions across Roster/Table/Guess/Reveal/Result.
- **`color-mix(in oklab, ...)` discipline** over hex-alpha suffixing: since seat colors arrive as arbitrary `oklch()` strings from the server, this avoids a real bug class, and every file that needed a translucent seat color used it correctly.
- **`SessionEnded`'s copy** ("That game ended without you… no score from it") is honest and non-alarming exactly where a returning, confused player needs calm, specific language rather than a generic error.

## Priority Issues

**[P0] A locked-in Guess can silently fail to reach the server while the UI shows success.**
Why it matters: `GameContext.tsx`'s `send()` only queues a message when the socket is `CONNECTING`; if it's `CLOSED`/`CLOSING`/null, the frame is dropped with no error. `submitGuess()` dispatches `SET_MY_GUESS` — which renders "LOCKED IN" in `Guess.tsx` — *before* the send even attempts delivery. A player can watch their one irreversible action confirm on screen and never have it reach the server. This is the core scoring mechanic lying about its own success.
Fix: gate the "LOCKED IN" UI on confirmed delivery (or at minimum queue on any non-OPEN state instead of silently dropping), matching how the outbox already handles the CONNECTING case.
Suggested command: `/impeccable harden`

**[P0] The Table composer can scroll off-screen mid-round, during the literal 20-second timed turn.**
Why it matters: confirmed live, not theoretical — by Round 3 the `.screen` container grows past the viewport (measured: 818px content vs 720px viewport at a normal desktop pane size) and the message input plus the "1–3 of your opponents may be bots" footer end up barely visible at the bottom edge. A player has to scroll mid-conversation to find the box they're supposed to type into before the ring drains — on the one screen where speed matters most.
Fix: pin the composer (`position: sticky` or a fixed-height flex layout with the log as the only scrollable region) so it never leaves the viewport regardless of how long the table log grows.
Suggested command: `/impeccable adapt`

**[P1] No reconnect/connection-loss indicator anywhere during a live game.**
Why it matters: paired with the P0 above — `ws.onclose` retries after 1.5s with zero UI signal in Table or Guess. A player who drops network mid-turn sees a frozen screen with no "reconnecting…" state and no way to know if their Heart is at risk, right up until whatever silently happened resolves itself.
Fix: surface connection state independent of the phase reducer — a small banner, or the countdown ring turning gray/dashed while the socket is down.
Suggested command: `/impeccable harden`

**[P1] Result overloads the peak-end moment.**
Why it matters: outcome headline → score/coin pills → leaderboard rank → full 4-row identity reveal → scrollable chat replay → 5-star rating + comment + send → Share/Play-again → Back-to-home, all on one continuous scroll, right at the emotional high point every player hits every single game. Cognitive-load checklist failures here (~5 of 8) are the worst of any screen in the app.
Fix: front-load outcome + primary CTA above the fold; move chat replay and the feedback form behind a "see more" disclosure, or defer the feedback ask to a calmer moment.
Suggested command: `/impeccable layout`

**[P1] No keyboard focus indicator anywhere, and Table's seat-mention targets are unreachable without a mouse.**
Why it matters: `index.css` has no `:focus-visible` rule at all. The mention target on each seat in `Table.tsx` is a plain `<div onClick>` with no `role`, `tabIndex`, or `aria-label` — invisible to a screen reader and unreachable by keyboard, on the app's busiest interactive screen.
Fix: add a global focus-visible outline token; convert mention targets to real `<button>`s with `aria-label={\`Mention ${codeName}\`}`.
Suggested command: `/impeccable audit`

## Persona Red Flags

**Riley (stress tester)**: Sending a message right at the Turn deadline gives no delivery confirmation — if the WS races the deadline, the draft just vanishes (root cause: the P0 above). Submitting a Guess during a momentarily dead socket shows "LOCKED IN" that never reached the server: a false-positive success state on the one action in the game that can't be undone.

**Casey (distracted mobile user)**: The Table composer's viewport-overflow bug (P0 above) hits Casey hardest — thumb-zone actions are supposed to sit at the bottom of the screen, but by Round 3 the actual input she needs to reach with her thumb has scrolled out of the reachable zone entirely, during the one screen with a hard countdown.

**Sam (accessibility-dependent)**: `CountdownRing` (used for both 20s windows) conveys urgency purely via a shrinking colored arc — no `aria-live` region announces "10 seconds left," so a screen-reader user gets no proactive time-pressure signal on the two most time-critical screens. The Table mention feature (unlabeled div, no keyboard semantics) simply doesn't exist for Sam, and with no `:focus-visible` anywhere, keyboard navigation through Onboarding's avatar grid or Guess's candidate list gives no visible position indicator.

## Minor Observations

- Two seats in the same game can render the same initial (e.g. Amber Duck / Azure Ibis both show "A") — confirmed live. They stay distinct via ring color, so the mechanic isn't broken, but DESIGN.md's identity scheme only guarantees hue separation and unique full names, not unique first letters.
- No confirmation before spending your last Heart or 25 Coins, while logout (no economic cost) gets a careful two-step confirm in the same file (`Home.tsx`) — worth a consistency pass even if not top-5 severity.
- `--text-5` (#565a72) carries meaningful copy at 9.5–11px in a few places (e.g. "1–3 of your opponents may be bots" on Table) — likely under WCAG AA contrast, and it's arguably the most important reminder on the screen, sitting in the lowest-contrast slot.
- Leaderboard's "show me in the list even if I'm not in the top N" pattern is a small, genuinely thoughtful "where am I" touch.
- Zero console errors across the full live walkthrough, including a full autonomous game playthrough — clean runtime.

## Questions to Consider

1. Hearts/Coins are explicitly framed as real stakes — does the current single-tap Play button (no confirmation) match that framing, or does the app's own logout-confirm precedent argue for the same treatment here?
2. The SILENT badge is public and immediate at 2 skipped Turns with no private pre-warning at 1 — deliberate pressure-building, or would a quieter first-strike nudge (visible only to the affected seat) serve a human who was just slow without exposing them as a suspect early?
3. Result shows everything at once — was "nothing hidden" a deliberate transparency choice, or would deferring the feedback ask to a lower-stakes later moment better protect the peak-end payoff the screen is otherwise built to deliver?
