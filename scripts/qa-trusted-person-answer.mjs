/**
 * `trusted-person` over HTTP — the person chips, recorded as a multi-select.
 * See `lib/multiselect-qa.mjs`.
 *
 * Run: node --env-file=<creds> scripts/qa-trusted-person-answer.mjs
 */
import { httpQa } from './lib/multiselect-qa.mjs'

process.exit(await httpQa({ slug: 'trusted-person', order: 4, optionSelector: '.ob-pb' }))
