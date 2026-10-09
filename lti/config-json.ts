// Serves the Canvas LTI 1.3 tool configuration JSON.
//
// District admins paste the contents of this URL into Canvas:
//   Admin → Developer Keys → +LTI Key → Method: Paste JSON.
//
// All URLs in the response are derived from `PUBLIC_BASE_URL` (env), falling
// back to the inbound request's `host` header. This means the same code works
// in dev (localhost), preview deploys, and prod without per-environment edits
// to a static JSON file.
//
// The placement payload itself lives in `lti/tool-config.ts` so the upcoming
// `/lti/register` (LTI Dynamic Registration) handler reuses the exact same
// shape and the two install paths cannot drift.
import type { Request, Response } from 'express'
import { buildToolConfig } from './tool-config.js'

function resolveBaseUrl(req: Request): string {
  const fromEnv = process.env.PUBLIC_BASE_URL?.trim().replace(/\/$/, '')
  if (fromEnv) return fromEnv
  // Trust the proxy chain in front of us (Railway, Cloudflare). server.ts
  // does not call `app.set('trust proxy', ...)`, but req.protocol on Railway
  // resolves to 'https' via X-Forwarded-Proto in practice. Fall back to
  // 'https' explicitly to avoid handing Canvas an http:// URL.
  const proto = (req.headers['x-forwarded-proto'] as string)?.split(',')[0] || 'https'
  const host = req.headers['x-forwarded-host'] || req.headers.host
  return `${proto}://${host}`
}

export function handleLtiConfigJson(req: Request, res: Response): void {
  const config = buildToolConfig(resolveBaseUrl(req))
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=300')
  res.send(JSON.stringify(config, null, 2))
}
