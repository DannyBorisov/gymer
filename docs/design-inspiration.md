# Gymerr — Design Inspiration & Direction

A reference for making Gymerr feel friendly, calm, and beautiful. Draws on the
visual language that dominates the fitness-app space (Nike Training Club, Strong,
Hevy, Gentler Streak, Fitbod, Whoop, Ladder, Peloton, Apple Fitness) — the same
work that surfaces in a `dribbble.com/search/fitness-app` scan.

No code here. This is the "why" and "what it should feel like".

---

## 1. The feeling we're aiming for

| Principle | What it means for Gymerr |
| --- | --- |
| **Calm, not loud** | One clear action per screen. The gym is already stressful; the app should feel like a quiet coach, not a scoreboard. |
| **Effort is the hero** | The biggest, boldest element on any screen is the thing the user is doing right now — the current set, the timer, the next workout. |
| **Progress is felt, not just shown** | Celebrate PRs, streaks, and volume with motion and warmth — a pulse, a ring filling, a soft confetti — never a wall of numbers. |
| **Trustworthy** | Data is theirs (Sheets in their Drive). The UI should look as solid and permanent as that promise. |
| **Fast** | Every tap during a workout should feel instant. Sweaty thumbs, one-handed, mid-set. |

**One-line vision:** *A pocket coach that makes showing up feel effortless and progress feel inevitable.*

---

## 2. Visual language

### Color

Current tokens are a strong start (near-black `#0a0a0a`, white text, green/orange/red accents). Keep the dark base — it's the norm for training apps and looks premium — but warm it and give it depth.

- **Base:** shift pure black toward a very dark warm charcoal (e.g. `#0B0B0D` → `#111014`). Pure `#000` on OLED feels cold and makes edges disappear.
- **Elevation through light, not lines:** surfaces get lighter as they come forward (`bg-primary` → `bg-secondary` → `bg-elevated`). Reserve hairline borders for inputs and dividers only.
- **One accent, used with intent:** pick a single signature accent (a confident green like `#22C55E` reads "go / healthy / progress"). Orange = active/live (timers, live activity). Red = only destructive/failure.
- **Accent gradients for hero moments:** a subtle vertical gradient on the primary CTA and the active-set card (e.g. green → teal, or a warm coral for "quick workout"). Flat elsewhere.
- **Semantic progress colors:** volume/strength in the accent; recovery/rest in a cool blue; body-weight in a neutral. Consistent everywhere so a glance reads instantly. (See `dataviz` skill before building any chart.)
- **Light mode:** warm off-white (`#FAFAF8`), not stark white. Same accent. Many users train in bright gyms — a good light mode is a real friendliness win.

### Typography

Right now it's `system-ui` everywhere. A single distinctive typeface family is the single highest-leverage upgrade for "beautiful".

- **Display / numbers:** a geometric or grotesk with great tabular figures — **Inter**, **Söhne**, **General Sans**, **Clash Display** (for big hero numbers), or **SF Pro** if staying Apple-native. Timers and weights should use **tabular / monospaced figures** so digits don't jump.
- **Body:** Inter or the same family at text weights. 15–16px body, generous 1.5 line-height.
- **Hierarchy by weight and size, not color:** Display 32–48 / SemiBold, Title 20–24 / SemiBold, Body 15–16 / Regular, Caption 12–13 / Medium uppercase with tracking for labels ("ELAPSED", "REST", "WEEK 3").
- **Big numbers are decoration:** the current-set weight, the workout timer, the streak count — set them large (40–72px), tight tracking, let them carry the screen.

### Shape & space

- Round, soft, generous. Cards `16–20px` radius, full-width primary buttons `14–16px` radius or fully pill-shaped, `52–56px` tall.
- **8px spacing rhythm** (tokens already do this). Let screens breathe — lots of vertical space between sections.
- **Thumb zone:** primary actions in the bottom third. During a workout, the "Complete set" button should be huge and impossible to miss.

### Iconography

- **One consistent set.** `lucide-react` is already in use — keep it, it's clean and complete. Don't mix icon styles.
- 1.5–2px stroke, rounded caps. Size 20 in nav, 16 inline, 24–28 for feature moments.
- **A few custom / illustrative touches** where an icon does emotional work: the streak flame, the PR trophy/bolt, the "rest" moon, the empty-state illustrations. These can be hand-drawn or from a warm illustration set (Open Doodles, Humaaans, Lukasz Adam, or simple custom line art) — muted, single-accent, never clip-art.
- Exercise thumbnails: simple line-art muscle/movement glyphs beat stock photos and load instantly.

### Motion

Motion is what separates "clean" from "delightful". `framer-motion` is already in the stack.

- **Purposeful, quick:** 150–250ms, ease-out. Screen transitions are already fast (80ms) — keep that.
- **Signature moments deserve more:** set completion (checkmark draw + card settle), PR (scale pop + haptic + soft particle burst), workout complete (rings fill in sequence), streak increment (flame flicker).
- **Timers breathe:** the rest timer and live-activity dot get a slow 1–2s pulse so "live" is obvious at a glance.
- **Progress rings/bars animate on mount** — fill from 0 every time the screen appears. It makes progress feel earned.
- **Haptics** on every meaningful confirmation (set done, PR, workout done). Already partly wired.
- Respect `prefers-reduced-motion` — swap movement for fades.

---

## 3. User flows — where to simplify

### 3.1 First run — "first workout in under 2 minutes"

The `docs/user-journey-plan.md` already nails the routing logic. Design layer on top:

- **Landing:** one hero line, one CTA (**Start tracking**), and a 3-step ribbon with icons: `📋 Choose a plan → 💪 Log your first set → 📈 Watch it climb`. A looping ~4s muted video or animated mockup of the active-workout screen behind a dark scrim.
- **Sign-in:** single Google button, one reassurance line ("Saved to a private spreadsheet you own"). No form, no "welcome back".
- **Template picker:** 4–6 big visual cards (Full Body, Upper/Lower, Push/Pull/Legs, Beginner, Strength, Home/Minimal). Each: an illustration, "3×/week · 45 min", one-line description. Tapping a card = program created with sane defaults. **No blank-slate builder as the first experience.**
- **Customize screen:** show only Name + Days/week + Duration. Everything else (exercises, RIR, variants, dynamic RIR) behind a single "Fine-tune exercises" link. Progressive disclosure.
- **First workout coaching:** 2–3 dismissible coach-marks that appear once and never again ("Tap a number to adjust", "Big button logs the set", "Swipe between sets"). Store the dismissal; never nag.

### 3.2 The daily loop — "open app → know exactly what to do"

- **Home = one card.** "Today: Upper A · Week 3 · ~40 min" with a full-width **Start** button. Below it, a slim strip: streak flame, last workout, this week's volume. Nothing else competes.
- **If a workout is in progress:** Home collapses to a persistent bottom "resume" bar (the `WorkoutDrawer` peek already does this — make it beautiful: live pulsing dot, exercise name, running timer, tap to expand).
- **Quick Workout** stays one tap from Home but visually secondary — a text link or small pill, not a co-equal button.

### 3.3 Active workout — the screen that matters most

This is where beauty and speed pay off. Keep the current structure, elevate it:

- **Layout:** timer + progress up top (small), **one giant focus card** in the middle for the current set, big **Complete** button at the bottom.
- **The focus card:** exercise name (title), target ("8 reps @ 2 RIR") as a quiet chip, then three large tap-to-adjust fields (Weight / Reps / RIR) with `+`/`−` and scroll-wheel input. Big tabular numbers. The card gets a subtle accent gradient border when it's the active set.
- **Set dots** (already there) — a clean row of numbered pills, filled as completed. This is the "where am I" anchor.
- **Between exercises:** horizontal swipe + a scrollable tab strip (already there). Auto-scroll the active tab to center.
- **Rest timer:** a large circular ring that drains, centered, with the countdown in tabular figures. Voice announcements at intervals (already implemented). Pulse while active.
- **Quick-fill:** "Last time: 80kg × 8" and "Copy set 1" as one-tap chips (already there) — make them prominent; they remove most typing.
- **Set completion:** checkmark draws over the card, card does a small settle, haptic. If it beat last time → the card flashes accent, a "Progression!" badge pops with a stronger haptic and a tiny particle burst. **Only celebrate real progress** — don't cry wolf.
- **Last set of the workout:** button label changes to **Complete workout**; on tap → rest timer off, live activity ends, save fires (already wired), then the completion screen.

### 3.4 Workout complete — the reward

- **Full-screen celebration first**, not a data dump. Big animated check, "Workout Complete", the workout name.
- Then **3–4 stat tiles animate in**: Duration, Sets, Avg RIR, PRs (each a small icon + big number + tiny label). Rings/counters count up.
- **One primary action:** "Back to program" / "Done". Optional secondary: "Add notes", "Log 1RM" — never a blocking modal.
- If it completed a program week or a streak milestone → an extra beat (badge, "Week 3 done — you're 60% through").

### 3.5 Progress & history — "make me want to come back"

- **Analytics home:** a few hero cards, each one chart, generous whitespace. Total volume trend, an exercise's estimated 1RM climbing, body-weight, workouts-per-week consistency (a GitHub-style contribution grid reads instantly for consistency).
- **Per-exercise detail:** tap any exercise anywhere → its progression chart, best set, recent history. This is the "am I getting stronger" payoff.
- **History list:** each workout as a card — date, name, duration, a sparkline of volume, a small PR badge if any. Tap to expand sets.
- **Empty states are onboarding:** friendly illustration + one line + a button that starts the next workout. Never a dead end.

### 3.6 Streaks & motivation (light touch)

- A **weekly target** ("3 of 3 workouts") shown as a small ring on Home — hitting it is the win, not a raw day-streak that punishes rest days (Gentler Streak's philosophy — reward consistency, respect recovery).
- **Flame** for consecutive weeks hit. Gentle. Losing it should feel like "let's get back to it", not shame.
- Optional: a single encouraging line on Home that varies ("You lifted 12,400kg this week", "Longest streak yet", "First session back — nice").

### 3.7 Profile & settings

- Calm list, grouped sections, generous row height, icons per row.
- Units (kg/lb), rest-timer default + announcement interval, appearance (light/dark/system), the link to their Google Sheet ("Open your data"), sign-out.
- Keep it short. Every setting is a small tax on friendliness.

---

## 4. Component-level polish checklist

- **Buttons:** one primary style (filled accent, pill, 52–56px, subtle gradient, presses down 2px with haptic). One secondary (ghost/tinted). One text link. That's it.
- **Inputs:** big tap targets, tap-to-focus opens a tuned numeric keypad or the scroll-wheel; `+`/`−` always available; current value in large tabular figures.
- **Cards:** consistent radius, elevation via background lightness, `16–20px` internal padding, no heavy shadows on dark (use a faint top highlight instead).
- **Drawers / sheets:** rounded top corners, a grab handle, spring-in, backdrop dim, swipe-to-dismiss (`SwipeableDrawer` already exists — standardize on it).
- **Bottom nav:** 3–4 items max (Home, Programs, Progress, Profile), icon + label, active item in accent with a soft indicator.
- **Loading:** skeleton screens shaped like the real content, never spinners on full pages. Optimistic UI for set logging (already effectively there).
- **Toasts:** rare, bottom, auto-dismiss, icon + short text. Errors get a retry affordance.
- **Numbers:** tabular figures everywhere a value can change.
- **Safe areas:** respect notch/home-indicator insets on every screen (partly done).

---

## 5. Quick wins, ranked by impact ÷ effort

1. **Adopt one real typeface** (Inter or General Sans) with tabular figures for all numeric displays.
2. **Warm the dark palette + add a light mode.**
3. **Home → single "Today" card** with one Start button; demote Quick Workout.
4. **Template-first program creation**; hide the builder behind "fine-tune".
5. **Workout-complete celebration screen** before any stats.
6. **Rest timer as a draining ring** with a pulse.
7. **Progression celebration** — badge + haptic + particle burst on a real PR only.
8. **Empty states become CTAs** (History, Analytics, Programs).
9. **Skeleton loaders** instead of spinners.
10. **Illustrated onboarding + empty-state art** in a single muted, accent-tinted style.

---

## 6. What the Dribbble scan shows (and what to borrow)

From the `fitness-app` results (Sans Brothers, Paperpillar, Musemind, Bato/iPUMPD, Hurmes, etc.), the recurring winning patterns:

- **Two dominant color schools:**
  1. *Warm light* — off-white/cream base, one soft accent (coral, lime, lavender), pastel category tints per card, black text. Feels friendly, calm, "wellness". (Paperpillar "Let's start strong!", the lavender Daily-Challenge shot.)
  2. *Deep dark + electric green* — near-black, neon-green accent, glowing anatomy/muscle visuals. Feels serious, "AI coach", performance. (Musemind, iPUMPD, Hurmes.)
  Gymerr is already in camp 2 — lean in on the warmth and green, and offer camp 1 as the light mode.
- **Big friendly greeting + avatar** top-left of Home ("Hello, Sophia" / "Welcome back 👋" with a photo). Small, human, sets a warm tone.
- **A single "start strong / continue workout" card** as the hero — exactly the "one Today card" recommendation. Often with a rounded progress ring showing % through the plan.
- **Pastel-tinted plan rows** — each workout/exercise row gets its own soft background tint + a small icon chip. Makes a list scannable and playful without photos.
- **Rounded everything** — 20px+ card radius, pill buttons, pill toggles (Daily/Weekly/Monthly segmented control).
- **One big number per stat**, tiny label under it, often paired with a mini ring or sparkline. Never a dense table.
- **Muscle-group visualization** (front/back body, highlighted target muscles) — a genuinely useful, beautiful element for a program/exercise detail screen. Worth a simple line-art version.
- **Timer as a large centered element** with monospaced digits and a pause control, mid-workout (Sans Brothers `00:32:12`, Hurmes `01:30`).
- **Contextual tips as dismissible cards** ("Stretching after workouts improves your sleep quality" — Dismiss / Set Routine). Matches the "coach cue" idea already in the app.
- **Weekly contribution grid / dotted calendar** for consistency (Hurmes `M T W T F` strip, the challenge calendars).
- **Soft, colorful line charts** — thin strokes, rounded, single accent, lots of whitespace, no gridlines.

What to *avoid* from the trendier shots: heavy stock photography on every card (slow, dates fast, hard to theme), glowing 3D renders (off-brand for a "your data, your Sheet" tool), and cramming 6+ metrics on one screen.

---

## 7. References worth studying

- **Strong / Hevy** — the gold standard for the active-logging screen; fast, dense-but-calm set entry.
- **Nike Training Club** — bold typography, full-bleed imagery, confident single-CTA screens.
- **Gentler Streak** — streaks that respect rest; warm, kind copy; beautiful rings.
- **Fitbod** — "here's your workout, just start" home screen; muscle-recovery visualization.
- **Whoop / Apple Fitness** — rings, recovery framing, restrained data-viz color.
- **Peloton / Ladder** — celebration moments, milestone beats, encouraging voice.
- **Linear / Things 3** (outside fitness) — for the calm, precise, single-typeface, motion-with-restraint craft bar.
