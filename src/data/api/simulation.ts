/**
 * Knobs for the simulated network, exposed so the UI can drive them.
 *
 * The point is not novelty - it is that loading skeletons, retry buttons and
 * error boundaries are impossible to demonstrate against an API that always
 * succeeds in 0 ms. Being able to turn on failures from inside the running app
 * means the states can actually be shown to someone, rather than described.
 */
export interface SimulationSettings {
  /** Lower and upper bound of the artificial round trip, in milliseconds. */
  latency: [number, number];
  /** Probability that any given request rejects, 0-1. */
  failureRate: number;
}

const DEFAULT_SETTINGS: SimulationSettings = {
  latency: [180, 520],
  failureRate: 0,
};

let settings: SimulationSettings = { ...DEFAULT_SETTINGS };

const listeners = new Set<() => void>();

/** `useSyncExternalStore` contract: subscribe returns its own unsubscriber. */
export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Must return a stable reference while unchanged, or React will loop. */
export function getSettings(): SimulationSettings {
  return settings;
}

export function setSettings(patch: Partial<SimulationSettings>): void {
  settings = { ...settings, ...patch };
  for (const listener of listeners) listener();
}

export function resetSettings(): void {
  setSettings(DEFAULT_SETTINGS);
}

/** Raised by the API layer when a simulated request fails. */
export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

/**
 * Resolves after a plausible round trip, or rejects if the caller aborts or
 * the dice come up against us. Honouring `AbortSignal` matters: without it,
 * a superseded request still resolves and can overwrite fresher data.
 */
export function simulateNetwork(signal?: AbortSignal): Promise<void> {
  const { latency, failureRate } = settings;
  const [min, max] = latency;
  const delay = min + Math.random() * Math.max(0, max - min);

  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException('Aborted', 'AbortError'));
      return;
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      if (Math.random() < failureRate) {
        reject(new ApiError('The kitchen service is not responding.', 503));
        return;
      }
      resolve();
    }, delay);

    function onAbort(): void {
      clearTimeout(timer);
      reject(new DOMException('Aborted', 'AbortError'));
    }

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
