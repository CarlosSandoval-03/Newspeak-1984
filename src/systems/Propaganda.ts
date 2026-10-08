import { state } from "../state";
import type { AlertLevel } from "../types";

// Tells the truth for now. The HUD already asks here, so the lies can arrive without touching it.
export class Propaganda {
  displayedLives(): number {
    return state.realLives;
  }

  displayedScore(): number {
    return state.realScore;
  }

  displayedSuspicion(): number {
    return state.suspicion;
  }

  displayedAlert(): AlertLevel {
    return state.alertLevel;
  }
}
