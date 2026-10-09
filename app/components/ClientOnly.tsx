import { useEffect, useState, type ReactNode } from "react";

/**
 * Renders `fallback` during SSR + first client render, then swaps to `children`
 * after `useEffect` has fired (i.e. once we know we are on the client).
 *
 * Use this to wrap any subtree that touches `window`, `document`, canvas
 * measurement, or other browser-only APIs at render time — most commonly
 * echarts and other DOM-measuring charting libraries.
 */
export function ClientOnly({
  children,
  fallback = null,
}: {
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted ? <>{children}</> : <>{fallback}</>;
}
