// Deployment-scoped claim checks for a verified LTI 1.3 id_token.
//
// jose's jwtVerify covers signature + iss + aud + exp/nbf/iat, and verify.ts
// covers `nonce`. Everything below is the part the spec puts on the *tool*:
//
//   - `deployment_id` (LTI 1.3 core §4.2) identifies which deployment of the
//     tool inside the platform produced the launch. A token minted for a
//     deployment we never registered must not open a session, otherwise any
//     issuer/client pair on file can launch as any deployment.
//   - `message_type` must be one we actually implement; an unknown or absent
//     type means we would build a platform token out of claims that were
//     never meant for a resource-link launch.
//   - `azp` (OIDC core §2) names the authorized party when the token has
//     multiple audiences. When present it MUST equal our client_id.
//
// Before this module existed, `deploymentId` and `messageType` were read off
// the payload in cookieless.ts::buildPlatformToken and never compared to
// anything.
import type { JWTPayload } from 'jose'

export const CLAIM_DEPLOYMENT_ID =
  'https://purl.imsglobal.org/spec/lti/claim/deployment_id'
export const CLAIM_MESSAGE_TYPE =
  'https://purl.imsglobal.org/spec/lti/claim/message_type'

/** Message types this tool serves. Keep in sync with tool-config.ts. */
export const SUPPORTED_MESSAGE_TYPES = ['LtiResourceLinkRequest'] as const

export interface LaunchClaimExpectations {
  /** Our client_id for this platform — `azp`, when present, must equal it. */
  clientId: string
  /**
   * Deployment ids this tool accepts. Empty/undefined means "any non-empty
   * id", which is the pre-registration dev posture; set
   * LTI_ALLOWED_DEPLOYMENT_IDS in prod to pin it.
   */
  allowedDeploymentIds?: readonly string[]
  /** Defaults to SUPPORTED_MESSAGE_TYPES. */
  allowedMessageTypes?: readonly string[]
}

/**
 * Read the deployment allowlist from the environment. Comma-separated;
 * whitespace tolerated. Returns an empty array when unset.
 */
export function allowedDeploymentIdsFromEnv(): string[] {
  return (process.env.LTI_ALLOWED_DEPLOYMENT_IDS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

/**
 * Throws when the verified payload does not belong to a deployment/message
 * shape we accept. Callers turn the throw into a 401.
 */
export function assertLaunchClaims(
  payload: JWTPayload,
  expected: LaunchClaimExpectations
): void {
  const deploymentId = payload[CLAIM_DEPLOYMENT_ID]
  if (typeof deploymentId !== 'string' || deploymentId.length === 0) {
    throw new Error('assertLaunchClaims: missing deployment_id claim')
  }
  const allowed = expected.allowedDeploymentIds ?? []
  if (allowed.length > 0 && !allowed.includes(deploymentId)) {
    throw new Error(
      `assertLaunchClaims: unexpected deployment_id "${deploymentId}"`
    )
  }

  const messageType = payload[CLAIM_MESSAGE_TYPE]
  const allowedTypes = expected.allowedMessageTypes ?? SUPPORTED_MESSAGE_TYPES
  if (typeof messageType !== 'string' || !allowedTypes.includes(messageType)) {
    throw new Error(
      `assertLaunchClaims: unsupported message_type "${String(messageType)}"`
    )
  }

  // `azp` is optional for a single-audience token but mandatory-to-match when
  // present, and required by OIDC whenever `aud` carries more than one value.
  const azp = payload.azp
  if (azp !== undefined) {
    if (typeof azp !== 'string' || azp !== expected.clientId) {
      throw new Error(`assertLaunchClaims: azp mismatch (got "${String(azp)}")`)
    }
  } else if (Array.isArray(payload.aud) && payload.aud.length > 1) {
    throw new Error('assertLaunchClaims: azp required for multi-audience token')
  }
}
