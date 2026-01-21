/**
 * Utilitário de Feedback Háptico Cross-Platform
 * 
 * Android: Usa navigator.vibrate()
 * iOS 17.4+: Usa o truque do <input type="checkbox" switch>
 */

type HapticPattern = "light" | "medium" | "heavy" | "success" | "error";

const VIBRATION_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [10, 50, 20],
  error: [50, 50, 50, 50, 50],
};

let iosHapticCheckbox: HTMLInputElement | null = null;

function getIOSHapticElement(): HTMLInputElement {
  if (iosHapticCheckbox && document.body.contains(iosHapticCheckbox)) {
    return iosHapticCheckbox;
  }

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.setAttribute("switch", "");
  checkbox.style.cssText = `
    position: fixed;
    top: -100px;
    left: -100px;
    opacity: 0;
    pointer-events: none;
  `;
  document.body.appendChild(checkbox);
  iosHapticCheckbox = checkbox;
  
  return checkbox;
}

function triggerIOSHaptic(): void {
  try {
    const checkbox = getIOSHapticElement();
    checkbox.checked = !checkbox.checked;
  } catch (error) {
    console.warn("[Haptics] iOS haptic failed:", error);
  }
}

function supportsVibration(): boolean {
  return "vibrate" in navigator && typeof navigator.vibrate === "function";
}

function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function haptic(pattern: HapticPattern = "medium"): void {
  try {
    if (supportsVibration()) {
      navigator.vibrate(VIBRATION_PATTERNS[pattern]);
      return;
    }

    if (isIOS()) {
      triggerIOSHaptic();
      if (pattern === "success" || pattern === "error") {
        setTimeout(triggerIOSHaptic, 80);
      }
    }
  } catch (error) {
    console.warn("[Haptics] Failed:", error);
  }
}

export function hapticLight(): void { haptic("light"); }
export function hapticMedium(): void { haptic("medium"); }
export function hapticHeavy(): void { haptic("heavy"); }
export function hapticSuccess(): void { haptic("success"); }
export function hapticError(): void { haptic("error"); }

export default haptic;
