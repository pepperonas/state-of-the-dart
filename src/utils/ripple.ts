/**
 * Material 3 Expressive — ripple.
 *
 * One delegated `pointerdown` listener for the whole document. Any element
 * carrying `.m3-ripple` gets a wave that starts under the finger and grows past
 * the far corner, then removes itself. No per-component wiring, no React state,
 * no re-render: the wave lives in a throwaway holder element and is gone again a
 * few hundred milliseconds later.
 *
 * Why a holder instead of clipping the host: the host would need
 * `overflow: hidden`, which would also clip badges that sit on the corner of some
 * icon buttons. The holder clips itself and inherits the host's border radius.
 *
 * The styling lives in `src/styles/motion.css` (`.m3-ripple*`).
 */

/** Media query kept live so a mid-session preference change is respected. */
const reduceMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const isDisabled = (el: Element) =>
  (el as HTMLButtonElement).disabled === true ||
  el.getAttribute('aria-disabled') === 'true' ||
  el.hasAttribute('data-no-ripple');

const spawn = (host: HTMLElement, clientX: number, clientY: number) => {
  const rect = host.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return;

  // Grow to the furthest corner so the wave always covers the whole surface.
  const x = clientX - rect.left;
  const y = clientY - rect.top;
  const radius = Math.hypot(Math.max(x, rect.width - x), Math.max(y, rect.height - y));

  const holder = document.createElement('span');
  holder.className = 'm3-ripple-holder';
  holder.setAttribute('aria-hidden', 'true');

  const wave = document.createElement('span');
  wave.className = 'm3-ripple-wave';
  wave.style.width = `${radius * 2}px`;
  wave.style.height = `${radius * 2}px`;
  wave.style.left = `${x - radius}px`;
  wave.style.top = `${y - radius}px`;

  holder.appendChild(wave);
  host.appendChild(holder);

  // Belt and braces: `animationend` normally fires, but if React replaces the
  // subtree mid-flight the node is detached and the event never arrives — so a
  // timer sweeps up too. Removing twice is harmless.
  let cleaned = false;
  const remove = () => {
    if (cleaned) return;
    cleaned = true;
    holder.remove();
  };
  wave.addEventListener('animationend', remove, { once: true });
  window.setTimeout(remove, 900);
};

let initialised = false;

/** Install the delegated listener. Safe to call more than once. */
export function initRipple(): void {
  if (initialised || typeof document === 'undefined') return;
  initialised = true;

  document.addEventListener(
    'pointerdown',
    (event) => {
      // Primary button / touch / pen only — a right-click is not a press.
      if (event.button !== 0) return;
      if (reduceMotion()) return;

      const target = event.target as Element | null;
      const host = target?.closest?.('.m3-ripple') as HTMLElement | null;
      if (!host || isDisabled(host)) return;

      spawn(host, event.clientX, event.clientY);
    },
    // Passive: the ripple never blocks scrolling or the click that follows.
    { passive: true, capture: true }
  );
}
