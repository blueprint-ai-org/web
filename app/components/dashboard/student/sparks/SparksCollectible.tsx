import { useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router'

import { studentAsset } from '~/assets/student-app'

import { useStudentNavBase } from '../nav/useStudentNavBase'
import { StudentStage } from '../stage/StudentStage'

import { COLLECTIBLES, DEFAULT_COLLECTIBLE } from './sparks-data'

/**
 * `/student/sparks/collectible` — a single collectible's detail (ports
 * `collectible.html`). Query: `?c` selects the collectible (default `3`),
 * `?anim=1` plays the cloud-shrink + content rise entrance.
 *
 * Full-bleed page (purple stage, no sidebar). The `?anim` entrance is expressed
 * as one-shot CSS (fill-mode "backwards", so the "from" state paints before the
 * first frame and the element reverts to its natural base afterwards — leaving
 * the imperative back-exit unaffected). The back button plays the reverse
 * (cloud scale(3) + content fall) then returns to `/student/sparks?back=1` so the
 * shop replays its re-entry. Mounted at both `/student/sparks/collectible` and
 * `/preview/student/sparks/collectible`; client-only render.
 */

const BEZ = 'cubic-bezier(0.75,0,0.3,0.99)'

const COLLECTIBLE_CSS = `
@keyframes spk-c-cloud-in { from { transform: scale(3); } to { transform: scale(1); } }
@keyframes spk-c-content-in { from { opacity: 0; transform: translateY(400px); } to { opacity: 1; transform: translateY(0); } }
.spk-c-anim .spk-c-cloud { animation: spk-c-cloud-in 900ms ${BEZ} backwards; }
.spk-c-anim .spk-c-content { animation: spk-c-content-in 900ms ${BEZ} backwards; }

.spk-c-cloud.exiting { transform: scale(3); transition: transform 900ms ${BEZ}; }
.spk-c-content.exiting { opacity: 0; transform: translateY(400px); transition: transform 900ms ${BEZ}, opacity 900ms ${BEZ}; }
`

export function SparksCollectible() {
  const navigate = useNavigate()
  const base = useStudentNavBase()
  const [searchParams] = useSearchParams()

  const cid = searchParams.get('c') || DEFAULT_COLLECTIBLE
  const collectible = COLLECTIBLES[cid] ?? COLLECTIBLES[DEFAULT_COLLECTIBLE]
  const anim = searchParams.get('anim') === '1'

  const cloudRef = useRef<HTMLDivElement | null>(null)
  const contentRef = useRef<HTMLDivElement | null>(null)

  function exitToSparks() {
    cloudRef.current?.classList.add('exiting')
    contentRef.current?.classList.add('exiting')
    window.setTimeout(() => navigate(`${base}/sparks?back=1`), 900)
  }

  return (
    <StudentStage style={{ backgroundColor: '#b38aff' }} data-testid="sparks-collectible">
      <style>{COLLECTIBLE_CSS}</style>

      <div className={anim ? 'spk-c-anim' : undefined} style={{ position: 'absolute', inset: 0 }}>
        {/* Cloud background */}
        <div
          ref={cloudRef}
          className="spk-c-cloud"
          style={{ position: 'absolute', width: 1499, height: 937, left: -203, top: 55, pointerEvents: 'none', zIndex: 1, transformOrigin: 'center center' }}
        >
          <img src={studentAsset('cloud-1.svg')} alt="" style={{ width: '100%', height: '100%', display: 'block' }} />
        </div>

        {/* Back */}
        <button
          type="button"
          aria-label="Back"
          onClick={exitToSparks}
          style={{
            position: 'absolute',
            top: 48,
            left: 24,
            zIndex: 20,
            width: 48,
            height: 48,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.16)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12.5 15.8334L6.66667 10L12.5 4.16669" stroke="#f2f3e5" strokeWidth="1.67" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Centred content */}
        <div
          ref={contentRef}
          className="spk-c-content"
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            zIndex: 5,
            padding: '100px 80px 0',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ width: 240, height: 240, borderRadius: 16, overflow: 'hidden', border: '1px solid #444450', flexShrink: 0 }}>
            <img src={studentAsset(collectible.img)} alt="Collectible artwork" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          </div>
          <h1
            style={{
              width: 627,
              fontFamily: 'var(--font-student-display)',
              fontWeight: 400,
              fontSize: 80,
              lineHeight: 1.06,
              letterSpacing: '1.5px',
              color: '#f2f3e5',
              textAlign: 'center',
              margin: 0,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {collectible.text}
          </h1>
        </div>
      </div>
    </StudentStage>
  )
}
