// Scales in device pixels: only an integer factor there keeps pixel art crisp at 125% or 150% OS zoom.
export function fitCanvas(
  canvas: HTMLElement,
  frame: HTMLElement,
  width: number,
  height: number,
): void {
  const dpr = window.devicePixelRatio;
  const borderX = frame.offsetWidth - canvas.offsetWidth;
  const borderY = frame.offsetHeight - canvas.offsetHeight;

  const scale = Math.max(
    1,
    Math.floor(
      Math.min(
        ((window.innerWidth - borderX) * dpr) / width,
        ((window.innerHeight - borderY) * dpr) / height,
      ),
    ),
  );

  canvas.style.width = `${(width * scale) / dpr}px`;
  canvas.style.height = `${(height * scale) / dpr}px`;
}
