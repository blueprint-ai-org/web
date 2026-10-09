import { monsterCardUrl, studentAsset } from '~/assets/student-app'

import { SPARK_FRAMES } from './mood-data'

/**
 * S-DONE — the completion screen (`mood-checkin.html:791-821`). The `survey-shape`
 * blob (shared with sleep for a seamless swap), the +10 reward with the
 * crossfading spark badge, the mood card art (`card-2` + monster M04), and the
 * exit CTA. The `?edit` variant hides the reward and reworks the copy
 * (`:836-840`). Entry/exit choreography (`done-entered`/`done-exiting`) is driven
 * by the orchestrator toggling classes on the wrapper.
 */

const CARD_BG = studentAsset('card-2.svg')
const MONSTER = monsterCardUrl('M04', 'Default')

export function DoneScreen({ edit, onFinish }: { edit: boolean; onFinish: () => void }) {
  return (
    <>
      <img className="mc-done-blob" src={studentAsset('survey-shape.svg')} alt="" />

      <div className="mc-done-center">
        <div className="mc-done-top-group">
          {!edit && (
            <div className="mc-reward-row">
              <span className="mc-reward-plus">+10</span>
              <div className="mc-spark-badge">
                {SPARK_FRAMES.map((frame) => (
                  <img key={frame} src={studentAsset(frame)} alt="spark" />
                ))}
              </div>
            </div>
          )}
          <div className="mc-done-card">
            <img src={CARD_BG} alt="Mood check-in" style={{ width: '100%', height: '100%', display: 'block', borderRadius: 19 }} />
            {MONSTER && (
              <img
                src={MONSTER}
                alt=""
                style={{ position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', width: 160, height: 160 }}
              />
            )}
          </div>
        </div>
        <p className="mc-done-title">
          {edit ? (
            <>
              Check-in
              <br />
              updated!
            </>
          ) : (
            <>
              Mood check-in
              <br />
              Completed!
            </>
          )}
        </p>
      </div>

      <div className="mc-done-cta">
        <button type="button" className="mc-btn-next" style={{ width: 270 }} onClick={onFinish}>
          {edit ? 'Back to your day' : 'Start your day'}
        </button>
      </div>
    </>
  )
}
