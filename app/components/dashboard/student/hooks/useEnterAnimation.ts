import { useEffect, useState } from "react";

/**
 * The prototype's universal "enter" idiom: an element mounts in its initial
 * (pre-animation) state, then a double-`requestAnimationFrame` flips it into the
 * animated state so the CSS transition actually fires (a single frame can be
 * coalesced with the initial paint). A second, later flag drives multi-phase
 * choreography — e.g. `s7-entered` → (300ms) → `s7-phase2`
 * (`onboarding.html:684-754`; the double-rAF pattern is documented in research
 * §D.5).
 *
 * Returns `{ entered, phase2 }`:
 *  - `entered` flips `true` on the second animation frame after mount;
 *  - `phase2` flips `true` `phase2Delay` ms after `entered`.
 *
 * Gate the hook with `enabled` (e.g. only run the entry animation when arriving
 * via `bp_enter_anim` / navigation state); when `false` both flags return
 * `true` immediately so the element renders in its final state with no motion.
 */
export function useEnterAnimation(opts?: {
  enabled?: boolean;
  phase2Delay?: number;
}): { entered: boolean; phase2: boolean } {
  const enabled = opts?.enabled ?? true;
  const phase2Delay = opts?.phase2Delay ?? 300;

  const [entered, setEntered] = useState(!enabled);
  const [phase2, setPhase2] = useState(!enabled);

  useEffect(() => {
    if (!enabled) return;
    let raf1 = 0;
    let raf2 = 0;
    let timer = 0;

    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        setEntered(true);
        timer = window.setTimeout(() => setPhase2(true), phase2Delay);
      });
    });

    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      window.clearTimeout(timer);
    };
  }, [enabled, phase2Delay]);

  return { entered, phase2 };
}
