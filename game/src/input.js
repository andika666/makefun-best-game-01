// Keyboard and mouse input, in canvas coordinates, with edge detection
// (a key pressed this frame, not just held).

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    /** Codes currently held down. */
    this.down = new Set();
    /** Codes pressed since the last frame was consumed. */
    this.pressed = new Set();
    /** Mouse position in canvas pixels. */
    this.mouseX = 0;
    this.mouseY = 0;
    /** Click positions queued since the last frame, in canvas pixels. */
    this.clicks = [];
    /** Whether the pointer is over the canvas. */
    this.mouseInside = false;
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressed.add(e.code);
      this.down.add(e.code);
    };
    this._onKeyUp = (e) => {
      this.down.delete(e.code);
    };
    this._onMouseMove = (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.mouseInside = true;
    };
    this._onMouseDown = (e) => {
      const p = this._toCanvas(e.clientX, e.clientY);
      this.mouseX = p.x;
      this.mouseY = p.y;
      this.clicks.push({ x: p.x, y: p.y });
    };
    this._onMouseLeave = () => {
      this.mouseInside = false;
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('mousedown', this._onMouseDown);
    canvas.addEventListener('mouseleave', this._onMouseLeave);
  }

  _toCanvas(clientX, clientY) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * this.canvas.width,
      y: ((clientY - rect.top) / rect.height) * this.canvas.height,
    };
  }

  /** True while the key is held. */
  isDown(code) {
    return this.down.has(code);
  }

  /** True only on the frame the key went down. */
  wasPressed(code) {
    return this.pressed.has(code);
  }

  /** Movement vector from WASD or arrows, normalised. */
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.hypot(x, y);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }

  /** Take and clear this frame's clicks. */
  takeClicks() {
    const out = this.clicks;
    this.clicks = [];
    return out;
  }

  /** Clear edge-triggered state at the end of a frame. */
  endFrame() {
    this.pressed.clear();
    this.clicks = [];
  }
}
