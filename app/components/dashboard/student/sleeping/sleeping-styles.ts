/**
 * Scoped CSS for the sleeping gate — the three looping animations ported 1:1
 * from `sleeping.html`'s `<style>` block (`:28-86`):
 *
 *  - `sl-moon-orbit` — the moon's slow 12s elliptical drift behind the circle.
 *  - `sl-float` — the 3.5s vertical bob shared by the float wrapper (circle +
 *    eyes) and the title/bubble content.
 *  - `sl-eye-close` — animates each eye's lighter ellipse `cy` presentation
 *    attribute (134.703px → 154px) so the highlight slides down and the eyes
 *    read as drifting shut. CSS keyframes can animate SVG geometry attributes
 *    like `cy`, so this stays a faithful 1:1 port of the prototype.
 *
 * Class names are namespaced `sl-*` so they cannot collide with anything in
 * `app.css` or a sibling page's scoped block. Only the `@keyframes` and their
 * one-line animation bindings live here; all geometry stays inline on the JSX.
 *
 * NOTE: never place a backtick inside this template literal — it terminates the
 * string and breaks the build.
 */

export const SLEEPING_CSS = `
@keyframes sl-moon-orbit {
  0%   { transform: translate(0, 0); }
  25%  { transform: translate(-18px, 14px); }
  50%  { transform: translate(-30px, 0); }
  75%  { transform: translate(-18px, -14px); }
  100% { transform: translate(0, 0); }
}

@keyframes sl-float {
  from { transform: translateY(0); }
  to   { transform: translateY(-22px); }
}

@keyframes sl-eye-close {
  from { cy: 134.703px; }
  to   { cy: 154px; }
}

.sl-moon { animation: sl-moon-orbit 12s linear infinite; }
.sl-float { animation: sl-float 3.5s ease-in-out infinite alternate; }
.sl-eye-light { animation: sl-eye-close 2.8s ease-in-out infinite alternate; }
`
