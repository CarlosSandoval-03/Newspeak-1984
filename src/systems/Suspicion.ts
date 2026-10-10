import {
  ALERT_THRESHOLDS,
  SUSPICION_DECAY,
  SUSPICION_MAX,
  SUSPICION_RISE_FAR,
  SUSPICION_RISE_NEAR,
  THOUGHT_POLICE_RESET,
} from "../config";
import type { Eye } from "../entities/Eye";
import { record, state } from "../state";
import { ALERT, type AlertLevel, type Vec } from "../types";

export function alertFor(suspicion: number): AlertLevel {
  if (suspicion >= ALERT_THRESHOLDS.thoughtPolice) return ALERT.thoughtPolice;
  if (suspicion >= ALERT_THRESHOLDS.pursuit) return ALERT.pursuit;
  if (suspicion >= ALERT_THRESHOLDS.alert) return ALERT.alert;
  return ALERT.normal;
}

// Owns the real suspicion and the alert level that follows from it.
export class Suspicion {
  // Once at the top it stays there, whatever moved it, until the Thought Police are dealt with:
  // not eyes, not decay, not instant changes. Freezing here, not in the scene, means a jump to the
  // top can't decay away on the same tick before anyone sees it.
  private frozen = false;

  // They are gone, killed or outlasted: suspicion settles back down.
  release(): void {
    this.frozen = false;
    this.set(THOUGHT_POLICE_RESET);
  }

  update(seenBy: Eye[], player: Vec): void {
    if (this.frozen) return;

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
    record("framesSeen");
    this.set(
      state.suspicion +
        SUSPICION_RISE_NEAR +
        (SUSPICION_RISE_FAR - SUSPICION_RISE_NEAR) * reach,
    );
  }

  add(amount: number): void {
    if (this.frozen) return;
    this.set(state.suspicion + amount);
  }

  private set(value: number): void {
    state.suspicion = Math.min(SUSPICION_MAX, Math.max(0, value));
    state.alertLevel = alertFor(state.suspicion);
    if (state.suspicion >= SUSPICION_MAX) this.frozen = true;
  }
}
