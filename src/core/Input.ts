import { KEYS } from "../config";

export type Action = keyof typeof KEYS;

const gameKeys = new Set<string>(Object.values(KEYS).flat());

export class Input {
  private readonly held = new Set<string>();
  private readonly pressed = new Set<string>();

  constructor(target: EventTarget = window) {
    target.addEventListener("keydown", (event) => {
      const { code } = event as KeyboardEvent;
      if (!gameKeys.has(code)) return;
      event.preventDefault();
      // Auto-repeat sends keydown again while the key stays held; only the first one is a press.
      if (!this.held.has(code)) this.pressed.add(code);
      this.held.add(code);
    });
    target.addEventListener("keyup", (event) => {
      this.held.delete((event as KeyboardEvent).code);
    });
    // A key released while the page has no focus never sends its keyup.
    target.addEventListener("blur", () => this.held.clear());
  }

  isDown(action: Action): boolean {
    return KEYS[action].some((code) => this.held.has(code));
  }

  wasPressed(action: Action): boolean {
    return KEYS[action].some((code) => this.pressed.has(code));
  }

  endFrame(): void {
    this.pressed.clear();
  }
}
