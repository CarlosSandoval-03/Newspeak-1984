import {
  ALERT_THRESHOLDS,
  SUSPICION_DECAY,
  SUSPICION_MAX,
  SUSPICION_RISE_FAR,
  SUSPICION_RISE_NEAR,
} from "../config";
import type { Eye } from "../entities/Eye";
import { state } from "../state";
import { ALERT, type AlertLevel, type Vec } from "../types";

export function alertFor(suspicion: number): AlertLevel {
  if (suspicion >= ALERT_THRESHOLDS.thoughtPolice) return ALERT.thoughtPolice;
  if (suspicion >= ALERT_THRESHOLDS.pursuit) return ALERT.pursuit;
  if (suspicion >= ALERT_THRESHOLDS.alert) return ALERT.alert;
  return ALERT.normal;
}

// Owns the real suspicion and the alert level that follows from it.
export class Suspicion {
  update(seenBy: Eye[], player: Vec): void {
    if (seenBy.length === 0) {
      this.set(state.suspicion - SUSPICION_DECAY);
      return;
    }

    // Measured against each eye's own range, so the one with the player deepest in its cone counts.
    const reach = Math.min(
      ...seenBy.map(
        (eye) =>
          Math.hypot(eye.pos.x - player.x, eye.pos.y - player.y) / eye.range,
      ),
    );
    state.stats.framesSeen++;
    this.set(
      state.suspicion +
        SUSPICION_RISE_NEAR +
        (SUSPICION_RISE_FAR - SUSPICION_RISE_NEAR) * reach,
    );
  }

  add(amount: number): void {
    this.set(state.suspicion + amount);
  }

  private set(value: number): void {
    state.suspicion = Math.min(SUSPICION_MAX, Math.max(0, value));
    state.alertLevel = alertFor(state.suspicion);
  }
}
