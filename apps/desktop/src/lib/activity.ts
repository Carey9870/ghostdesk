// path: apps/desktop/src/lib/activity.ts
// purpose: Tracks real user activity for the auto-lock. Long-running work (imports, exports, media playback) registers a "hold" so it counts as activity.
const EVENTS: (keyof WindowEventMap)[] = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll', 'focus'];

class ActivityTracker {
  private last = Date.now();
  private holds = 0;

  constructor() {
    for (const e of EVENTS) window.addEventListener(e, () => this.touch(), { passive: true, capture: true });
  }

  touch(): void { this.last = Date.now(); }

  /** Marks ongoing work as activity. Call the returned function when the work ends. */
  hold(): () => void {
    this.holds += 1;
    this.touch();
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.holds = Math.max(0, this.holds - 1);
      this.touch();
    };
  }

  /** Milliseconds without activity; always 0 while any hold is active. */
  idleMs(): number { return this.holds > 0 ? 0 : Date.now() - this.last; }
}

export const activity = new ActivityTracker();
