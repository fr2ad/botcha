# Botcha — Design System

Source of truth for the app's look, motion, and screen anatomy. Derived from the Claude Design handoff bundle (`botcha-progressive-web-app/project/Botcha Flow.dc.html`, frames 1a–1o) and implemented in `web/src/index.css` + `web/src/screens/`.

Direction: **dark arcade lounge**. Near-black ground, one violet light source, four saturated seat colors that only ever appear as rings and accents — never as fills. Everything is round: pill buttons, circular avatars, 16–28px card radii. Motion is ambient and continuous rather than punchy, so a screen that is *waiting* still feels alive.

---

## 1. Tokens

All tokens live on `:root` in [web/src/index.css](web/src/index.css). Use the variable, never the literal.

### Color

| Token | Value | Use |
|---|---|---|
| `--bg-0` | `#0a0a0f` | page floor, bottom of every screen gradient |
| `--bg-1` | `#12121c` | top of every screen gradient |
| `--panel` | `#171930` | cards, list rows, bottom sheet, modal |
| `--surface` | `#1a1c2e` | avatar wells, chips, icon buttons |
| `--log` | `#14162a` | table log panel, chat composer |
| `--accent` | `#7c6ef6` | primary action, active state, the light source |
| `--accent-2` | `#a89bff` | accent text, mentions, secondary accent icons |
| `--accent-deep` | `#6a5ae0` | gradient end for the Play orb / logo tile |
| `--text-1` | `#eef0ff` | primary text |
| `--text-2` | `#c5c8dd` | secondary text, outline-button labels |
| `--text-3` | `#8f94b3` | supporting copy |
| `--text-4` | `#7d84a8` | swatch captions, faint labels |
| `--text-5` | `#565a72` | disclaimers, empty slots, disabled |
| `--line` | `rgba(255,255,255,.09)` | hairline borders |

### Seat colors

**Seat colors are not tokens.** They arrive per-game over the wire as `oklch()` strings the server picked (`server/src/config.ts`), because a Seat is "a color plus code name" drawn fresh from a 50-name pool — see §4a. The client renders `seat.color` and never substitutes its own.

Because the value can be any color syntax, **never build a translucent variant by appending hex alpha** (`` `${seat.color}59` ``) — that silently corrupts an `oklch()` string. Use `color-mix`:

```css
color-mix(in oklab, var(--seat) 35%, transparent)
```

The four fixed color tokens that remain are semantic, not seat identities:

| Token | Value | Means |
|---|---|---|
| `--green` | `#38d97a` | correct, positive delta, online |
| `--pink` | `#ff5c8a` | wrong, negative delta, hearts |
| `--amber` | `#ffcf3d` | coins, rank 1 |
| `--blue` | `#3d9dff` | reserved accent (confetti) |

### Type

- `--font-head` — **Fredoka** 500/600/700. Display only: wordmark, screen titles, seat letters, numbers in countdown rings, primary button labels.
- `--font-body` — **Nunito** 400/600/700/800. Everything else. Weight 800 is the workhorse for small uppercase labels and stat pills.

Scale in use: 46/30/28/26/22/17/15/13/12/11/10/9.5px. Small text leans on weight (800) and letter-spacing (1–2px) rather than size for hierarchy.

### Elevation

There is no neutral drop shadow. Depth comes from **colored glow**:

```css
box-shadow: 0 0 28px rgba(124,110,246,.5);   /* accent element */
box-shadow: 0 0 0 2.5px var(--seat), 0 0 20px rgb(from var(--seat) r g b / .35);  /* seat avatar */
```

Cards use `0 12px 40px rgba(0,0,0,.5)`; the bottom sheet uses `0 -18px 60px rgba(0,0,0,.6)`.

---

## 2. Motion

Every keyframe is defined once in `index.css`. Names are the contract — screens reference them, they don't redefine them.

| Keyframe | Duration | Where |
|---|---|---|
| `float1` / `float2` | 7–11s | ambient background particles (`<Ambient/>`) |
| `pulseGlow` | 3s | primary CTA, Play orb |
| `ringPulse` | 2.6s | expanding rings around Play orb, "you" seat in queue |
| `blink` | 1–1.2s | loading dots, input caret, vote-progress dots |
| `eyeScan` | 3s | pupil in the wordmark and splash logo |
| `fall` | 4–5.5s | confetti on a correct catch |
| `dashPulse` | 2s | empty queue slot border |
| `screenIn` | .34s | **every screen mount** — the route transition |
| `popIn` | .3s | avatar select, seat cards, locked-in guess |
| `riseIn` | .4s | staggered list rows, chat messages, steps |
| `sheetUp` / `scrimIn` | .34s / .2s | bottom sheet + modal entrance |
| `shake` | .4s | score pill on a wrong guess |

**Staggering** uses a `--i` index custom property, never per-item CSS:

```jsx
<div className="rise" style={{ '--i': i }}>   /* animation-delay: calc(var(--i) * 60ms) */
```

**Screen transitions.** `.screen` carries `animation: screenIn` and every route mounts a fresh `.screen` element, so navigation fades-and-lifts the incoming screen with zero per-route wiring. There is deliberately no exit animation — an outgoing screen unmounts instantly, which reads as a cross-dissolve and costs nothing.

**Reduced motion.** A `@media (prefers-reduced-motion: reduce)` block near the bottom of `index.css` drops every animation to a no-op. Any new keyframe is covered by it automatically; don't add inline `animation:` that bypasses it.

---

## 3. Components

Shared vocabulary lives in `index.css` as classes; screens compose them and only reach for inline styles for one-off geometry.

| Class / component | Anatomy |
|---|---|
| `.screen` | 430px max width, `100dvh` min height, vertical gradient `--bg-1 → --bg-0`, 24px side padding, `screenIn` on mount |
| `.btn-primary` | accent pill, Fredoka 600, `--glow`. `.pulse` adds `pulseGlow` |
| `.btn-outline` | transparent, 1px `--line`, `--text-2`, weight 700 |
| `.icon-btn` | 36px `--surface` circle, used for back/close |
| `.chip` | small pill on `--surface` for hearts, coins, round counter |
| `.panel` | `--panel` card, 16–20px radius, 1px `--line` |
| `<Wordmark/>` | `B` + eye glyph + `TCHA`; the eye's pupil runs `eyeScan`. One component, three sizes (splash 30, landing 46, table header 14) |
| `<Orb/>` | player avatar: one of 15 drawn faces (§4b) on a lit oklch disc. `selected` adds accent ring + `popIn` |
| `<SeatAvatar/>` | in-game seat: **dark well** (`--surface`) + colored ring + colored code-name initial in Fredoka. Never a filled color disc |
| `<CountdownRing/>` | conic-gradient ring draining over the turn/guess window, seconds in Fredoka at center, optional label |
| `<Ambient/>` | the radial violet wash + 3–4 drifting particles. Decorative, `pointer-events:none`, `aria-hidden` |
| `<Confetti/>` | 6 falling chips in the seat colors. Rendered only on a correct catch |

---

## 4. Screens

Frame IDs refer to the handoff bundle.

| Frame | Screen | Notes |
|---|---|---|
| 1b | **Splash** (`Boot` in `App.tsx`) | Shown while `resumeSession()` runs. Logo tile, wordmark, tagline, 3 blinking dots |
| 1c | **Landing** | Wordmark 46px, tagline, pulsing Google CTA, three step icons |
| 1d | **Onboarding** | Nickname pill with live counter + blinking caret, 4-column avatar orb grid, "+50 coins" chip, "Let's go" |
| 1e | **Home** | Hearts/coins chips, avatar orb, Play orb inside two `ringPulse` rings, online count, Leaderboard / How to play |
| 1f | **Out of hearts** | Bottom sheet over a blurred Home: 5 spent hearts, refill copy, "Play for 25 coins", "Come back tomorrow" |
| 1g | **Queue** | "FINDING HUMANS" pill with blinking dots, 4 seats (you glowing, joined, dashed empties), invite link, free-to-wait note |
| 1h | **Roster** | "STARTING IN 3" badge, 2×2 seat cards flipping in, "one of these four is not human…" |
| 1i | **Table** | Round counter with progress dots, horizontal seat strip (speaker enlarged with draining ring + "SPEAKING · Ns"), table log, composer pill, footer line |
| 1j | **Guess** | "Who's the bot?", big draining ring, seat rows (yours excluded), LOCKED IN state, vote-progress dots |
| 1k | **Reveal** | Spotlight wash, bot avatar in pink ring, code name, "was really …", who-guessed-what row, confetti if you were right |
| 1l/1m | **Result** | Outcome title (green/pink), score + coin pills, leaderboard rank, full identity list, Share + Play again |
| 1n | **Leaderboard** | Gold-tinted #1 row, accent-ringed "You" row, rows cascade in |
| 1o | **How to play** | Centered modal over blurred Home: three steps, fact chips, "Got it" |

---

## 4a. Seat identities

50 code names, generated in `server/src/config.ts` as **10 color families × 5 animals**:

| Family | Hue | Family | Hue |
|---|---|---|---|
| Crimson | 25 | Teal | 190 |
| Ember | 55 | Azure | 225 |
| Amber | 90 | Blue | 260 |
| Lime | 125 | Violet | 300 |
| Jade | 155 | Rose | 350 |

Rendered as `oklch(70% 0.16 <hue>)`. Two rules make the pool safe to draw from:

1. **The color word must match the rendered hue.** Players say "I think Blue Fox is the bot" out loud — a Blue Fox that renders pink is a bug, not a quirk.
2. **A game draws one name from each of 4 *distinct families*, never 4 off the flat list of 50.** A straight random draw can hand you Crimson Owl and Rose Quail — ~25° apart, indistinguishable at a glance — which breaks the only mechanic the game has. Family-based drawing guarantees ≥30° separation, and the animal names are unique across all 50 so no two seats can share either half of their name. `server/src/config.test.ts` asserts this over 500 draws.

## 4b. Avatars

15 faces, ids only (`dot`, `diamond`, `bar`, `square`, `cyclops`, `brow`, `capsule`, `trio`, `visor`, `wedge`, `scan`, `cross`, `sleepy`, `pip`, `crown`). The server stores and validates the id; `web/src/components/Orb.tsx` owns what each looks like — keep the two lists in sync.

Construction, shared by all 15: a radial-gradient disc at `oklch(76% .15 h) → oklch(52% .16 h)`, hues 24° apart, with a dark `#14162a` geometric face inline-SVG'd on top in a `0 0 64 64` box. Eyes sit at x21/x43, y28 so the set reads as one family. No emoji, no external assets.

Accounts created before the switch stored an emoji; `Orb` still renders those as text on a hashed hue rather than showing a blank disc, so no migration was needed.

## 5. Deliberate deviations from the mockup

The prototype was drawn against a snapshot of the app; where it disagrees with the running system, the system wins. These are decisions, not gaps:

- **15 drawn faces, extending the mockup's 12.** Frame 1d draws 12 custom orb faces; the pool is now 15 in the same visual language (§4b), and the emoji the server used to store are gone.
- **50 seat names, not the mockup's list.** Frame 1's script ships a 50-name pool, but its hues are spread evenly down the list regardless of the color word — "Jade Cat" lands on hue 14, a red. Rebuilt as color families so the name matches the color (§4a).
- **Seat identity in-game is the code-name initial**, per frames 1h–1j — not the player's emoji. This is also closer to `docs/SPEC.md` §2, where a Seat is a color + code name and the roster mapping stays hidden.
- **No typing indicator.** Frame 1i shows "Red Owl is typing…". The server emits no typing event and adding one would leak turn-timing signal about the bot. Dropped.
- **No rank delta on Result.** Frame 1l shows `#42 → #37 ▲`. The server sends only the post-game rank (`game.result.leaderboardRank`), so the arrow would be fabricated. Shows the absolute rank only.
- **Google button is still mocked.** Frame 1c's CTA routes to onboarding; real OAuth is Phase 2 (`docs/SPEC.md` §9).
- **Timings come from `server/src/config.ts`**, not the mockup's captions — the turn window is 30s there, and the client mirrors the server rather than the design copy.

## 6. Adding to this system

1. New color → add a token; don't inline a hex.
2. New motion → add a keyframe to `index.css` so reduced-motion coverage stays automatic.
3. New repeated shape → promote it to a class in `index.css` once it appears on a third screen; before that, inline is fine.
4. Any number that is also a game rule (rounds, timers, prices) belongs in `server/src/config.ts` and travels to the client over the wire — never hardcode it in a screen.
