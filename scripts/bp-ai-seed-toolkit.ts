/**
 * Seed the student toolkit's videos into a tenant as lessons.
 *
 * The toolkit used to be a catalogue written in the app (`toolkit-data.ts`):
 * hand-titled tiles and two mp4s served from `public/`. It reads `Lesson`s now
 * (step-24), and course → unit → lesson is per-tenant content that manager does
 * NOT seed (`phase_mongo.go`), so a tenant has no toolkit until this runs.
 *
 * What it creates, under one `Toolkit` course (`PUBLISHED`, or students cannot
 * see it) and one `Toolkit` unit:
 *
 * - one lesson per entry of {@link LESSONS}, with its category (a
 *   `content_category.key`, or `school` for the two grades-screen promos, which
 *   are deliberately NOT a browse category), duration and sparks;
 * - its video and cover, uploaded with `uploadAsset(collection: "lesson", id,
 *   field)`: the gateway signs a PUT, this script PUTs the file, and
 *   activity-ingestor has already written the public URL into the lesson.
 *
 * The list is product's to validate (step-24 Manual Verification). The
 * categories of the two real clips are a first guess.
 *
 * ## Idempotent
 *
 * Course and unit are matched by title, lessons by title within the unit; a
 * lesson that exists is left alone, and a file is uploaded only while the
 * lesson's field is still empty. A second run creates nothing.
 * `--dry-run` prints the plan and calls nothing.
 *
 * ## Credentials
 *
 * The tenant's **owner admin** (`createCourse`, `createLesson` and
 * `uploadAsset` are ADMIN), as the avatar seeder this replaces did.
 *
 * Run:
 *   npx tsx --env-file=<creds> scripts/bp-ai-seed-toolkit.ts [--dry-run]
 *
 * Env: BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.
 */
import 'dotenv/config'

import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENDPOINT = process.env.BP_AI_GRAPHQL_URL
const EMAIL = process.env.BP_AI_ADMIN_EMAIL
const PASSWORD = process.env.BP_AI_ADMIN_PASSWORD
const DRY_RUN = process.argv.includes('--dry-run')

if (!ENDPOINT || !EMAIL || !PASSWORD) {
  console.error('Need BP_AI_GRAPHQL_URL, BP_AI_ADMIN_EMAIL, BP_AI_ADMIN_PASSWORD.')
  process.exit(1)
}

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA = resolve(ROOT, 'scripts/toolkit-media')
const ART = resolve(ROOT, 'app/assets/student-app')

const COURSE_TITLE = 'Toolkit'
const UNIT_TITLE = 'Toolkit'

interface LessonPlan {
  title: string
  category: string
  durationSeconds: number
  sparks: number
  /** A file path, or null for none. */
  video: string | null
  cover: string | null
}

/**
 * The prototype's two playable clips, plus the grades screen's two promos
 * (which played Calming Breath in the prototype, and still do until product
 * provides their own). Order matters for `school`: the grades screen reads the
 * first as its Grades promo and the second as its Attendance one.
 */
const LESSONS: readonly LessonPlan[] = [
  {
    title: 'Calming Breath',
    category: 'calm-down',
    durationSeconds: 64,
    sparks: 1,
    video: resolve(MEDIA, 'calming-breath.mp4'),
    cover: resolve(ART, 'calming-breath-cover.png'),
  },
  {
    title: "You've Done Hard Things",
    category: 'feel-good',
    durationSeconds: 76,
    sparks: 1,
    video: resolve(MEDIA, 'youve-done-hard-things.mp4'),
    cover: resolve(ART, 'youve-done-hard-things-cover.png'),
  },
  {
    title: 'The emotional side of grades',
    category: 'school',
    durationSeconds: 90,
    sparks: 1,
    video: resolve(MEDIA, 'calming-breath.mp4'),
    cover: null,
  },
  {
    title: 'How to catch up after missing school',
    category: 'school',
    durationSeconds: 90,
    sparks: 1,
    video: resolve(MEDIA, 'calming-breath.mp4'),
    cover: null,
  },
]

const CONTENT_TYPES: Record<string, string> = { mp4: 'video/mp4', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg' }

interface Lesson {
  id: string
  title: string
  video_url: string | null
  cover_url: string | null
}

async function gql<T>(query: string, variables: Record<string, unknown>, token?: string): Promise<T> {
  const res = await fetch(ENDPOINT as string, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(30_000),
  })
  const body = (await res.json()) as { data?: T; errors?: Array<{ message?: string; extensions?: { code?: string; reason?: string } }> }
  if (body.errors?.length) {
    const first = body.errors[0]
    throw new Error(`${first.extensions?.reason ?? first.extensions?.code ?? res.status}: ${first.message ?? 'unknown'}`)
  }
  if (!body.data) throw new Error(`${res.status}: no data`)
  return body.data
}

async function findOrCreateCourse(token: string): Promise<string> {
  const { listCourses } = await gql<{ listCourses: { courses: Array<{ id: string; title: string; status: string }> } }>(
    'query { listCourses(pageSize: 100) { courses { id title status } } }',
    {},
    token,
  )
  const found = listCourses.courses.find((c) => c.title === COURSE_TITLE)
  if (found) {
    console.log(`  course   ${found.id} (exists, ${found.status})`)
    return found.id
  }
  const { createCourse } = await gql<{ createCourse: { id: string } }>(
    'mutation($input: CreateCourseInput!) { createCourse(input: $input) { id } }',
    { input: { title: COURSE_TITLE, status: 'PUBLISHED' } },
    token,
  )
  console.log(`  course   ${createCourse.id} (created, PUBLISHED)`)
  return createCourse.id
}

async function findOrCreateUnit(token: string, course: string): Promise<string> {
  const { listUnits } = await gql<{ listUnits: { units: Array<{ id: string; title: string }> } }>(
    'query($course: ID) { listUnits(course: $course, pageSize: 100) { units { id title } } }',
    { course },
    token,
  )
  const found = listUnits.units.find((u) => u.title === UNIT_TITLE)
  if (found) {
    console.log(`  unit     ${found.id} (exists)`)
    return found.id
  }
  const { createUnit } = await gql<{ createUnit: { id: string } }>(
    'mutation($input: CreateUnitInput!) { createUnit(input: $input) { id } }',
    { input: { course, title: UNIT_TITLE } },
    token,
  )
  console.log(`  unit     ${createUnit.id} (created)`)
  return createUnit.id
}

/** Sign a PUT for one file, send it, and return the URL the lesson now holds. */
async function upload(token: string, lessonId: string, field: 'videoUrl' | 'coverUrl', path: string): Promise<string> {
  const ext = path.split('.').pop()?.toLowerCase() ?? ''
  const contentType = CONTENT_TYPES[ext]
  if (!contentType) throw new Error(`no content type for ${path}`)

  const { uploadAsset } = await gql<{
    uploadAsset: { uploadUrl: string; publicUrl: string; uploadHeaders: Array<{ name: string; value: string }> }
  }>(
    'mutation($input: UploadAssetInput!) { uploadAsset(input: $input) { uploadUrl publicUrl uploadHeaders { name value } } }',
    { input: { name: basename(path), contentType, id: lessonId, collection: 'lesson', field } },
    token,
  )
  const res = await fetch(uploadAsset.uploadUrl, {
    method: 'PUT',
    headers: Object.fromEntries(uploadAsset.uploadHeaders.map((h) => [h.name, h.value])),
    body: await readFile(path),
  })
  if (!res.ok) throw new Error(`PUT ${basename(path)} → ${res.status} ${await res.text()}`)
  return uploadAsset.publicUrl
}

async function main() {
  console.log(`\nendpoint  ${ENDPOINT}`)
  console.log(`seeding   ${LESSONS.length} lessons under "${COURSE_TITLE}" / "${UNIT_TITLE}"\n`)
  for (const l of LESSONS) {
    console.log(`  ${l.title.padEnd(40)} ${l.category.padEnd(12)} ${l.durationSeconds}s  ${l.sparks}✦  ${l.video ? basename(l.video) : '-'}  ${l.cover ? basename(l.cover) : '-'}`)
  }
  if (DRY_RUN) {
    console.log('\n--dry-run: nothing was called.\n')
    return
  }

  const { login } = await gql<{ login: { token: string; tenant: string } }>(
    'mutation($email: String!, $password: String!) { login(email: $email, password: $password) { token tenant } }',
    { email: EMAIL, password: PASSWORD },
  )
  const token = login.token
  console.log(`\nlogged in as owner admin — tenant ${login.tenant}`)

  const course = await findOrCreateCourse(token)
  const unit = await findOrCreateUnit(token, course)

  const { listLessons } = await gql<{ listLessons: { lessons: Lesson[] } }>(
    'query($unit: ID) { listLessons(unit: $unit, pageSize: 100) { lessons { id title video_url cover_url } } }',
    { unit },
    token,
  )
  const existing = new Map(listLessons.lessons.map((l) => [l.title, l]))

  let failed = 0
  for (const [order, plan] of LESSONS.entries()) {
    try {
      let lesson = existing.get(plan.title)
      if (lesson) {
        console.log(`  exists   ${plan.title}`)
      } else {
        const { createLesson } = await gql<{ createLesson: Lesson }>(
          'mutation($input: CreateLessonInput!) { createLesson(input: $input) { id title video_url cover_url } }',
          {
            input: {
              unit,
              title: plan.title,
              category: plan.category,
              duration_seconds: plan.durationSeconds,
              sparks: plan.sparks,
              order,
            },
          },
          token,
        )
        lesson = createLesson
        console.log(`  created  ${plan.title} (${lesson.id})`)
      }
      // Only while empty: a re-run must not upload a second copy of each file.
      if (plan.video && !lesson.video_url) console.log(`    video  ${await upload(token, lesson.id, 'videoUrl', plan.video)}`)
      if (plan.cover && !lesson.cover_url) console.log(`    cover  ${await upload(token, lesson.id, 'coverUrl', plan.cover)}`)
    } catch (e) {
      failed++
      console.error(`  FAILED   ${plan.title} — ${(e as Error).message}`)
    }
  }
  console.log(failed ? `\n${failed} lesson(s) failed.\n` : '\ndone.\n')
  if (failed) process.exitCode = 1
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
