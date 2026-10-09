// Phase 0 contract spike for the BP AI GraphQL Gateway auth operations.
//
// Records what the API *actually* returns for signup / validateToken / login /
// refreshToken / logout, plus the three deliberate failure cases, so no later
// phase is built on the reference doc's prose.
//
// Run: cd lti-server-test && npx tsx scripts/bp-ai-auth-spike.ts
//      (optionally: BP_AI_SPIKE_OUT=/tmp/spike.json npx tsx scripts/bp-ai-auth-spike.ts)
//
// Requires BP_AI_GRAPHQL_URL in .env — see .env.example.
import 'dotenv/config'
import { writeFileSync } from 'node:fs'

const URL_ = process.env.BP_AI_GRAPHQL_URL
if (!URL_) {
  console.error('BP_AI_GRAPHQL_URL is not set. Add it to lti-server-test/.env — see .env.example.')
  process.exit(1)
}
const ENDPOINT: string = URL_

const EMAIL_DOMAIN = process.env.BP_AI_SPIKE_EMAIL_DOMAIN ?? 'example.com'
const stamp = Date.now()
const EMAIL = `bp-ai-spike-${stamp}@${EMAIL_DOMAIN}`
const PASSWORD = 'Spike-Passw0rd!'
const WRONG_PASSWORD = 'Definitely-Not-It!'
const NAME = 'Spike Tester'

type Json = Record<string, unknown>
type GqlBody = { data?: Json | null; errors?: unknown }
type StepRecord = {
  step: string
  intent: string
  request: { query: string; variables: Json; authorization: string | null }
  status: number | null
  body: unknown
  transportError?: string
}

const transcript: StepRecord[] = []

/** Raw POST to the gateway. Never throws — transport failures are recorded too. */
async function post(
  step: string,
  intent: string,
  query: string,
  variables: Json = {},
  accessToken?: string,
  quiet = false
): Promise<StepRecord> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`

  const record: StepRecord = {
    step,
    intent,
    request: { query, variables, authorization: accessToken ? 'Bearer <token>' : null },
    status: null,
    body: null,
  }

  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query, variables }),
    })
    record.status = res.status
    const text = await res.text()
    try {
      record.body = JSON.parse(text) as GqlBody
    } catch {
      record.body = { __unparsed: text.slice(0, 2000) }
    }
  } catch (err) {
    record.transportError = err instanceof Error ? err.message : String(err)
  }

  transcript.push(record)
  console.log(`\n──────── ${step} ────────`)
  console.log(intent)
  console.log(`HTTP ${record.status ?? 'transport-error'}${record.transportError ? ` — ${record.transportError}` : ''}`)
  // The introspection body is thousands of lines; it is summarised instead.
  console.log(quiet ? '[body omitted — see summary below]' : JSON.stringify(record.body, null, 2))
  return record
}

function dataOf(record: StepRecord): Json | null {
  const body = record.body as GqlBody | null
  const data = body?.data
  return data && typeof data === 'object' ? (data as Json) : null
}

function payloadOf(record: StepRecord, field: string): Json | null {
  const value = dataOf(record)?.[field]
  return value && typeof value === 'object' ? (value as Json) : null
}

function str(source: Json | null, key: string): string | undefined {
  const value = source?.[key]
  return typeof value === 'string' ? value : undefined
}

// ── Introspection ────────────────────────────────────────────────────────
// Field names are the whole point of this spike, so ask the schema directly
// rather than guessing a selection set from the reference doc's prose.

type IntrospectedField = { name: string; kind: string | null; typeName: string | null }

const AUTH_OPS = ['login', 'signup', 'refreshToken', 'logout', 'validateToken'] as const

const INTROSPECTION = `
query SpikeIntrospection {
  __schema {
    mutationType { name }
    types {
      name
      kind
      fields(includeDeprecated: true) {
        name
        args { name type { kind name ofType { kind name } } }
        type { kind name ofType { kind name ofType { kind name } } }
      }
    }
  }
}`

type TypeRef = { kind?: string; name?: string | null; ofType?: TypeRef | null }
type SchemaField = { name: string; args?: { name: string; type: TypeRef }[]; type: TypeRef }
type SchemaType = { name: string; kind: string; fields?: SchemaField[] | null }

function unwrap(ref: TypeRef | null | undefined): { kind: string | null; name: string | null } {
  let cursor: TypeRef | null | undefined = ref
  while (cursor && (cursor.kind === 'NON_NULL' || cursor.kind === 'LIST')) cursor = cursor.ofType
  return { kind: cursor?.kind ?? null, name: cursor?.name ?? null }
}

let schemaTypes: SchemaType[] = []

function typeByName(name: string | null): SchemaType | undefined {
  return name ? schemaTypes.find((t) => t.name === name) : undefined
}

/** Scalar/enum fields only — safe to request with no sub-selection. */
function scalarFields(typeName: string | null): IntrospectedField[] {
  const type = typeByName(typeName)
  if (!type?.fields) return []
  return type.fields
    .map((f) => {
      const t = unwrap(f.type)
      return { name: f.name, kind: t.kind, typeName: t.name }
    })
    .filter((f) => f.kind === 'SCALAR' || f.kind === 'ENUM')
}

/** Selection set for a mutation's return type; empty string when it returns a scalar. */
function selectionFor(opName: string, fallback: string): string {
  const returnType = mutationReturnType.get(opName)
  if (!returnType) return fallback
  if (returnType.kind === 'SCALAR' || returnType.kind === 'ENUM') return ''
  const fields = scalarFields(returnType.name).map((f) => f.name)
  return fields.length ? ` { ${fields.join(' ')} }` : fallback
}

const mutationReturnType = new Map<string, { kind: string | null; name: string | null }>()

async function introspect(): Promise<void> {
  const record = await post(
    '00 · introspection',
    'Dump the schema so every selection set below uses the real field names, not the doc’s prose.',
    INTROSPECTION,
    {},
    undefined,
    true
  )
  const schema = dataOf(record)?.__schema as { mutationType?: { name?: string }; types?: SchemaType[] } | undefined
  if (!schema?.types) {
    console.log('\n[introspection unavailable — falling back to the documented AuthPayload shape]')
    return
  }
  schemaTypes = schema.types
  const mutationTypeName = schema.mutationType?.name ?? 'Mutation'
  const mutation = typeByName(mutationTypeName)

  console.log('\n=== Auth operations, as the schema declares them ===')
  for (const op of AUTH_OPS) {
    const field = mutation?.fields?.find((f) => f.name === op)
    if (!field) {
      console.log(`${op}: NOT PRESENT on ${mutationTypeName}`)
      continue
    }
    const ret = unwrap(field.type)
    mutationReturnType.set(op, ret)
    const args = (field.args ?? []).map((a) => `${a.name}: ${unwrap(a.type).name ?? '?'}`).join(', ')
    console.log(`${op}(${args}): ${ret.name ?? ret.kind}`)
    if (ret.kind === 'OBJECT') {
      const fields = typeByName(ret.name)?.fields ?? []
      for (const f of fields) {
        const ft = unwrap(f.type)
        console.log(`    ${f.name}: ${ft.name ?? ft.kind}`)
      }
    }
  }
}

// ── The spike ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`BP AI auth contract spike`)
  console.log(`endpoint : ${ENDPOINT}`)
  console.log(`email    : ${EMAIL}`)

  await post('01 · health', 'Connectivity smoke test — the reference documents `health` as public.', 'query { health }')

  await introspect()

  const authSel = selectionFor('signup', ' { token refresh_token user_id tenant }')
  const loginSel = selectionFor('login', ' { token refresh_token user_id tenant }')
  const refreshSel = selectionFor('refreshToken', ' { token refresh_token user_id tenant }')
  const logoutSel = selectionFor('logout', '')
  const validateSel = selectionFor('validateToken', '')

  // --- Happy path -------------------------------------------------------
  const signup = await post(
    '02 · signup',
    'Register a throwaway account. Records the AuthPayload field names and which tenant a self-service signup lands in (the D7 assumption).',
    `mutation Signup($email: String!, $password: String!, $name: String!) { signup(email: $email, password: $password, name: $name)${authSel} }`,
    { email: EMAIL, password: PASSWORD, name: NAME }
  )
  const signupPayload = payloadOf(signup, 'signup')
  const signupToken = str(signupPayload, 'token') ?? str(signupPayload, 'access_token')

  await post(
    '03 · validateToken (fresh signup token)',
    'Confirms the signup token is immediately usable and records the user/tenant shape validateToken returns.',
    `mutation Validate { validateToken${validateSel} }`,
    {},
    signupToken
  )

  const login = await post(
    '04 · login',
    'Same credentials through the login path — the shape Phase 3 will consume.',
    `mutation Login($email: String!, $password: String!) { login(email: $email, password: $password)${loginSel} }`,
    { email: EMAIL, password: PASSWORD }
  )
  const loginPayload = payloadOf(login, 'login')
  const loginAccess = str(loginPayload, 'token') ?? str(loginPayload, 'access_token')
  const loginRefresh = str(loginPayload, 'refresh_token')

  const refreshed = await post(
    '05 · refreshToken',
    'Rotates the refresh. Compare refresh_token here against step 04 to prove rotation.',
    `mutation Refresh($refresh_token: String!) { refreshToken(refresh_token: $refresh_token)${refreshSel} }`,
    { refresh_token: loginRefresh ?? '' }
  )
  const refreshedPayload = payloadOf(refreshed, 'refreshToken')
  const rotatedRefresh = str(refreshedPayload, 'refresh_token')
  const rotatedAccess = str(refreshedPayload, 'token') ?? str(refreshedPayload, 'access_token')

  console.log(
    `\n[rotation check] refresh rotated: ${
      loginRefresh && rotatedRefresh ? String(loginRefresh !== rotatedRefresh) : 'indeterminate'
    }`
  )

  // --- Failure cases ----------------------------------------------------
  await post(
    '06 · FAIL duplicate email',
    'Signup with an email that already exists — the error payload Phase 1 maps to kind `duplicate_email`.',
    `mutation Signup($email: String!, $password: String!, $name: String!) { signup(email: $email, password: $password, name: $name)${authSel} }`,
    { email: EMAIL, password: PASSWORD, name: NAME }
  )

  await post(
    '07 · FAIL wrong password',
    'Login with a bad password — the error payload Phase 1 maps to kind `invalid_credentials`.',
    `mutation Login($email: String!, $password: String!) { login(email: $email, password: $password)${loginSel} }`,
    { email: EMAIL, password: WRONG_PASSWORD }
  )

  await post(
    '08 · FAIL login while authenticated (NO_USER)',
    'Login sent WITH an Authorization header — records the exact NO_USER rejection Phase 1 must avoid triggering.',
    `mutation Login($email: String!, $password: String!) { login(email: $email, password: $password)${loginSel} }`,
    { email: EMAIL, password: PASSWORD },
    rotatedAccess ?? loginAccess
  )

  // --- Refresh reuse: the anti-theft behaviour D11 depends on -----------
  await post(
    '09 · FAIL reuse of a rotated refresh',
    'Second call with the SAME refresh token from step 04. The reference claims this invalidates the entire session — this is the single fact the Phase 4 single-flight guard exists for.',
    `mutation Refresh($refresh_token: String!) { refreshToken(refresh_token: $refresh_token)${refreshSel} }`,
    { refresh_token: loginRefresh ?? '' }
  )

  await post(
    '10 · validateToken after refresh reuse',
    'Was the whole session really killed, or only the reused refresh rejected? Phase 4 error handling turns on the answer.',
    `mutation Validate { validateToken${validateSel} }`,
    {},
    rotatedAccess ?? loginAccess
  )

  // --- Logout -----------------------------------------------------------
  await post(
    '11 · logout',
    'logout is USER-auth: it needs the Authorization header AND the refresh token.',
    `mutation Logout($refresh_token: String!) { logout(refresh_token: $refresh_token)${logoutSel} }`,
    { refresh_token: rotatedRefresh ?? loginRefresh ?? '' },
    rotatedAccess ?? loginAccess
  )

  await post(
    '12 · validateToken after logout',
    'Confirms logout really invalidates the access token (the reference says it does).',
    `mutation Validate { validateToken${validateSel} }`,
    {},
    rotatedAccess ?? loginAccess
  )

  const out = process.env.BP_AI_SPIKE_OUT
  if (out) {
    writeFileSync(out, JSON.stringify({ endpoint: ENDPOINT, email: EMAIL, transcript }, null, 2))
    console.log(`\nTranscript written to ${out}`)
  }

  console.log('\n=== Done. Transcribe the above into thoughts/sergio/research/2026-08-18-bp-ai-auth-contract-findings.md ===')
}

await main()
