import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

// Zero-dependency beep via the Web Audio API -- no audio asset, no new
// package. A short, clearly audible blip is enough for a phase-change cue.
function beep(): void {
  const AudioContextCtor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return;

  const ctx = new AudioContextCtor();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);

  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.25);
  oscillator.onended = () => void ctx.close();
}

// Haptics resolves to a safe no-op on web -- same Capacitor.isNativePlatform()
// branch pattern used elsewhere in this app for native-only plugins
// (@capacitor/share, @capacitor/filesystem).
async function vibrate(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await Haptics.impact({ style: ImpactStyle.Medium });
  } catch {
    // Best-effort -- a haptics failure must never interrupt the timer.
  }
}

export function playPhaseChangeFeedback(): void {
  beep();
  void vibrate();
}
