/**
 * A browser, driven over the raw DevTools Protocol.
 *
 * The QA scripts that POST an action with `fetch` cannot see the path a student
 * actually takes: SSR markup is clickable a beat before React attaches to it,
 * a tab can be running a bundle older than the server, and a fetcher that never
 * fires leaves no trace anywhere — no request, no log, no error. Those are the
 * failures worth catching, and only a real browser catches them.
 *
 * No Playwright and no npm dependency: Chrome ships the protocol, and `spawn`
 * plus a `WebSocket` is the whole harness. Same approach as `qa-b3.mjs` and
 * `bp-admin`'s `qa-visual.mjs`.
 */

import { spawn } from 'node:child_process'
import http from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function fetchJson(port, path) {
  return new Promise((resolve, reject) => {
    http
      .get(`http://localhost:${port}${path}`, (res) => {
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

class CDP {
  constructor(sock) {
    this.sock = sock
    this.id = 0
    this.pending = new Map()
    /** Console errors and uncaught exceptions, in the order they happened. */
    this.consoleErrors = []
    /** Every request the page made, as `{ method, url }`. */
    this.requests = []
    /** Every response it received, as `{ url, status }`. */
    this.responses = []
    sock.addEventListener('message', (e) => {
      const msg = JSON.parse(e.data)
      if (msg.id != null) {
        const p = this.pending.get(msg.id)
        if (!p) return
        this.pending.delete(msg.id)
        if (msg.error) p.reject(new Error(msg.error.message))
        else p.resolve(msg.result)
        return
      }
      if (msg.method === 'Network.requestWillBeSent') {
        this.requests.push({ method: msg.params.request.method, url: msg.params.request.url })
      } else if (msg.method === 'Network.responseReceived') {
        this.responses.push({ url: msg.params.response.url, status: msg.params.response.status })
      } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
        this.consoleErrors.push((msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' '))
      } else if (msg.method === 'Runtime.exceptionThrown') {
        const d = msg.params.exceptionDetails
        this.consoleErrors.push(d?.exception?.description ?? d?.text ?? '<exception>')
      }
    })
  }

  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id
      this.pending.set(id, { resolve, reject })
      this.sock.send(JSON.stringify({ id, method, params }))
      setTimeout(() => {
        if (this.pending.has(id)) {
          this.pending.delete(id)
          reject(new Error(`CDP ${method} timeout`))
        }
      }, 15_000).unref?.()
    })
  }
}

/**
 * Start headless Chrome and attach to its first tab.
 *
 * Returns the raw `cdp` alongside the handful of helpers every QA script here
 * needs. `close()` is safe to call twice; call it on every exit path, since a
 * leaked Chrome outlives the script that spawned it.
 */
export async function openBrowser({ port = 9400 + (process.pid % 100), windowSize = '1280,900' } = {}) {
  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${join(tmpdir(), `qa-chrome-${process.pid}`)}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      '--disable-extensions',
      '--disable-background-networking',
      '--hide-scrollbars',
      `--window-size=${windowSize}`,
      'about:blank',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )

  let tabs = null
  for (let i = 0; i < 80; i++) {
    try {
      await fetchJson(port, '/json/version')
      tabs = await fetchJson(port, '/json')
      break
    } catch {
      await sleep(150)
    }
  }
  if (!tabs) {
    chrome.kill('SIGKILL')
    throw new Error('Chrome did not start within 12s')
  }

  const tab = tabs.find((t) => t.type === 'page' && !t.url.startsWith('devtools://'))
  if (!tab) {
    chrome.kill('SIGKILL')
    throw new Error(`no usable tab among: ${tabs.map((t) => `${t.type}:${t.url}`).join('; ')}`)
  }

  const socket = new WebSocket(tab.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', () => resolve())
    socket.addEventListener('error', () => reject(new Error('could not open the DevTools socket')))
  })

  const cdp = new CDP(socket)
  await cdp.send('Page.enable')
  await cdp.send('Runtime.enable')
  await cdp.send('Network.enable')

  /** Evaluate an expression in the page and return its value. */
  const evaluate = async (expression) => {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.text || 'eval failed')
    return r.result?.value
  }

  return {
    cdp,
    evaluate,
    requests: cdp.requests,
    responses: cdp.responses,
    consoleErrors: cdp.consoleErrors,
    /** Send a cookie the way the browser would have stored it from a login. */
    setCookie: (raw, domain = 'localhost') => {
      const [name, ...rest] = raw.split('=')
      return cdp.send('Network.setCookie', { name, value: rest.join('='), domain, path: '/' })
    },
    navigate: (url) => cdp.send('Page.navigate', { url }),
    /**
     * Press a key as the browser itself, not as a synthetic event: a
     * `dispatchEvent(new KeyboardEvent(...))` reaches React, but `isTrusted`
     * is false and anything guarding on it silently ignores the press.
     */
    pressKey: async (key, keyCode) => {
      for (const type of ['rawKeyDown', 'keyUp']) {
        await cdp.send('Input.dispatchKeyEvent', {
          type,
          key,
          code: key,
          windowsVirtualKeyCode: keyCode,
          nativeVirtualKeyCode: keyCode,
        })
      }
    },
    /** Wait for React to own the DOM node `selector` names — not just for SSR to have drawn it. */
    waitForHydration: async (selector, tries = 60) => {
      for (let i = 0; i < tries; i++) {
        await sleep(300)
        try {
          const ready = await evaluate(`(() => {
            const el = document.querySelector(${JSON.stringify(selector)});
            // React attaches a fiber to every host node it owns; SSR markup has none.
            return !!el && Object.keys(el).some((k) => k.startsWith('__reactFiber$'));
          })()`)
          if (ready) return true
        } catch {
          // Navigation destroys the execution context; try again.
        }
      }
      return false
    },
    close: () => {
      try {
        socket.close()
      } catch {}
      try {
        chrome.kill('SIGKILL')
      } catch {}
    },
  }
}

/** A tiny check/report helper, shared so every QA script reads the same. */
export function createChecklist() {
  const state = { failures: 0 }
  return {
    check(label, ok, detail = '') {
      console.log(`  ${ok ? '✔' : '✘'} ${label}${ok || !detail ? '' : ` — ${detail}`}`)
      if (!ok) state.failures++
    },
    get failures() {
      return state.failures
    },
    finish() {
      console.log(state.failures === 0 ? '\n✔ all checks passed\n' : `\n✘ ${state.failures} check(s) failed\n`)
      return state.failures === 0 ? 0 : 1
    },
  }
}
