/**
 * `helpers` in a real browser — clicking cards, pressing Next, reading the row
 * back from the gateway. See `lib/multiselect-qa.mjs`.
 *
 * Run: node --env-file=<creds> scripts/qa-helpers-browser.mjs
 */
import { browserQa } from './lib/multiselect-qa.mjs'

process.exit(await browserQa({ slug: 'helpers', order: 3, optionSelector: '.ob-fc' }))
