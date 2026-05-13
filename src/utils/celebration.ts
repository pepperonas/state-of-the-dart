// Lazy wrapper around canvas-confetti so the ~25 KB module is only fetched
// when the first celebration actually triggers, not at app bootstrap.

type ConfettiOptions = import('canvas-confetti').Options;
type ConfettiFn = (opts?: ConfettiOptions) => Promise<undefined> | null;

let modulePromise: Promise<ConfettiFn> | null = null;

function loadConfetti(): Promise<ConfettiFn> {
  if (!modulePromise) {
    modulePromise = import('canvas-confetti').then((m) => (m as { default: ConfettiFn }).default);
  }
  return modulePromise;
}

export function celebrate(options?: ConfettiOptions): void {
  void loadConfetti().then((confetti) => {
    confetti(options);
  });
}
