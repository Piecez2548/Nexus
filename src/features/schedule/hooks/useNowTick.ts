import { useEffect, useState } from "react";

const TICK_MS = 30_000;

// Returns a Date that updates every 30s, so components deriving "current
// activity" from it stay live while the page/dashboard panel sits open —
// unlike Calendar's old dashboard panel (a static list of upcoming items),
// "current activity" genuinely goes stale without a live clock.
export function useNowTick(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  return now;
}
