export class InputManager {
  constructor() {
    this.keys = new Set();
    this.once = new Set();

    window.addEventListener('keydown', (e) => {
      if (!this.keys.has(e.code)) this.once.add(e.code);
      this.keys.add(e.code);
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
      this.once.delete(e.code);
    });
  }

  isDown(code) {
    return this.keys.has(code);
  }

  consume(code) {
    if (!this.once.has(code)) return false;
    this.once.delete(code);
    return true;
  }
}
