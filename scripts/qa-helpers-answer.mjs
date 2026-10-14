/**
 * `helpers` over HTTP — the six feel-good cards, recorded as a multi-select.
 * See `lib/multiselect-qa.mjs` for what is asserted and why.
 *
 * Run: node --env-file=<creds> scripts/qa-helpers-answer.mjs
 */
import { httpQa } from './lib/multiselect-qa.mjs'

process.exit(await httpQa({ slug: 'helpers', key: 'onboarding.helpers', optionSelector: '.ob-fc' }))
