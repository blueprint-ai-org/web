/**
 * Journey data model — ported from `journey.html`'s inline JS + markup.
 *
 * The journey page is entirely demo/hardcoded in the prototype (only the Sparks
 * stat + swarm count read `bp_sparks`); every other number, card, and shape is a
 * baked constant. This module carries those constants 1:1 so {@link JourneyHome}
 * and {@link StatDetailOverlay} stay declarative.
 *
 *  - {@link STAT_CARDS} — the 2×2 "This month" grid (`journey.html:620-641`).
 *  - {@link ACTIVITY_CARDS} — the "Over time" drag carousel (`:656-721`).
 *  - {@link FEEL_SHAPES} / {@link ACTIVITY_BUBBLES} — the feelings + activities
 *    stat-detail visualisations (`:1098-1126,1343-1349`).
 *  - {@link CHECKIN_GRID} — the check-ins calendar-dot grid (`:1207-1225`).
 *  - {@link SWARM} + {@link SHAPE_FUNS} — the spring-physics spark swarm
 *    (`:1234-1337`): 36 sparks spring toward one of six random formations.
 *  - {@link STAT_DETAIL_LEFT_COPY} — English replacements for the residual
 *    Polish in the prototype's *hidden* left info panel (see the note below).
 */

// ── Copy ──────────────────────────────────────────────────────────────────────

export const JOURNEY_COPY = {
  title: 'Journey',
  sub: "See what you've been up to.",
  tabThisMonth: 'This month',
  tabOverTime: 'Over time',
  openRecap: 'Open monthly recap',
} as const

/**
 * English replacements for the residual Polish strings in `journey.html`
 * (`:1131,1133,1166,1169`). Those strings live exclusively inside the
 * `sdoMakeLeft` / `sdoBuildSparks` builder functions, which are **defined but
 * never called** — `openStatDetail` hides the left panel (`sdoLeft.style.display
 * = 'none'`) for every stat and renders only the right-hand visualisation. So no
 * Polish (and none of this English) currently renders on screen; this constant
 * bakes the approved English translation for the record and for when the left
 * info panel is eventually wired to a backend.
 *
 * Polish → English:
 *  - `w tym miesiącu`                     → `this month`
 *  - `Zajrzyj do swojego toolkitu →`      → `Check out your toolkit →`
 *  - `Tyg {n}`                            → `Wk {n}`
 *  - `zebranych sparks w tym miesiącu`    → `sparks earned this month`
 */
export const STAT_DETAIL_LEFT_COPY = {
  period: 'this month',
  toolkitLink: 'Check out your toolkit →',
  weekLabel: (n: number): string => `Wk ${n}`,
  sparksEarned: 'sparks earned this month',
} as const

// ── Stat cards (journey.html:620-641) ──────────────────────────────────────────

export type StatKey = 'feelings' | 'checkins' | 'sparks' | 'activities'

export interface StatCard {
  readonly key: StatKey
  readonly label: string
  /** Baked demo value; `sparks` reads `bp_sparks` at runtime instead. */
  readonly value: number | null
  readonly shape: string
}

export const STAT_CARDS: readonly StatCard[] = [
  { key: 'feelings', label: 'Feelings named', value: 32, shape: 'journey-shape-04.svg' },
  { key: 'checkins', label: 'Check-in completed', value: 13, shape: 'journey-shape-03.svg' },
  { key: 'sparks', label: 'Sparks earned', value: null, shape: 'journey-shape-01.svg' },
  { key: 'activities', label: 'Activities done', value: 27, shape: 'journey-shape-02.svg' },
]

// ── Stat-detail hero caption per key (journey.html:1201,1228,1240,1360) ─────────

export interface StatCaption {
  readonly num: string | number
  /** Two-line caption; rendered with a `<br>` between the halves. */
  readonly line1: string
  readonly line2: string
}

/** `sparks` caption uses the live balance, filled in at render time. */
export const STAT_CAPTIONS: Record<Exclude<StatKey, 'sparks'>, StatCaption> = {
  feelings: { num: 32, line1: 'Named feelings.', line2: 'That takes courage!' },
  checkins: { num: 13, line1: 'Completed check-ins.', line2: 'You showed up!' },
  activities: { num: 27, line1: 'Activities done.', line2: 'You explored a lot!' },
}

export const SPARKS_CAPTION = { line1: 'Earned sparks.', line2: 'Spend some!' } as const

// ── All-time carousel (journey.html:656-721) ────────────────────────────────────

export interface ActivityCard {
  readonly title: string
  readonly date: string
  readonly wzor: string
}

export const ACTIVITY_CARDS: readonly ActivityCard[] = [
  { title: 'Handled hard emotions connected to grade', date: 'Today', wzor: 'wzor-03.svg' },
  { title: 'Learned about Emotional Regulation', date: '12.04.24', wzor: 'wzor-07.svg' },
  { title: 'Wrote 20 notes in Journal', date: '01.04.24', wzor: 'wzor-01.svg' },
  { title: 'Completed your first Monthly Recap', date: '28.03.24', wzor: 'wzor-02.svg' },
  { title: 'Reached 100 Sparkz milestone', date: '15.03.24', wzor: 'wzor-04.svg' },
  { title: 'Tried your first breathing exercise', date: '02.02.24', wzor: 'wzor-06.svg' },
  { title: 'Started', date: '12.01.24', wzor: 'wzor-05.svg' },
]

/** 318px card + 142px connector = 460px snap step (`journey.html:930`). */
export const CARD_STEP = 460
/** Six steps between the seven cards (`journey.html:931`). */
export const MAX_OFFSET = CARD_STEP * (ACTIVITY_CARDS.length - 1)

// ── Feelings overlay — organic emotion tiles (journey.html:1098-1117) ───────────

export interface FeelShape {
  readonly name: string
  readonly count: number
  readonly svgFile: string
  readonly x: number
  readonly y: number
  readonly w: number
  readonly h: number
  readonly bx: number
  readonly by: number
  readonly imgRot?: number
  readonly anim: string
  readonly dur: string
  readonly delay: string
}

export const FEEL_SHAPES: readonly FeelShape[] = [
  { name: 'Curious', count: 5, svgFile: 'hopeful', x: 386, y: 443, w: 253, h: 253, bx: 126, by: 126, anim: 'jy-float-a', dur: '6s', delay: '0s' },
  { name: 'Anxious', count: 9, svgFile: 'anxious', x: 8, y: 265, w: 434, h: 432, bx: 217, by: 217, imgRot: 15, anim: 'jy-float-b', dur: '5.5s', delay: '1.1s' },
  { name: 'Happy', count: 8, svgFile: 'happy', x: 514, y: 120, w: 323, h: 323, bx: 161, by: 161, anim: 'jy-float-c', dur: '7s', delay: '0.4s' },
  { name: 'Stressed', count: 7, svgFile: 'stressed', x: 859, y: 225, w: 284, h: 293, bx: 142, by: 121, anim: 'jy-float-d', dur: '5.2s', delay: '2s' },
  { name: 'Tired', count: 1, svgFile: 'tired', x: 659, y: 470, w: 174, h: 174, bx: 87, by: 102, anim: 'jy-float-e', dur: '6.8s', delay: '0.7s' },
  { name: 'Okay', count: 2, svgFile: 'calm', x: 269, y: 55, w: 227, h: 227, bx: 113, by: 113, imgRot: 30, anim: 'jy-float-f', dur: '6.2s', delay: '1.5s' },
]

// ── Activities overlay — coloured bubbles (journey.html:1343-1349) ──────────────

export interface ActivityBubble {
  readonly name: string
  readonly count: number
  readonly color: string
  readonly x: number
  readonly y: number
  readonly d: number
  readonly bx: number
  readonly by: number
  readonly anim: string
  readonly dur: string
  readonly delay: string
}

export const ACTIVITY_BUBBLES: readonly ActivityBubble[] = [
  { name: 'Breathing', count: 8, color: '#68DCC6', x: 430, y: 125, d: 293, bx: 146, by: 146, anim: 'jy-float-c', dur: '6.5s', delay: '0s' },
  { name: 'Grounding', count: 3, color: '#E65800', x: 242, y: 233, d: 181, bx: 90, by: 90, anim: 'jy-float-b', dur: '5.5s', delay: '1.3s' },
  { name: 'Mindful walk', count: 2, color: '#56CCF2', x: 557, y: 433, d: 147, bx: 73, by: 73, anim: 'jy-float-d', dur: '5.2s', delay: '0.7s' },
  { name: 'Journaling', count: 4, color: '#FDDA3C', x: 306, y: 405, d: 239, bx: 119, by: 119, anim: 'jy-float-a', dur: '7s', delay: '1.8s' },
  { name: 'Body scan', count: 5, color: '#6A7EFF', x: 696, y: 286, d: 257, bx: 128, by: 128, anim: 'jy-float-e', dur: '6.8s', delay: '0.4s' },
]

// ── Check-ins overlay — animated dot grid (journey.html:1207-1225) ──────────────

export interface CheckinCell {
  readonly left: number
  readonly top: number
  readonly done: boolean
  readonly anim?: string
  readonly dur?: string
  readonly delay?: string
}

const CK_COLS = [57, 197, 337, 477, 617]
const CK_ROWS = [57, 196, 335, 474]
const CK_DONE = new Set([
  '57,57', '57,196', '57,474', '197,196', '197,474', '337,57', '477,57',
  '477,196', '477,335', '477,474', '617,57', '617,196', '617,474',
])
const CK_ANIMS = ['jy-float-a', 'jy-float-c', 'jy-float-b', 'jy-float-f', 'jy-float-d', 'jy-float-e', 'jy-float-b', 'jy-float-a', 'jy-float-c', 'jy-float-e', 'jy-float-d', 'jy-float-f', 'jy-float-a']
const CK_DELAYS = ['0s', '1.2s', '0.4s', '1.8s', '0.9s', '2.2s', '0.3s', '1.5s', '0.7s', '2.0s', '1.1s', '0.6s', '1.7s']
const CK_DURS = ['6s', '7s', '5.5s', '6.5s', '5.2s', '6.8s', '7s', '6.2s', '5.8s', '6.5s', '7.2s', '5.5s', '6s']

/** Flatten the col×row grid into positioned cells (`journey.html:1214-1225`). */
export const CHECKIN_GRID: readonly CheckinCell[] = (() => {
  const cells: CheckinCell[] = []
  let doneIdx = 0
  for (const cx of CK_COLS) {
    for (const cy of CK_ROWS) {
      const key = `${cx},${cy}`
      const left = 261 + cx - 57
      const top = 149 + cy - 57
      if (CK_DONE.has(key)) {
        cells.push({ left, top, done: true, anim: CK_ANIMS[doneIdx], dur: CK_DURS[doneIdx], delay: CK_DELAYS[doneIdx] })
        doneIdx++
      } else {
        cells.push({ left, top, done: false })
      }
    }
  }
  return cells
})()

export const CHECKIN_DONE_COLOR = '#E65800'

// ── Spark swarm (journey.html:1234-1337) ────────────────────────────────────────

export const SWARM = {
  COUNT: 36,
  /** Spark img radius (50px img → 25px half). */
  R: 25,
  /** Formation centre (field is the full 1194×834 stage). */
  CX: 597,
  CY: 370,
  SPRING: 0.018,
  DAMP: 0.88,
  PERTURB: 0.018,
  MAXV: 3.5,
  /** Collision engages within 50px (`d2 < 2500`). */
  COLLIDE_D2: 2500,
  COLLIDE_MIN: 50,
} as const

/** A formation is a list of 36 target `[x, y]` points about `(cx, cy)`. */
export type Formation = Array<[number, number]>
export type ShapeFn = (cx: number, cy: number) => Formation

/**
 * The six spark formations (`journey.html:1249-1288`) — flower, star, heart,
 * lightning bolt, smiley, strawberry. Ported verbatim; each returns exactly 36
 * target points so every spark has a home.
 */
export const SHAPE_FUNS: readonly ShapeFn[] = [
  // flower
  (cx, cy) => {
    const pts: Formation = []
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; pts.push([cx + 32 * Math.cos(a), cy + 32 * Math.sin(a)]) }
    for (let p = 0; p < 5; p++) {
      const pa = (p * 2 * Math.PI) / 5 - Math.PI / 2
      const px = cx + 175 * Math.cos(pa)
      const py = cy + 175 * Math.sin(pa)
      for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; pts.push([px + 60 * Math.cos(a), py + 60 * Math.sin(a)]) }
    }
    return pts
  },
  // star
  (cx, cy) => {
    const pts: Formation = []
    const R1 = 250
    const R2 = 100
    for (let p = 0; p < 5; p++) {
      const a = (p * 2 * Math.PI) / 5 - Math.PI / 2
      const tx = cx + R1 * Math.cos(a)
      const ty = cy + R1 * Math.sin(a)
      for (let k = 0; k < 4; k++) { const ka = (k * Math.PI) / 2; pts.push([tx + 22 * Math.cos(ka), ty + 22 * Math.sin(ka)]) }
    }
    for (let p = 0; p < 5; p++) {
      const a = (p * 2 * Math.PI) / 5 - Math.PI / 2 + Math.PI / 5
      const tx = cx + R2 * Math.cos(a)
      const ty = cy + R2 * Math.sin(a)
      pts.push([tx - 12, ty]); pts.push([tx + 12, ty])
    }
    for (let k = 0; k < 6; k++) { const a = (k * Math.PI) / 3; pts.push([cx + 30 * Math.cos(a), cy + 30 * Math.sin(a)]) }
    return pts
  },
  // heart
  (cx, cy) => {
    const pts: Formation = []
    const sc = 17
    for (let k = 0; k < 36; k++) {
      const t = (k * 2 * Math.PI) / 36
      const hx = 16 * Math.pow(Math.sin(t), 3)
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)
      pts.push([cx + hx * sc, cy - hy * sc])
    }
    return pts
  },
  // lightning bolt
  (cx, cy) => {
    void cx; void cy
    const pts: Formation = []
    const seg = (x1: number, y1: number, x2: number, y2: number, n: number) => {
      for (let i = 0; i < n; i++) { const t = n > 1 ? i / (n - 1) : 0; pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t]) }
    }
    seg(720, 100, 555, 345, 12); seg(555, 345, 695, 345, 7); seg(695, 345, 510, 625, 12); seg(695, 130, 545, 345, 5)
    return pts
  },
  // smiley
  (cx, cy) => {
    void cx; void cy
    return [
      [630, 95], [731, 113], [820, 164], [886, 243], [921, 339], [921, 441], [886, 538], [820, 616], [731, 667], [630, 685],
      [529, 667], [440, 616], [374, 538], [339, 441], [339, 339], [374, 242], [440, 164], [529, 113], [489, 284], [541, 284],
      [489, 336], [541, 336], [719, 284], [771, 284], [719, 336], [771, 336], [604, 400], [656, 400], [821, 530], [780, 581],
      [725, 618], [663, 638], [597, 638], [535, 618], [480, 581], [439, 530],
    ]
  },
  // strawberry
  (cx, cy) => {
    const pts: Formation = []
    const body: Array<[number, number]> = [
      [-55, -185], [-115, -130], [-155, -60], [-170, 20], [-155, 100], [-120, 165], [-75, 210], [-30, 235], [0, 240], [30, 235],
      [75, 210], [120, 165], [155, 100], [170, 20], [155, -60], [115, -130], [55, -185], [25, -190], [0, -192], [-25, -190],
    ]
    body.forEach((p) => pts.push([cx + p[0], cy + p[1]]))
    const seeds: Array<[number, number]> = [[-70, -50], [70, -50], [-90, 60], [90, 60], [-50, 150], [50, 150]]
    seeds.forEach((p) => pts.push([cx + p[0], cy + p[1]]))
    const leaves: Array<[number, number]> = [[-140, -170], [-160, -240], [-70, -190], [-80, -265], [0, -195], [0, -275], [70, -190], [80, -265], [140, -170], [160, -240]]
    leaves.forEach((p) => pts.push([cx + p[0], cy + p[1]]))
    return pts // 20 + 6 + 10 = 36
  },
]
