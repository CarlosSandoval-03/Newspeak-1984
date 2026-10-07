export interface Scene {
  enter(): void;
  update(): void;
  draw(): void;
  exit(): void;
}
