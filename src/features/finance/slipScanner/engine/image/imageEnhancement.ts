// Image enhancement planning (GS-027). The "only process when necessary" rule
// lives here as a pure decision: given an image's brightness/contrast stats,
// decide which corrections it actually needs. The canvas application lives in
// imageEnhancer.ts. Auto-rotate is handled by the QR Recovery Engine (GS-026);
// auto-crop (content-region detection) is deferred.

export interface ImageStats {
  brightness: number; // mean luma, 0–255
  contrast: number; // luma standard deviation, 0–255
}

export interface EnhancementPlan {
  grayscale: boolean;
  brightness: number; // multiplier (1 = unchanged)
  contrast: number; // multiplier (1 = unchanged)
  sharpen: boolean;
}

const DARK = 90;
const BRIGHT = 190;
const LOW_CONTRAST = 40;
const VERY_LOW_CONTRAST = 25;

export function planEnhancements(stats: ImageStats): EnhancementPlan {
  const brightness = stats.brightness < DARK ? 1.4 : stats.brightness > BRIGHT ? 0.8 : 1;
  const contrast = stats.contrast < LOW_CONTRAST ? 1.5 : 1;
  const sharpen = stats.contrast < VERY_LOW_CONTRAST;
  // Grayscale is applied alongside corrections (it aids QR/OCR) but never on its
  // own — a healthy image is left untouched.
  return { grayscale: true, brightness, contrast, sharpen };
}

// True when the plan changes anything beyond grayscale — i.e. the image
// actually needs processing.
export function isEnhancementNeeded(plan: EnhancementPlan): boolean {
  return plan.brightness !== 1 || plan.contrast !== 1 || plan.sharpen;
}

// The CSS canvas filter string for the plan's tonal corrections (sharpen is a
// separate convolution).
export function enhancementFilterString(plan: EnhancementPlan): string {
  const parts: string[] = [];
  if (plan.grayscale) parts.push("grayscale(1)");
  if (plan.brightness !== 1) parts.push(`brightness(${plan.brightness})`);
  if (plan.contrast !== 1) parts.push(`contrast(${plan.contrast})`);
  return parts.length > 0 ? parts.join(" ") : "none";
}
