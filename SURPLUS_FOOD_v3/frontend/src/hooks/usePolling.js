import { useEffect, useRef, useCallback } from 'react';

/**
 * usePolling — Generic auto-refresh hook.
 *
 * @param {Function} fn          - Async function to call on each tick
 * @param {number}   intervalMs  - Polling interval in milliseconds (default 30s)
 * @param {boolean}  enabled     - Whether polling is active
 *
 * Behaviour:
 *  - Calls fn() immediately on mount
 *  - Then calls fn() every intervalMs
 *  - Clears the interval on unmount (no memory leaks)
 *  - Skips the tick if a previous call is still in flight (prevents pile-up)
 */
export function usePolling(fn, intervalMs = 30_000, enabled = true) {
  const fnRef      = useRef(fn);
  const inFlightRef = useRef(false);

  // Keep fnRef current without re-triggering the effect
  useEffect(() => { fnRef.current = fn; }, [fn]);

  useEffect(() => {
    if (!enabled) return;

    const tick = async () => {
      if (inFlightRef.current) return; // skip if already running
      inFlightRef.current = true;
      try {
        await fnRef.current();
      } finally {
        inFlightRef.current = false;
      }
    };

    // Fire immediately, then on interval
    tick();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs, enabled]);
}
