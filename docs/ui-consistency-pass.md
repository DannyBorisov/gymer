# UI Consistency Pass

Pre-tester polish plan. Reviewed all current screens (Home, Profile, Analytics,
History, Programs, Active Workout x2, Create Program x4) at full resolution.
Scope: **consistency only** — colors, spacing, contrast, labeling. No component
restructuring, no behavior changes.

## 1. Accent color is inconsistent across the app

The app's actual brand color is the green gradient (`--accent-gradient`),
correctly used on Home's "NEXT UP" card and the "Complete set" button. Three
other colors currently compete for the same "primary accent" role:

- **Blue** — body weight chart line (Profile)
- **Orange** — "+922%" stat and its icon on Analytics; the dumbbell icon on
  History rows
- **White** — "Continue" button on Programs (Active Program card)

**Fix**: make green the only accent color for anything positive/primary/
interactive. Blue chart → green. Orange stat/icons → green (reserve orange/
amber only for warnings, which the app already does elsewhere for RIR).
White "Continue" CTA → green gradient, matching Home and Create Program's
primary buttons.

## 2. Redundant/duplicate data display

Analytics shows the same number ("+922%") twice — once in orange as a
headline stat, once in green as a caption line below it. Reads as a mistake,
not a design choice.

**Fix**: show it once, styled as the headline stat only.

## 3. Wasted vertical space in Active Workout

Both active-workout screens have a large empty gap between the target-reps
pill and the set-number dots, and again between the number inputs and the
bottom button. The card is taller than its content, making the core
"logging a set" screen feel unfinished.

**Fix**: tighten vertical rhythm so the card height matches its content, or
use the reclaimed space for something useful (e.g. bigger/more legible
number inputs, or previous-set comparison).

## 4. Low-contrast / barely-readable placeholder text

Create Program's "Workout name," "Drag an exercise here or add one below,"
and "Search or add new exercise..." placeholders are near-invisible against
the dark background.

**Fix**: bump placeholder text to a legible secondary-text shade (there's
already a `--text-secondary` token stronger than what's used here).

## 5. Truncated content with no way to disambiguate

On Programs, two saved programs both show as "PHUL (Power Hypertrophy
Uppe..." — visually identical, no way to tell them apart without tapping in.

**Fix**: either wrap to a second line instead of truncating, or truncate
smarter (keep the distinguishing suffix visible).

## 6. Flat, unscannable exercise list

The exercise picker (Create Program) is 60+ plain-text rows with identical
checkboxes, no grouping. Scanning to find one exercise means reading
everything top to bottom.

**Fix (kept lightweight — consistency scope, not restructuring)**: add a
running "X selected" counter near the "Add exercises" button so progress is
visible; visually distinguish checked rows more clearly (currently relies on
a tiny empty square).

## 7. Missing header/eyebrow label on some screens

Home and Profile both have a small green all-caps "eyebrow" label above the
page title (e.g. "GYMERR / TODAY", "ACCOUNT"). Analytics and History skip
this, making the app feel less consistent page-to-page.

**Fix**: add matching eyebrow labels to Analytics ("ANALYTICS") and History
("HISTORY") for visual parity.

## Not in scope for this pass

- Exercise-picker grouping/categorization, list-row visual redesign, and the
  active-workout layout restructuring are structural changes — flagged for a
  later pass, not touched here.
- The AI coach-cue mentioning "wide-grip barbell curls" while viewing
  "Bulgarian Split Squat" looks like a stale-content bug, not a UI issue —
  worth investigating separately if reproducible.
