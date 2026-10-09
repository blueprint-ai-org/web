import http from 'node:http'
import type { NextFunction, Request, Response } from 'express'
import { Registry, collectDefaultMetrics, Gauge, Histogram } from 'prom-client'

type RouteManifest = Record<string, { parentId?: string; path?: string } | undefined>

export const healthPaths = ['/api/health/startup', '/api/health/liveness', '/api/health/readiness']

const registry = new Registry()
registry.setDefaultLabels({ app_process_name: 'web' })
collectDefaultMetrics({ register: registry })

new Gauge({ name: 'up', help: 'Service is up', registers: [registry] }).set(1)

const httpDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
})

// `path` is the request's top-level route segment, so its values are bounded by the route table.
function topLevelSegments(routes: RouteManifest): Set<string> {
  const fullPath = (id: string | undefined): string => {
    const route = id === undefined ? undefined : routes[id]
    return route ? [fullPath(route.parentId), route.path].filter(Boolean).join('/') : ''
  }
  const segments = Object.keys(routes).map((id) => fullPath(id).split('/')[0] ?? '')
  return new Set([...segments, 'assets', '__manifest', '_root'])
}

export function measureRequests(routes: RouteManifest) {
  const segments = topLevelSegments(routes)
  const label = (url: string): string => {
    const path = url.split('?')[0] ?? ''
    if (healthPaths.includes(path)) return path
    const segment = (path.split('/')[1] ?? '').replace(/\.data$/, '')
    return segments.has(segment) ? `/${segment}` : 'other'
  }
  return (req: Request, res: Response, next: NextFunction) => {
    const end = httpDuration.startTimer({ method: req.method })
    res.on('finish', () => end({ path: label(req.originalUrl), status_code: String(res.statusCode) }))
    next()
  }
}

// Served on its own port, which the Kubernetes Service does not publish: Prometheus reaches it
// through the Istio sidecar's merged endpoint, the internet never does.
export function listenMetrics(port: number): http.Server {
  return http
    .createServer(async (req, res) => {
      if (req.method === 'GET' && req.url?.split('?')[0] === '/metrics') {
        res.writeHead(200, { 'Content-Type': registry.contentType })
        res.end(await registry.metrics())
        return
      }
      res.writeHead(404)
      res.end('Not Found')
    })
    .listen(port, () => console.log(`metrics listening on :${port}`))
}
