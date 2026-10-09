// Shared `lti-claims` cookie signer. Used by both the legacy ltijs cookie
// path (lti.onConnect in provider.ts) and the new cookieless validate
// handler (handleValidate in cookieless.ts). Single source of truth for the
// JWT shape and cookie attributes consumed by app/lib/lti-session.server.ts.
import { SignJWT } from 'jose'
import type { Response } from 'express'

const ltiSecret = new TextEncoder().encode(process.env.LTI_KEY ?? '')

/**
 * Sign the post-validation `token` payload as an HS256 JWT and set the
 * `lti-claims` cookie on `res`. Mirrors the original inline implementation
 * that lived in lti.onConnect (provider.ts).
 *
 * Returns the signed JWT so callers can also embed it in a redirect URL
 * (the cookieless `?lti_session=` URL-token path used to bypass Safari
 * ITP). Callers that only want the cookie side effect can ignore the
 * return value.
 */
export async function signLtiClaimsCookie(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  token: any,
  res: Response
): Promise<string> {
  const jwt = await new SignJWT({ token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(ltiSecret)
  res.cookie('lti-claims', jwt, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: 60 * 60 * 1000,
  })
  return jwt
}
