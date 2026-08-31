import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";

/**
 * Light haptic feedback for scrolling/selection
 */
export async function hapticLight() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Haptics not available
    }
  } else if (navigator.vibrate) {
    navigator.vibrate(5);
  }
}

/**
 * Medium haptic feedback for confirming selection
 */
export async function hapticMedium() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch {
      // Haptics not available
    }
  } else if (navigator.vibrate) {
    navigator.vibrate(10);
  }
}

/**
 * Selection changed haptic (softer tick)
 */
export async function hapticSelection() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.selectionChanged();
    } catch {
      // Haptics not available
    }
  } else if (navigator.vibrate) {
    navigator.vibrate(3);
  }
}

/**
 * Success notification haptic
 */
export async function hapticSuccess() {
  if (Capacitor.isNativePlatform()) {
    try {
      await Haptics.notification({ type: NotificationType.Success });
    } catch {
      // Haptics not available
    }
  } else if (navigator.vibrate) {
    navigator.vibrate([10, 50, 10]);
  }
}
