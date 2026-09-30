// Minimal canvas game-loop engine: the "자체개발 엔진" (self-developed engine).
// Deliberately small — a Halli Galli board doesn't need a scene graph,
// physics, or an asset pipeline, just a resizable canvas, a render callback,
// and pointer/keyboard input forwarding.

export interface EnginePointerEvent {
  x: number;
  y: number;
}

export class Engine {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;

  private renderCallback: ((ctx: CanvasRenderingContext2D, width: number, height: number) => void) | null = null;
  private rafHandle = 0;
  private running = false;
  private resizeObserver: ResizeObserver;

  constructor(container: HTMLElement) {
    this.canvas = document.createElement("canvas");
    this.canvas.className = "engine-canvas";
    container.appendChild(this.canvas);
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    this.ctx = ctx;

    // ResizeObserver (not a window "resize" listener) so the canvas stays in
    // sync with its container through flex-layout/content changes too, not
    // just actual browser window resizes — e.g. the container growing once
    // sibling elements (HUD/log panel) finish laying out on the same tick.
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
  }

  private resize() {
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  onRender(cb: (ctx: CanvasRenderingContext2D, width: number, height: number) => void) {
    this.renderCallback = cb;
  }

  onPointerDown(cb: (e: EnginePointerEvent) => void) {
    this.canvas.addEventListener("pointerdown", (ev) => {
      const rect = this.canvas.getBoundingClientRect();
      cb({ x: ev.clientX - rect.left, y: ev.clientY - rect.top });
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = () => {
      if (!this.running) return;
      const rect = this.canvas.getBoundingClientRect();
      if (this.renderCallback) this.renderCallback(this.ctx, rect.width, rect.height);
      this.rafHandle = requestAnimationFrame(loop);
    };
    this.rafHandle = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.rafHandle);
  }

  destroy() {
    this.stop();
    this.resizeObserver.disconnect();
    this.canvas.remove();
  }
}
