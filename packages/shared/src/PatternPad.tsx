'use client';
// path: packages/shared/src/PatternPad.tsx
// purpose: Accessible 5x5 pattern grid (pointer, touch and keyboard) that reports the ordered list of selected cells.
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react';

const N = 5;

export interface PatternPadProps {
  onComplete: (sequence: number[]) => void;
  disabled?: boolean;
  /** Colour of selected dots and the connecting line. */
  accent?: string;
  /** Colour of unselected dots. */
  idle?: string;
  size?: number | string;
  label?: string;
}

export function PatternPad({
  onComplete, disabled = false, accent = '#22d3ee', idle = '#33415f', size = 300, label = 'Pattern grid. Use arrow keys to move, Space to select a dot, Enter to finish, Escape to clear.',
}: PatternPadProps) {
  const root = useRef<HTMLDivElement>(null);
  const drawing = useRef(false);
  const current = useRef<number[]>([]);
  const [seq, setSeq] = useState<number[]>([]);
  const [tail, setTail] = useState<[number, number] | null>(null);
  const [cursor, setCursor] = useState(12);
  const [focused, setFocused] = useState(false);

  const commit = (next: number[]) => { current.current = next; setSeq(next); };

  const hit = (e: PointerEvent) => {
    const r = root.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * N;
    const y = ((e.clientY - r.top) / r.height) * N;
    const i = Math.floor(x), j = Math.floor(y);
    const inside = i >= 0 && i < N && j >= 0 && j < N && Math.hypot(x - i - 0.5, y - j - 0.5) < 0.4;
    return { x, y, index: inside ? j * N + i : -1 };
  };

  const finish = () => {
    if (!drawing.current) return;
    drawing.current = false;
    setTail(null);
    const done = current.current.slice();
    if (done.length) onComplete(done);
    window.setTimeout(() => commit([]), 350);
  };

  const onDown = (e: PointerEvent) => {
    if (disabled) return;
    root.current!.setPointerCapture(e.pointerId);
    drawing.current = true;
    const h = hit(e);
    commit(h.index >= 0 ? [h.index] : []);
    setTail([h.x, h.y]);
  };
  const onMove = (e: PointerEvent) => {
    if (!drawing.current) return;
    const h = hit(e);
    if (h.index >= 0 && !current.current.includes(h.index)) commit([...current.current, h.index]);
    setTail([h.x, h.y]);
  };

  const onKey = (e: KeyboardEvent) => {
    if (disabled) return;
    const move = (d: number, wrap: boolean) => { if (wrap) setCursor((c) => c + d); e.preventDefault(); };
    if (e.key === 'ArrowRight' && cursor % N < N - 1) move(1, true);
    else if (e.key === 'ArrowLeft' && cursor % N > 0) move(-1, true);
    else if (e.key === 'ArrowDown' && cursor < N * (N - 1)) move(N, true);
    else if (e.key === 'ArrowUp' && cursor >= N) move(-N, true);
    else if (e.key === ' ') { e.preventDefault(); if (!current.current.includes(cursor)) commit([...current.current, cursor]); }
    else if (e.key === 'Enter') { e.preventDefault(); const done = current.current.slice(); if (done.length) onComplete(done); window.setTimeout(() => commit([]), 350); }
    else if (e.key === 'Escape') { e.preventDefault(); commit([]); }
  };

  const points = seq.map((i) => `${(i % N) + 0.5},${Math.floor(i / N) + 0.5}`);
  if (tail && drawing.current) points.push(`${tail[0]},${tail[1]}`);

  const wrap: CSSProperties = {
    position: 'relative', width: size, maxWidth: '100%', aspectRatio: '1', display: 'grid', gridTemplateColumns: `repeat(${N}, 1fr)`,
    touchAction: 'none', userSelect: 'none', outline: 'none', opacity: disabled ? 0.5 : 1,
  };

  return (
    <div
      ref={root} role="group" aria-label={label} tabIndex={disabled ? -1 : 0} style={wrap}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={finish} onPointerCancel={finish}
      onKeyDown={onKey} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    >
      <svg viewBox={`0 0 ${N} ${N}`} preserveAspectRatio="none" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <polyline points={points.join(' ')} fill="none" stroke={accent} strokeWidth={0.07} strokeLinecap="round" strokeLinejoin="round" opacity={0.85} />
      </svg>
      {Array.from({ length: N * N }, (_, i) => {
        const on = seq.includes(i);
        return (
          <div key={i} style={{ display: 'grid', placeItems: 'center' }}>
            <span
              style={{
                width: 14, height: 14, borderRadius: '50%', background: on ? accent : idle, transition: 'background .15s, box-shadow .15s',
                boxShadow: on ? `0 0 0 9px color-mix(in srgb, ${accent} 20%, transparent)` : undefined,
                outline: focused && i === cursor ? `2px solid ${accent}` : undefined, outlineOffset: 4,
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
