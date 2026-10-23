// Proves the avatar loop end to end with the STUDENT's own token, no admin:
// listAvatars → setMyAvatar → me { user { avatar } }. No introspection, so it
// is safe to re-run (the gateway bans on introspection bursts).
//
// Run: cd lti-server-test && npx tsx --env-file=<creds> scripts/bp-ai-avatar-roundtrip.ts
import 'dotenv/config'

const E = process.env.BP_AI_GRAPHQL_URL!

async function gql(query: string, variables: Record<string, unknown>, token?: string) {
  const r = await fetch(E, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(25_000),
  })
  const b = (await r.json()) as any
  if (b.errors?.length) throw new Error(`${b.errors[0].extensions?.code ?? r.status}: ${b.errors[0].message}`)
  return b.data
}

async function main() {
  const { login } = await gql(
    'mutation($e:String!,$p:String!){login(email:$e,password:$p){token user_id}}',
    { e: process.env.BP_AI_STUDENT_EMAIL, p: process.env.BP_AI_STUDENT_PASSWORD },
  )
  const { token, user_id } = login
  console.log(`\n[1] student token for ${user_id}`)

  const { listAvatars } = await gql(
    'query{listAvatars(pageSize:50){avatars{id name image_url background order status}}}',
    {},
    token,
  )
  const avatars = listAvatars.avatars as Array<Record<string, string>>
  console.log(`[2] listAvatars as the STUDENT → ${avatars.length} row(s)`)
  for (const a of avatars) console.log(`      ${a.name}  order=${a.order}  ${a.background}  ${a.image_url}`)
  if (!avatars.length) return console.error('    nothing to pick — seed first.')

  const pick = avatars[0]
  const { setMyAvatar } = await gql('mutation($id:String!){setMyAvatar(avatarId:$id){id avatar_id}}', { id: pick.id }, token)
  console.log(`[3] setMyAvatar("${pick.name}") → avatar_id=${setMyAvatar.avatar_id}`)

  // `me`, and the RESOLVED avatar: no user id travels, and the round-trip is
  // checked against the row itself rather than against an id the script would
  // then have to look up in the library.
  const { me } = await gql('query{me{user{avatar_id avatar{id name}}}}', {}, token)
  const stored = me.user?.avatar_id
  const ok = stored === pick.id && me.user?.avatar?.id === pick.id
  console.log(`[4] me.user.avatar = ${me.user?.avatar?.name ?? 'none'} (${stored})  ${ok ? '✓ round-trip holds' : '✗ MISMATCH'}`)

  // every stored URL must actually resolve, or the picker renders four holes
  console.log('[5] art reachability:')
  for (const a of avatars) {
    const res = await fetch(a.image_url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) }).catch(() => null)
    console.log(`      ${res?.status ?? 'ERR'}  ${a.image_url}`)
  }
  console.log()
}

main().catch((e) => {
  console.error(`\nfailed: ${(e as Error).message}\n`)
  process.exit(1)
})
