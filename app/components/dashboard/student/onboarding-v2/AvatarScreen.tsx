import { useState } from 'react'
import { useFetcher } from 'react-router'

import { studentAsset } from '~/assets/student-app'
import type { PickableAvatar } from '~/lib/student/avatars'

import {
  GOOGLY_WANDER_FACE,
  GooglyEyes,
  type GooglyEye,
  type GooglyFaceClip,
} from './GooglyEyes'
import { NavRow, OnboardingStage, TitleLG } from './OnboardingChrome'
import { useOnboardingTransition } from './useOnboardingTransition'

/**
 * Onboarding · `avatar` (prototype `#s3`, `onboarding.html:1108-1190`).
 * Avatar buttons with static googly eyes. Back → `privacy`, Next →
 * `baseline-mood`.
 *
 * **A pick goes to the gateway only** (`setMyAvatar`, through the route's
 * action — the only self-service write a student has). Every other surface
 * reads it back from `me.user.avatar`; the local copy it used to write was a
 * second source that could disagree. The ring moves on click and the request
 * is never awaited: a picker that freezes while a fetch resolves feels broken.
 *
 * Each avatar's eye overlay clip-paths are namespaced per-instance via `useId`
 * (inside {@link GooglyEyes}) so four overlays coexist without id collisions.
 */

const AV_FACE: GooglyFaceClip = { x: 10, y: 10, w: 120, h: 120, rx: 60 }
const AV_PUPIL = '#36363F'

/**
 * Per-avatar googly-eye geometry, keyed by `Avatar.key`.
 *
 * This is the half of an avatar the BP AI catalogue cannot hold — it has no
 * field for pupil coordinates. Art, colour and order come from `listAvatars`;
 * the eyes stay here. An avatar this map does not know (one the tenant added)
 * still renders; it just has no eyes.
 */
const AVATAR_EYES: Readonly<Record<string, readonly GooglyEye[]>> = {
  'avatar-1': [
    { wcx: 54, wcy: 70, wrx: 14, wry: 14, pcx: 59.09, pcy: 70.14, pr: 8.909 },
    { wcx: 86.36, wcy: 70, wrx: 14, wry: 14, pcx: 81.27, pcy: 70.14, pr: 8.909 },
  ],
  'avatar-2': [
    { wcx: 53.385, wcy: 66, wrx: 14, wry: 14, pcx: 52.909, pcy: 68.755, pr: 8.909 },
    { wcx: 86.615, wcy: 66, wrx: 14, wry: 14, pcx: 86.909, pcy: 68.755, pr: 8.909 },
  ],
  'avatar-3': [
    { wcx: 53.385, wcy: 69.719, wrx: 14, wry: 14, pcx: 52.909, pcy: 72.474, pr: 8.909 },
    { wcx: 86.615, wcy: 69.719, wrx: 14, wry: 14, pcx: 86.909, pcy: 72.474, pr: 8.909 },
  ],
  'avatar-4': [
    { wcx: 49, wcy: 70, wrx: 14, wry: 14, pcx: 53.498, pcy: 72.755, pr: 8.909 },
    { wcx: 82.231, wcy: 70, wrx: 14, wry: 14, pcx: 86.729, pcy: 72.755, pr: 8.909 },
  ],
}

export interface AvatarScreenProps {
  /** The tenant's catalogue; empty without a BP session. */
  avatars?: readonly PickableAvatar[]
  /** The tile to open on: the student's pick, else the tenant default. */
  selectedId?: string | null
}

export function AvatarScreen({ avatars = [], selectedId = null }: AvatarScreenProps = {}) {
  const t = useOnboardingTransition('avatar')
  const fetcher = useFetcher<{ saved: boolean }>()

  // Seeded from the server so a returning student sees their own avatar
  // already chosen, then owned by the click — a pick must feel instant, and
  // waiting for a round trip to draw the ring would make it feel broken.
  const [selected, setSelected] = useState<string | null>(selectedId)

  const pick = (avatar: PickableAvatar) => {
    setSelected(avatar.id)
    fetcher.submit({ avatarId: avatar.id }, { method: 'post' })
  }

  return (
    <OnboardingStage slug="avatar" background="#3f50b8" motion={t.motion}>
      <style>{AVATAR_CSS}</style>

      <img
        src={studentAsset('backgrounds/frame.svg')}
        alt=""
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -48%)',
          width: 1193,
          height: 1185,
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <div style={{ position: 'absolute', left: 311, top: 213, width: 572, zIndex: 5, textAlign: 'center' }}>
        <TitleLG style={{ width: 412, margin: '0 auto' }}>
          Select your
          <br />
          avatar
        </TitleLG>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', marginTop: 64 }}>
          {avatars.map((av, i) => (
            <button
              key={av.id}
              type="button"
              aria-label={`avatar ${i + 1}`}
              className={`ob-av-btn${selected === av.id ? ' sel' : ''}`}
              style={{ background: av.bg }}
              onClick={() => pick(av)}
            >
              {av.src ? <img src={av.src} alt="" /> : null}
              <GooglyEyes
                viewBox="0 0 140 140"
                faceClip={AV_FACE}
                eyes={AVATAR_EYES[av.key] ?? []}
                pupilFill={AV_PUPIL}
                wander={GOOGLY_WANDER_FACE}
              />
            </button>
          ))}
        </div>
      </div>

      <NavRow onBack={t.back} onNext={t.next} />
    </OnboardingStage>
  )
}

const AVATAR_CSS = `
.ob-av-btn {
  width: 140px; height: 140px; border-radius: 99px; border: none;
  overflow: hidden; cursor: pointer; position: relative; padding: 0;
  transition: transform 120ms cubic-bezier(0.34, 1.56, 0.64, 1); flex-shrink: 0;
}
.ob-av-btn::after {
  content: ''; position: absolute; inset: 0; border-radius: 99px;
  border: 10px solid #444450; pointer-events: none; transition: border-color 160ms;
}
.ob-av-btn:hover { transform: scale(1.06); }
.ob-av-btn.sel::after { border-color: #f2f3e5; }
.ob-av-btn img { width: 100%; height: 100%; object-fit: cover; display: block; }
`
