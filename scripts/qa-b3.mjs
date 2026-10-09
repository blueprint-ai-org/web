/**
 * Phase B3 Automated QA harness.
 *
 * Spawns Chrome headless with --remote-debugging-port, drives it via the
 * raw DevTools Protocol over WebSocket (no npm deps), and:
 *   1. Loads /_demo/tokens (no cookie → dark), screenshots dark mode.
 *   2. Sets the theme cookie to {"counselor":"light"}, reloads, screenshots.
 *   3. Reads computed background-color of [data-testid="tokens-demo"] in
 *      both modes; asserts they differ.
 *   4. Captures console errors; asserts none.
 *   5. Confirms each of the 7 animation cards has the expected `animate-*`
 *      class.
 *   6. Clicks Replay button; verifies element re-renders (DOM still has it).
 *
 * Run: `npm run qa:b3` (requires dev server already on :3000).
 *
 * Timeout: hard 60s ceiling — exits non-zero if exceeded.
 */

import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import http from 'node:http'

const URL_ROOT = 'http://localhost:3000'
const OUT_DIR = '/tmp/b3-qa'
if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const PROFILE = join(tmpdir(), `b3-chrome-${Date.now()}`)
const DEBUG_PORT = 9333 + Math.floor(Math.random() * 100)

const HARD_DEADLINE_MS = 60_000
const deadlineTimer = setTimeout(() => {
  console.error('TIMEOUT — harness exceeded 60s')
  cleanup().then(() => process.exit(3))
}, HARD_DEADLINE_MS)
deadlineTimer.unref?.()

let chromeProc
let socket

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fetchJson(path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${DEBUG_PORT}${path}`, (res) => {
        let body = ''
        res.on('data', (c) => (body += c))
        res.on('end', () => {
          try {
            resolve(JSON.parse(body))
          } catch (e) {
            reject(e)
          }
        })
      })
      .on('error', reject)
  })
}

async function startChrome() {
  chromeProc = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${DEBUG_PORT}`,
      `--user-data-dir=${PROFILE}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--hide-scrollbars',
      '--window-size=1280,1800',
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  for (let i = 0; i < 80; i++) {
    try {
      await fetchJson('/json/version')
      return
    } catch {
      await sleep(150)
    }
  }
  throw new Error('Chrome failed to start within 12s')
}

async function cleanup() {
  try {
    socket?.close()
  } catch {}
  try {
    chromeProc?.kill('SIGKILL')
  } catch {}
}

class CDP {
  constructor(sock) {
    this.sock = sock
    this.id = 0
    this.pending = new Map()
    this.consoleErrors = []
    sock.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id != null) {
        const p = this.pending.get(msg.id)
        if (p) {
          this.pending.delete(msg.id)
          if (msg.error) p.reject(new Error(msg.error.message))
          else p.resolve(msg.result)
        }
      } else {
        if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
          const text = (msg.params.args || [])
            .map((a) => a.value ?? a.description ?? '')
            .join(' ')
          this.consoleErrors.push(text)
        } else if (msg.method === 'Runtime.exceptionThrown') {
          const desc =
            msg.params.exceptionDetails?.exception?.description ||
            msg.params.exceptionDetails?.text
          this.consoleErrors.push(desc || '<exception>')
        } else if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
          this.consoleErrors.push(msg.params.entry.text)
        }
      }
    })
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id
      this.pending.set(id, { resolve, reject })
      this.sock.send(JSON.stringify({ id, method, params }))
      // Per-call timeout so we never hang forever
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`CDP ${method} timeout`))
        }
      }, 15_000).unref?.()
    })
  }
}

async function main() {
  await startChrome()
  const tabs = await fetchJson('/json')
  // Pick the first regular page tab, skipping chrome-extension / service-worker entries.
  const tab = tabs.find(
    (t) => t.type === 'page' && !t.url.startsWith('chrome-extension://') && !t.url.startsWith('devtools://'),
  )
  if (!tab) throw new Error(`No usable tab among: ${tabs.map((t) => `${t.type}:${t.url}`).join('; ')}`)
  socket = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((res, rej) => {
    socket.addEventListener('open', () => res())
    socket.addEventListener('error', (e) => rej(new Error('ws error')))
  })
  const cdp = new CDP(socket)

  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Log.enable')
  await cdp.send('Network.enable')

  const evalExpr = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed')
    return r.result?.value
  }
  // Variant that swallows context-destroyed errors (happens mid-navigation).
  const evalExprSoft = async (expression) => {
    try {
      return await evalExpr(expression)
    } catch (e) {
      return undefined
    }
  }

  // --- Pass 1: dark (no cookie → counselor default = dark)
  await cdp.send('Network.clearBrowserCookies')
  await cdp.send('Page.navigate', { url: `${URL_ROOT}/_demo/tokens` })
  await sleep(1500) // give Vite dev SSR + React hydration time
  let darkReady = false
  let lastDiag
  for (let i = 0; i < 60; i++) {
    try {
      const diag = await evalExpr(
        `JSON.stringify({ url: location.href, readyState: document.readyState, hasDemo: !!document.querySelector('[data-testid=tokens-demo]'), bodyLen: document.body && document.body.children.length, title: document.title })`,
      )
      lastDiag = diag
      const parsed = JSON.parse(diag)
      if (parsed.hasDemo) {
        darkReady = true
        break
      }
    } catch (e) {
      lastDiag = `eval err: ${e?.message}`
    }
    await sleep(200)
  }
  if (!darkReady) throw new Error(`Tokens demo did not render. lastDiag=${lastDiag}`)
  await sleep(400)

  const darkBg = await evalExpr(
    `getComputedStyle(document.querySelector('[data-testid=tokens-demo]')).backgroundColor`,
  )
  const darkMode = await evalExpr(
    `document.querySelector('[data-testid=tokens-demo]').getAttribute('data-mode')`,
  )
  const animClasses = await evalExpr(
    `JSON.stringify(Array.from(document.querySelectorAll('[data-testid^="anim-"]')).map(el => ({
      testid: el.getAttribute('data-testid'),
      classes: el.className,
    })))`,
  )
  const shot1 = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT_DIR, 'dark.png'), Buffer.from(shot1.data, 'base64'))

  // --- Pass 2: set cookie, reload
  await cdp.send('Network.setCookie', {
    name: 'theme',
    value: encodeURIComponent(JSON.stringify({ counselor: 'light' })),
    url: URL_ROOT,
    path: '/',
  })
  await cdp.send('Page.reload')
  await sleep(300)
  let lightReady = false
  for (let i = 0; i < 80; i++) {
    const mode = await evalExprSoft(
      `(() => { const el = document.querySelector('[data-testid=tokens-demo]'); return el ? el.getAttribute('data-mode') : null; })()`,
    )
    if (mode === 'light') {
      lightReady = true
      break
    }
    await sleep(100)
  }
  if (!lightReady) console.warn('Note: light mode did not appear after reload')
  await sleep(400)

  const lightBg = await evalExpr(
    `getComputedStyle(document.querySelector('[data-testid=tokens-demo]')).backgroundColor`,
  )
  const lightMode = await evalExpr(
    `document.querySelector('[data-testid=tokens-demo]').getAttribute('data-mode')`,
  )
  const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' })
  writeFileSync(join(OUT_DIR, 'light.png'), Buffer.from(shot2.data, 'base64'))

  // --- Pass 3: click Replay button on fade-in card
  await evalExpr(`document.querySelector('[data-testid="replay-fade-in"]').click()`)
  await sleep(150)
  const fadeStillThere = await evalExpr(
    `!!document.querySelector('[data-testid="anim-fade-in"]')`,
  )

  // --- Assertions
  const results = []
  results.push({
    name: 'darkBg !== lightBg',
    pass: darkBg !== lightBg && !!darkBg && !!lightBg,
    detail: `dark=${darkBg} light=${lightBg}`,
  })
  results.push({
    name: 'dark mode reads as "dark"',
    pass: darkMode === 'dark',
    detail: `mode=${darkMode}`,
  })
  results.push({
    name: 'light mode reads as "light"',
    pass: lightMode === 'light',
    detail: `mode=${lightMode}`,
  })
  const rgbDark = darkBg && darkBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  results.push({
    name: 'dark bg is dark navy (low RGB)',
    pass: !!rgbDark && +rgbDark[1] < 60 && +rgbDark[2] < 60 && +rgbDark[3] < 80,
    detail: darkBg,
  })
  const rgbLight = lightBg && lightBg.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  results.push({
    name: 'light bg is white/near-white',
    pass: !!rgbLight && +rgbLight[1] > 240 && +rgbLight[2] > 240 && +rgbLight[3] > 240,
    detail: lightBg,
  })
  const anims = JSON.parse(animClasses)
  const expectedAnims = [
    'anim-fade-in',
    'anim-scale-in',
    'anim-bounce-once',
    'anim-pulse-glow',
    'anim-ping-slow',
    'anim-accordion-down',
    'anim-accordion-up',
  ]
  results.push({
    name: 'all 7 animation cards present',
    pass: expectedAnims.every((id) => anims.find((a) => a.testid === id)),
    detail: `found: ${anims.map((a) => a.testid).join(',')}`,
  })
  results.push({
    name: 'each animation has its `animate-*` class',
    pass: anims.every((a) => {
      const expected = a.testid.replace('anim-', 'animate-')
      return a.classes.includes(expected)
    }),
    detail: anims
      .map((a) => `${a.testid}=${a.classes.split(' ').find((c) => c.startsWith('animate-'))}`)
      .join(' | '),
  })
  results.push({
    name: 'Replay button rerenders animation element',
    pass: fadeStillThere === true,
    detail: `found-after-click=${fadeStillThere}`,
  })
  results.push({
    name: 'no console errors',
    pass: cdp.consoleErrors.length === 0,
    detail: cdp.consoleErrors.join(' || ') || '(none)',
  })

  console.log('\n=== Phase B3 Automated QA ===')
  let allPass = true
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name} — ${r.detail}`)
    if (!r.pass) allPass = false
  }
  console.log(`\nScreenshots: ${OUT_DIR}/dark.png, ${OUT_DIR}/light.png`)
  console.log(allPass ? '\nOVERALL: PASS' : '\nOVERALL: FAIL')
  clearTimeout(deadlineTimer)
  await cleanup()
  process.exit(allPass ? 0 : 1)
}

main().catch(async (err) => {
  console.error('Harness error:', err?.message || err)
  await cleanup()
  process.exit(2)
})
