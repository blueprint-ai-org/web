// jose-based id_token verifier for the cookieless OIDC launch path.
// Replaces what ltijs's internal Auth.validateToken does for the launches
// we now own end-to-end.
import { createRemoteJWKSet, jwtVerify, type JWTPayload, type JWTVerifyResult } from 'jose'
import {
  assertLaunchClaims,
  allowedDeploymentIdsFromEnv,
  type LaunchClaimExpectations,
} from './launch-claims.js'

export interface ExpectedClaims {
  iss: string
  aud: string
  nonce: string
  /**
   * Deployment-scoped claim checks (deployment_id / message_type / azp).
   * Optional so callers that only need signature+nonce (tests, tooling) can
   * opt out explicitly; the production path in cookieless.ts always passes it.
   */
  launch?: Omit<LaunchClaimExpectations, 'clientId'> & { clientId?: string }
}

/**
 * Resolve the launch-claim expectations for a given audience (= our
 * client_id), defaulting the deployment allowlist to the environment.
 */
function resolveLaunchExpectations(expected: ExpectedClaims): LaunchClaimExpectations {
  return {
    clientId: expected.launch?.clientId ?? expected.aud,
    allowedDeploymentIds:
      expected.launch?.allowedDeploymentIds ?? allowedDeploymentIdsFromEnv(),
    allowedMessageTypes: expected.launch?.allowedMessageTypes,
  }
}

function checkClaims(payload: JWTPayload, expected: ExpectedClaims): void {
  if (typeof payload.nonce !== 'string' || payload.nonce !== expected.nonce) {
    throw new Error('verifyIdToken: nonce mismatch')
  }
  if (expected.launch !== undefined) {
    assertLaunchClaims(payload, resolveLaunchExpectations(expected))
  }
}

// Module-level cache: one remote JWKS per JWKS URL, so we don't refetch
// Canvas's keys on every launch. createRemoteJWKSet handles its own
// in-memory caching with default cooldown / max-age.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

function getJWKS(jwksUrl: string) {
  let cached = jwksCache.get(jwksUrl)
  if (!cached) {
    cached = createRemoteJWKSet(new URL(jwksUrl))
    jwksCache.set(jwksUrl, cached)
  }
  return cached
}

/**
 * Verify an LTI 1.3 id_token against the platform's JWKS. Validates
 * signature, issuer, audience, expiry (jose enforces `exp`/`nbf`/`iat`),
 * and nonce; when `expected.launch` is present, also deployment_id,
 * message_type and azp (see launch-claims.ts). Returns the verified payload.
 *
 * Note: signature algorithm is fixed to RS256 because the LTI 1.3 spec
 * mandates it for id_tokens.
 */
export async function verifyIdToken(
  idToken: string,
  expected: ExpectedClaims,
  jwksUrl: string
): Promise<JWTPayload> {
  const jwks = getJWKS(jwksUrl)
  const result: JWTVerifyResult = await jwtVerify(idToken, jwks, {
    algorithms: ['RS256'],
    issuer: expected.iss,
    audience: expected.aud,
  })

  checkClaims(result.payload, expected)

  return result.payload
}

// Internal — exposed only for tests that need to verify against a local
// JWKS without going through createRemoteJWKSet's HTTP layer.
export async function _verifyIdTokenWithJWKS(
  idToken: string,
  expected: ExpectedClaims,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  keyOrJwks: any
): Promise<JWTPayload> {
  const result = await jwtVerify(idToken, keyOrJwks, {
    algorithms: ['RS256'],
    issuer: expected.iss,
    audience: expected.aud,
  })
  checkClaims(result.payload, expected)
  return result.payload
}
