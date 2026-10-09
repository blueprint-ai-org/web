/**
 * `/parent` — Parent persona placeholder.
 *
 * Renders `ParentPlaceholder`. The full Understanding / Guidance / Chat
 * dashboard from the prototype is a separate follow-up plan; this route
 * exists so users classified as `parent` (LTI Mentor role) land somewhere
 * coherent instead of `/unsupported-role`.
 *
 * The persona layout (`_persona.tsx`) owns the LTI session gate, theme-mode
 * cookie read, `CanvasHeader`, and the `frame-ancestors` CSP — this route
 * is just the content slot.
 */

import { ParentPlaceholder } from '~/components/dashboard/ParentPlaceholder'

export function meta() {
  return [
    { title: 'Parent · Blueprint' },
    { name: 'description', content: 'Parent wellbeing portal.' },
  ]
}

export default function ParentRoute() {
  return <ParentPlaceholder />
}
