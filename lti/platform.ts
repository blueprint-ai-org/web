// Read-only view of ltijs's registered-platform record. Centralizes access
// to issuer/client_id/auth-endpoint/JWKS-URL so the cookieless handlers
// don't need to know about ltijs's internal Platform class.

export interface PlatformConfig {
  iss: string
  clientId: string
  authEndpoint: string
  tokenEndpoint: string
  jwksUrl: string
}

/**
 * Look up a registered platform by (issuer, clientId) and return the
 * fields the cookieless OIDC flow needs. Throws a descriptive error if
 * no platform is registered for that pair.
 */
export async function getPlatformConfig(
  iss: string,
  clientId: string
): Promise<PlatformConfig> {
  // Lazy import: lti/provider.ts throws on missing env and dials Mongo at
  // import time, which would make every module in this chain untestable
  // without a live database.
  const { ltiProvider } = await import('./provider.js')
  const platform = await (ltiProvider as any).getPlatform(iss, clientId)
  if (!platform) {
    throw new Error(
      `getPlatformConfig: no platform registered for iss=${iss} clientId=${clientId}`
    )
  }

  const authEndpoint: string = await platform.platformAuthEndpoint()
  const tokenEndpoint: string = await platform.platformAccessTokenEndpoint()
  const authConfig: { method: string; key: string } = await platform.platformAuthConfig()

  if (!authConfig || authConfig.method !== 'JWK_SET' || !authConfig.key) {
    throw new Error(
      `getPlatformConfig: platform iss=${iss} clientId=${clientId} has unsupported authConfig (only JWK_SET supported in cookieless flow)`
    )
  }

  return {
    iss,
    clientId,
    authEndpoint,
    tokenEndpoint,
    jwksUrl: authConfig.key,
  }
}
