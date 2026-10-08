import { state } from "../state";

// Tells the truth for now. The HUD already asks here, so the lies can arrive without touching it.
export class Propaganda {
  displayedLives(): number {
    return state.realLives;
  }

  displayedScore(): number {
    return state.realScore;
  }
}
