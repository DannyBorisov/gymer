# User Journey Plan

## Journey goal

A new user should reach their first completed workout in one clear path:

**Landing -> Google sign-in -> choose a template -> customize only what matters -> start first session -> complete workout -> see progress -> return for next session.**

Quick Workout stays available as a secondary "I just want to train now" path, not a competing first decision.

## Current friction to address

| Moment | Current risk | Direction |
| --- | --- | --- |
| Landing | It says "no account" but then requires Google sign-in. | Explain that Google is used to create and own the user's private Sheets data. |
| Login | "Welcome back" is wrong for first-time users. | Use neutral, first-time-friendly copy: "Start tracking your training." |
| First authenticated screen | Home presents Quick Workout and Create Program equally, with little guidance. | Give first-time users one recommended path: **Choose a program template**. |
| Empty Programs page | It relies on an unlabeled floating plus button. | Add an explicit empty-state CTA: **Create your first program**. |
| Program creation | Users can be overwhelmed by templates, setup options, sessions, exercises, RIR, and variants at once. | Start from a template, reduce defaults exposed initially, reveal advanced options only when needed. |
| First workout | Users may not know what fields are required or what happens after completing a set. | Use a short, contextual first-workout guide that disappears permanently after completion. |
| History and Analytics | Empty pages do not guide users back to the action that creates data. | Add action-oriented empty states that lead to the next workout. |
| Completed program | The automatic 1RM drawer can interrupt the user after completion. | Show a completion screen first; make optional 1RM logging a secondary action. |

## Phase 1: Make onboarding intentional

### Landing and sign-in

**Landing**

- Replace "no account" with clear ownership language: "Sign in with Google to save workouts to a private spreadsheet in your Drive."
- Keep one primary CTA: **Start tracking**.
- Add a small three-step visual directly under the CTA: **Choose a plan -> Log your first workout -> Track progress**.

**Login**

- Change "Welcome back" to **"Start tracking your training"**.
- Add one supporting sentence: "Your workouts are saved to a spreadsheet you own."
- After authentication, do not always send the user directly to Home.

### First-run routing

Create a lightweight onboarding state derived from existing data:

- **No programs and no workout history:** route to `/programs/create` in template-selection mode.
- **Has a program but none selected as active:** route to Programs and ask the user to choose it as active.
- **Has an active program:** route to Home.
- **Has only quick-workout history:** route to Home and encourage creating a reusable program, without blocking Quick Workout.

The onboarding state can be inferred from existing API data; it does not need a new backend model initially.

## Phase 2: Make program creation feel guided

### Template-first creation

For a first-time user, make the first screen deliberately simple:

- Heading: **"Choose your starting point"**
- Recommended templates first:
  - Full Body - 3 days
  - Upper/Lower - 4 days
  - Push Pull Legs - 6 days
- Each template card should show only:
  - Days per week
  - Estimated session count
  - Best for / short description
  - **Use this plan** CTA
- Put **Build from scratch** below the templates as a secondary option.

Avoid introducing RIR, variants, or custom session structures until after template selection.

### Guided customization

After a template is selected:

1. **Name your plan**
2. **Schedule** - duration and sessions per week
3. **Sessions** - rename or add exercises
4. **Advanced options** - dynamic RIR and per-exercise variations

For first-time users:

- Keep the default effort progression enabled with simple copy such as "Effort gradually increases through the plan."
- Hide per-exercise custom RIR behind an **Advanced** expansion.
- Rename "Variation" to **Exercise variation**.
- Keep session cards collapsed by default except the first one.
- Show a compact completion indicator: `3 of 3 sessions ready`.

When the program is created:

- Automatically set it as the active program.
- Take the user directly to the Program Detail page.
- Show one clear next action: **Start first workout**.

## Phase 3: Make the first workout self-explanatory

### Program Detail

For a new program, replace passive schedule viewing with a focused next step:

- Highlight the first incomplete workout using a clear card:
  - `Up next`
  - Workout name
  - Exercise count
  - **Start workout**
- De-emphasize future weeks until the user completes the first session.
- Explain the state once: "Complete each set to save it automatically."

### Active Workout

Add a one-time, non-blocking first-workout guide. It should be contextual and disappear after users act:

1. Highlight the weight/reps fields: **"Log what you lifted here."**
2. Highlight complete set: **"Tap when this set is done."**
3. Highlight rest timer: **"Start a rest timer between sets."**

Rules:

- One hint at a time.
- Never use a modal that blocks workout logging.
- Do not show again after the user has completed their first set or dismissed the guide.
- Keep the coach cue optional; it should never compete with the primary logging action.

### Workout completion

After the last set:

- Show completion confirmation immediately.
- Display duration, completed sets, and PRs.
- Give one primary CTA: **Back to program**.
- Provide **View history** as a secondary action.
- Do not automatically open the 1RM flow. Show **Log a 1RM** only as an optional button after the success state.

## Phase 4: Build retention through useful empty states

### Home

The Home screen should always answer one question: **"What should I do next?"**

| User state | Primary Home action | Secondary action |
| --- | --- | --- |
| Brand new | Choose a program | Start a quick workout |
| Has active program | Start next session | Quick workout |
| Workout in progress | Resume workout | None |
| Completed program | Choose next program | Quick workout |
| Returning after inactivity | Resume from next incomplete session | View program |

Avoid showing analytics-style metrics before users have enough data to care about them.

### Programs

- Empty state: **"Build a plan you can follow."**
- Primary CTA: **Choose a template**
- Secondary CTA: **Build from scratch**
- Replace the unlabeled floating plus as the only discovery mechanism; it can remain as a shortcut once the user already has programs.

### History and Analytics

**History empty state**

- "Your completed workouts will appear here."
- CTA: **Start a workout**

**Analytics empty state**

- "Complete a few workouts to unlock useful trends."
- CTA: **View your program**
- Show progression charts only after enough data exists; avoid a dashboard full of zeros or dashes.

### Profile

Keep Profile utilitarian:

- Weight tracking should be the first card.
- Settings should remain secondary.
- Do not use Profile as onboarding; link to it only when a setting is relevant, such as choosing kg/lb.

## Shared product rules

1. Every page needs one obvious primary action.
2. Empty states should explain what will appear there and link to the next action that creates it.
3. Advanced controls should be hidden until users need them.
4. A completed action should always lead to the next useful action.
5. Use persistent navigation for exploration, but guide first-time users through one recommended path.
6. Prefer passive inline guidance over repeated dialogs, prompts, or confirmation steps.
7. Treat Quick Workout as an escape hatch for immediate training, not the default setup flow.

## Recommended implementation order

1. **First-run routing and explicit Programs empty state**
2. **Template-first onboarding and automatic active-program selection**
3. **Program Detail "Up next" CTA**
4. **One-time Active Workout guidance**
5. **Completion handoff and optional 1RM logging**
6. **History/Analytics action-oriented empty states**
7. **Landing and login copy alignment**

This order gets a first-time user from sign-in to a successful first logged workout before spending effort on secondary pages.
