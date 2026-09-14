import { Capacitor } from "@capacitor/core";
import {
  Purchases,
  LOG_LEVEL,
} from "@revenuecat/purchases-capacitor";

const apiKey =
  Capacitor.getPlatform() === "ios"
    ? import.meta.env.VITE_RC_IOS_KEY
    : import.meta.env.VITE_RC_ANDROID_KEY;

let configured = false;

/**
 * Configure the RevenueCat SDK for the signed-in user. Safe to call more than
 * once — subsequent calls only log the user in. No-ops on web (no web billing
 * key configured yet).
 */
// Temporarily disabled — throwing errors in production. Re-enable by
// removing this early return once the underlying issue is fixed.
const DISABLED = true;

export async function configurePurchases(appUserID: string): Promise<void> {
  if (DISABLED || !Capacitor.isNativePlatform() || !apiKey) return;

  if (!configured) {
    await Purchases.setLogLevel({
      level: import.meta.env.DEV ? LOG_LEVEL.DEBUG : LOG_LEVEL.ERROR,
    });
    await Purchases.configure({ apiKey, appUserID });
    configured = true;
    return;
  }

  await Purchases.logIn({ appUserID });
}

export async function logOutPurchases(): Promise<void> {
  if (DISABLED || !Capacitor.isNativePlatform() || !configured) return;
  await Purchases.logOut();
}
