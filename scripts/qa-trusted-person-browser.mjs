/**
 * `trusted-person` in a real browser — clicking chips, pressing Next, reading
 * the row back from the gateway. See `lib/multiselect-qa.mjs`.
 *
 * Run: node --env-file=<creds> scripts/qa-trusted-person-browser.mjs
 */
import { browserQa } from './lib/multiselect-qa.mjs'

process.exit(await browserQa({ slug: 'trusted-person', key: 'onboarding.trusted_person', optionSelector: '.ob-pb' }))
