import { useState } from 'react'

import { studentAsset } from '~/assets/student-app'

import { MonsterEyes, type WanderMode } from './MonsterEyes'
import type { CardDef, CardState } from './today-data'

/**
 * One Today-hub card (`today.html:550-602`, `.t-card`). Shows the sleepy or done
 * art; sleepy/hero cards carry a {@link MonsterEyes} overlay (done cards hide it,
 * `today:192`). Hero eyes are always open + wander; sleepy eyes open on hover
 * (`today:1217-1229`). Clicking activates the card — the hub decides where that
 * goes (flow route for sleepy/hero, overlay/journal/flow for done).
 */

export function TodayCard({
  card,
  state,
  onActivate,
}: {
  card: CardDef
  state: CardState
  onActivate: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const isDone = state === 'done'
  const isHero = state === 'hero'

  const eyesOpen = isHero || (hovered && !isDone)
  const wanderMode: WanderMode = hovered && !isDone ? 'hover' : isHero ? 'hero' : null

  const art = isDone ? card.doneSvg : (card.sleepySvg ?? card.doneSvg)
  const alt = card.section

  return (
    <div
      className={`th-card ${state}`}
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onActivate()
        }
      }}
    >
      <img className="th-card-img" src={studentAsset(art)} alt={alt} />
      {!isDone && <MonsterEyes open={eyesOpen} wanderMode={wanderMode} />}
    </div>
  )
}
