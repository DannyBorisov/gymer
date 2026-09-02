# 2-Week Free Trial / Premium — Implementation Plan

## Decisions

- **14-day trial** starts at account creation. During trial: full access.
- **After trial** (no subscription): free tier = workout logging only. Premium locks:
  - AI tips (`POST /ai/workout-tip`)
  - Analytics (`GET /analytics/progression`, `/analytics/bests`)
  - Multiple programs (free = 1 active program; premium = unlimited)
- **Billing: RevenueCat** — StoreKit (iOS) + Play Billing (Android) + RC web/Stripe (web).
  RevenueCat webhook → backend writes entitlement to Firestore.

## Current state (as of planning)

- **Auth**: Google OAuth only. Session = encrypted cookie (web) or encrypted `sessionToken`
  in localStorage (native). User identity = email.
- **User store**: Firestore `users/{email}` doc with `createdAt`, `lastLogin`, `name`, `picture`.
- **Platforms**: Web (Vercel) + Capacitor iOS + Android. Same React bundle everywhere.
- **No payment/subscription/paywall code exists anywhere.**
- **Key wrinkle**: the session `user` object is baked into the encrypted cookie/token at login
  and never refreshed. Entitlement must NOT live in the session — fetch fresh from Firestore,
  otherwise a user who subscribes mid-session stays locked until re-login.

## Source of truth

`users/{email}` doc in Firestore is the single source of truth. Session cookie is **not**
trusted for entitlement. Frontend fetches entitlement fresh on every `checkAuth()`.

---

## Backend

### 1. Data model — extend `UserDocument` (`packages/backend/src/plugins/firestore.ts`)

```ts
export type EntitlementStatus = "trialing" | "active" | "expired";

export interface UserDocument {
  email: string;
  name: string;
  picture: string;
  createdAt: Timestamp;
  lastLogin: Timestamp;
  trialEndsAt: Timestamp;                    // createdAt + 14d, set once
  subscription: {
    active: boolean;                          // set by RevenueCat webhook
    expiresAt: Timestamp | null;
    store: "app_store" | "play_store" | "stripe" | null;
    rcCustomerId: string | null;
  } | null;
}
```

### 2. `upsertUser` — set `trialEndsAt` on creation only

In the `if (doc.exists)` branch: don't touch trial fields. In the create branch:
`trialEndsAt: Timestamp.fromMillis(now.toMillis() + 14 * 864e5)`, `subscription: null`.

Backfill existing users: one-off script sets `trialEndsAt = createdAt + 14d` (most will
already be expired — fine, or grant a fresh 14d as a courtesy; TBD).

### 3. Pure resolver (`packages/backend/src/lib/entitlement.ts` — new)

```ts
export function resolveEntitlement(user: UserDocument, now = Date.now()) {
  if (user.subscription?.active &&
      (user.subscription.expiresAt?.toMillis() ?? 0) > now) {
    return { status: "active" as const, premium: true, trialDaysLeft: 0 };
  }
  const trialMs = user.trialEndsAt.toMillis();
  if (trialMs > now) {
    return {
      status: "trialing" as const,
      premium: true,
      trialDaysLeft: Math.ceil((trialMs - now) / 864e5),
    };
  }
  return { status: "expired" as const, premium: false, trialDaysLeft: 0 };
}
```

### 4. `requirePremium` middleware (`packages/backend/src/middlewares/auth.ts`)

Runs after `requireAuth`. Reads `session.user.email` → `firestore.getUser(email)` →
`resolveEntitlement`. If `!premium` → `403 { error: "premium_required" }`.
Apply as `preHandler: [requireAuth, requirePremium]` to:

- `routes/ai.ts` → `/workout-tip`
- `routes/analytics.ts` → both routes

For **multiple programs**: gate in `createProgram` handler, not middleware — after
`requireAuth`, if not premium and user already has ≥1 program → `403 premium_required`.

> Adds one Firestore read per gated request. Acceptable at current scale. If it matters
> later, cache entitlement in-memory with a short TTL keyed by email.

### 5. Entitlement endpoint

Add `entitlement` to the `/auth/google/status` response (`handlers/auth.ts` `getAuthStatus`
already has session; fetch user doc + resolve). Frontend gets it on every `checkAuth()`.

```ts
// getAuthStatus response
{ authenticated, user, entitlement: resolveEntitlement(userDoc) | null }
```

### 6. RevenueCat webhook (`packages/backend/src/routes/webhooks.ts` — new, no auth, verify RC signature)

`POST /webhooks/revenuecat` → on
`INITIAL_PURCHASE | RENEWAL | PRODUCT_CHANGE | CANCELLATION | EXPIRATION`:

- Map RC `app_user_id` → email (set RC `appUserID = email` at SDK init, simplest).
- Write `subscription: { active, expiresAt, store, rcCustomerId }` to the user doc.

RevenueCat's built-in trial: configure the subscription product with a 14-day introductory
free trial in App Store Connect / Play Console. Your `trialEndsAt` and RC's intro trial
overlap — **recommendation: keep `trialEndsAt` as the universal trial (works for web + users
who never open the store sheet); RC intro trial is just the store-side mechanic when they do
subscribe.**

---

## Frontend

### 7. `AuthContext` — expose entitlement

Add `entitlement` to context from the `authApi.status()` response. Re-fetch after a purchase
completes.

### 8. `useEntitlement()` hook

```ts
const { premium, status, trialDaysLeft } = useEntitlement();
```

### 9. `<PremiumGate>` + `/upgrade` page

- Wrap premium UI (AI tip button, analytics tab, "new program" when count ≥ 1).
  Non-premium → show lock + "Upgrade" CTA → `/upgrade`.
- Handle `403 premium_required` in `packages/frontend/src/utils/api.ts` → redirect to `/upgrade`.
- `/upgrade`: RevenueCat SDK `Purchases.getOfferings()` → `purchasePackage()`.
  Web uses RC Web Billing / Stripe.

### 10. Trial banner

In `Layout`, if `status === "trialing"`: "{trialDaysLeft} days left in your free trial · Upgrade".
If `expired`: persistent "Your trial ended · Upgrade".

### 11. Capacitor / RevenueCat native setup

- `@revenuecat/purchases-capacitor` plugin,
  `Purchases.configure({ apiKey, appUserID: user.email })` after login.
- Fix `capacitor.config.ts` — `appId: 'com.example.app'` is a placeholder; RevenueCat + store
  products need the real bundle ID.

---

## Build order

1. **Backend model + resolver + `/auth/status` entitlement field**
   → verify: new signup gets `trialEndsAt`, status returns `trialing`.
2. **`requirePremium` middleware on AI + analytics; program-count gate**
   → verify: expired-trial user gets 403; trialing user passes.
   (Test by temp-setting `trialEndsAt` in the past.)
3. **Frontend: `useEntitlement`, banner, `<PremiumGate>`, 403 handling, `/upgrade` stub**
   → verify: expired user sees locks + banner, trialing user sees countdown.
4. **RevenueCat: SDK init, offerings, purchase flow, webhook**
   → verify: sandbox purchase flips `subscription.active`, locks open.
5. **Backfill script for existing users.**

Steps 1–3 ship independently of RevenueCat (enforcement can be feature-flagged off until
step 4 is ready).
