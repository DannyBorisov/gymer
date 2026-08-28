# Gymerr UX Redesign Implementation Plan

## Overview

This plan restructures the app's UX to provide a clear, focused user journey for existing users. The goal is to give users an immediate sense of their progress and a clear path to start their workout.

## Current State Analysis

### Problems
1. No dashboard/home - users land on Programs with no context of their state
2. Fragmented workout entry points (StartWorkout, QuickWorkout, Programs)
3. Confusing navigation ("Workouts" vs "Programs" unclear)
4. No immediate sense of progress, streak, or wins
5. Too many taps to start a workout

### Current Navigation
- Programs | Workouts | Analytics | Profile

### Current Pages
- `/programs` - List of programs
- `/programs/:id` - Program detail
- `/start-workout` - Choose how to start
- `/quick-workout` - Setup quick workout
- `/workout` - Active workout
- `/workouts` - Workout history
- `/analytics` - Charts and stats
- `/profile` - Settings
- `/weight` - Weight tracking

---

## New UX Structure

### New Navigation
```
Home | Programs | History | Profile
```

### New Routes
- `/` or `/home` - Dashboard (NEW - primary landing)
- `/programs` - Programs list (keep)
- `/programs/:id` - Program detail (keep)
- `/programs/create` - Create program (keep)
- `/quick-workout` - Quick workout setup (keep)
- `/workout` - Active workout (keep)
- `/history` - Workout history (rename from /workouts)
- `/profile` - Settings + weight combined (merge)

### Removed/Merged
- `/start-workout` - REMOVE (functionality moves to Home)
- `/analytics` - MERGE into History page
- `/weight` - MERGE into Profile page

---

## Phase 1: Create Home Page

### File: `src/pages/Home/Home.tsx`

Create a new Home page with these sections:

#### 1.1 Header Section
```tsx
// Greeting based on time of day
// "Good morning, {firstName}"
// Show current streak badge if > 0
```

#### 1.2 Week Progress Card
```tsx
// Visual progress of current week
// "Week Progress: 2 of 4 workouts"
// 7 dots/squares for each day, filled if workout done
// Tap to see this week's workouts
```

#### 1.3 Primary Action Card
```tsx
// IF user has active program with next workout:
//   - Show next workout name and day
//   - "Start: Upper Power (Day 3)"
//   - Big primary button
//   - Tap → navigate to /workout with workout pre-loaded

// IF user has active program but completed this week:
//   - "Rest day - you've completed this week!"
//   - Secondary: "Quick Workout" button

// IF user has no active program:
//   - Two options side by side:
//   - "Quick Workout" → /quick-workout
//   - "Create Program" → /programs/create
```

#### 1.4 Last Workout Summary
```tsx
// Card showing last workout
// - Name, date (relative: "Yesterday", "2 days ago")
// - Duration
// - Exercises count, total sets
// - Tap to see details (opens drawer or navigates to history item)
```

#### 1.5 Quick Stats Row
```tsx
// Horizontal scroll or grid of small stat cards:
// - Total workouts this month
// - Current streak
// - Recent PR (if any)
// - Weight change (if tracking, last 7 days)
```

### File: `src/pages/Home/Home.module.css`
- Use existing dark theme variables
- Cards use `var(--bg-elevated)` with `var(--border-default)`
- Primary action button uses `var(--text-primary)` background

---

## Phase 2: Update Navigation

### File: `src/components/Layout/Layout.tsx`

Update bottom nav items:
```tsx
const navItems = [
  { to: "/", label: "Home", icon: Home },
  { to: "/programs", label: "Programs", icon: Dumbbell },
  { to: "/history", label: "History", icon: ClipboardList },
  { to: "/profile", label: "Profile", icon: User },
];
```

Remove:
- Analytics nav item (merge into History)
- The complex center button logic (simplify)

### File: `src/components/Layout/Layout.module.css`
- Remove center button special styling
- Make all nav items equal width
- Keep simple, clean bottom nav

---

## Phase 3: Update History Page

### Rename and enhance `/workouts` → `/history`

### File: `src/pages/History/History.tsx` (rename from WorkoutHistory)

#### 3.1 Add Analytics Section at Top
```tsx
// Collapsible or tabbed section
// "Stats" toggle to show/hide charts
// - Workout frequency chart (last 4 weeks)
// - Volume trend
// - Keep it simple, not overwhelming
```

#### 3.2 Workout List
- Keep existing grouped-by-date list
- Each card shows workout summary
- Tap to expand details (drawer)

### Update Route
- Change route from `/workouts` to `/history`
- Update all navigation references

---

## Phase 4: Simplify Profile Page

### File: `src/pages/Profile/Profile.tsx`

#### 4.1 Add Weight Section
```tsx
// Move weight tracking into Profile
// - Current weight display
// - "Log Weight" button
// - Small sparkline chart of last 30 days
// - Tap to see full weight history (drawer or expand)
```

#### 4.2 Keep Settings
- Units (kg/lbs)
- Rest timer settings
- Notifications

#### 4.3 Account Section
- User info
- Sign out

### Remove
- Separate `/weight` page (merge into Profile)
- Remove weight button from Profile header (inline it)

---

## Phase 5: Simplify Programs Page

### File: `src/pages/Programs/Programs.tsx`

#### 5.1 Active Program Highlight
```tsx
// If user has active program, show it prominently at top
// - Program name
// - Progress: "Week 2 of 4"
// - Next workout preview
// - "Continue Program" button
```

#### 5.2 Other Programs List
- Show other saved programs below
- "Create New Program" card at bottom

#### 5.3 Remove
- Quick workout card from Programs (it's on Home now)
- Redundant CTAs

---

## Phase 6: Update Workout Context

### File: `src/contexts/WorkoutContext.tsx`

Add helper functions:
```tsx
// getNextScheduledWorkout() - returns next workout from active program
// getWeekProgress() - returns { completed: number, total: number }
// getCurrentStreak() - returns number of consecutive workout days/weeks
```

---

## Phase 7: Clean Up Routes

### File: `src/App.tsx` or router config

```tsx
// New routes
<Route path="/" element={<Home />} />
<Route path="/home" element={<Navigate to="/" />} />
<Route path="/history" element={<History />} />

// Redirects for old routes
<Route path="/workouts" element={<Navigate to="/history" />} />
<Route path="/analytics" element={<Navigate to="/history" />} />
<Route path="/start-workout" element={<Navigate to="/" />} />
<Route path="/weight" element={<Navigate to="/profile" />} />
```

---

## Phase 8: Delete Unused Files

After all changes are complete and tested:

```
DELETE: src/pages/StartWorkout/
DELETE: src/pages/Analytics/
DELETE: src/pages/Weight/
DELETE: src/pages/Dashboard/ (if exists, replaced by Home)
RENAME: src/pages/WorkoutHistory/ → src/pages/History/
```

---

## Implementation Order

1. **Create Home page** (new file, no breaking changes)
2. **Update WorkoutContext** with helper functions
3. **Update Layout/Navigation** to new structure
4. **Rename WorkoutHistory → History** and add analytics
5. **Update Profile** to include weight tracking
6. **Simplify Programs** page
7. **Update routes** with redirects
8. **Delete unused files**
9. **Test all user flows**

---

## Key User Flows to Test

### Flow 1: Start Program Workout
```
Open app → Home → See "Start: Upper Power" → Tap → ActiveWorkout
```

### Flow 2: Quick Workout
```
Open app → Home → Tap "Quick Workout" → Add exercises → Start → ActiveWorkout
```

### Flow 3: Create First Program
```
Open app → Home (no program) → Tap "Create Program" → Program builder → Save → Home shows new program
```

### Flow 4: Check Progress
```
Open app → Home → See week progress → Tap History → See past workouts + stats
```

### Flow 5: Log Weight
```
Open app → Profile tab → Weight section → Log weight → See trend
```

---

## Design Principles

1. **One primary action per screen** - Don't overwhelm with choices
2. **Show progress always** - Users should feel their effort pays off
3. **Minimize taps to workout** - 2 taps max to start
4. **Dark, minimal UI** - Follow existing design system in CLAUDE.md
5. **Cards for grouping** - Use elevated cards for distinct sections

---

## Files to Create

```
src/pages/Home/Home.tsx
src/pages/Home/Home.module.css
src/pages/Home/index.ts
```

## Files to Modify

```
src/components/Layout/Layout.tsx
src/components/Layout/Layout.module.css
src/contexts/WorkoutContext.tsx
src/pages/Programs/Programs.tsx
src/pages/Profile/Profile.tsx
src/pages/WorkoutHistory/WorkoutHistory.tsx (then rename)
src/App.tsx (or router file)
```

## Files to Delete (after migration)

```
src/pages/StartWorkout/
src/pages/Analytics/
src/pages/Weight/
src/pages/Dashboard/
```
