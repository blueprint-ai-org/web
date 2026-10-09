/**
 * Class-based CSS for the recap story (`recap.html`'s `<style>` block), ported
 * verbatim and namespaced `rc-` to avoid collisions. `var(--font-body)` /
 * `var(--font-display)` map to the student tokens. Rendered once by
 * {@link RecapStory} via a `<style>` element — the same component-scoped
 * stylesheet pattern as the summary + toolkit clusters.
 *
 * The prototype clips the whole `.bp-device`; here the shared {@link StudentStage}
 * is the device, so the clip-path reveal runs on an inner `.rc-device` wrapper
 * (driven by a React state phase in {@link RecapStory}), plus the `#recap-inner`
 * slide-up (`rc-inner`). The `spin` / `rock-graph` background keyframes are
 * namespaced `rc-spin` / `rc-rock`.
 */

export const RECAP_CSS = `
/* Device wrapper (recap.html:13-18) — clip reveal driven by RecapStory phase */
.rc-device {
  position: absolute; inset: 0; overflow: hidden;
  border-radius: 20px; background: #1f1f25;
}
.rc-inner { position: absolute; inset: 0; animation: rc-slide-in 800ms cubic-bezier(0.81, 0, 0.26, 0.98) both; }
@keyframes rc-slide-in { from { transform: translateY(100%); } to { transform: translateY(0); } }

/* Progress bar (recap.html:29-44) */
.rc-progress {
  position: absolute; top: 55px; left: 219px; width: 756px; height: 4px; z-index: 20;
  transform: translateY(-60px); opacity: 0; pointer-events: none;
  transition: transform 1000ms cubic-bezier(0.81,0,0.26,0.98), opacity 500ms ease;
}
.rc-progress.visible { transform: translateY(0); opacity: 1; }
.rc-progress-track { position: absolute; inset: 0; background: rgba(255,255,255,0.22); border-radius: 99px; }
.rc-progress-fill {
  position: absolute; top: 0; left: 0; height: 100%;
  background: #f2f3e5; border-radius: 99px; transition: width 400ms ease;
}

/* Navigation (recap.html:47-70) */
.rc-nav {
  position: absolute; bottom: 65px; left: 50%;
  display: flex; align-items: center; gap: 12px; z-index: 20;
  transform: translateX(-50%) translateY(150px); opacity: 0; pointer-events: none;
  transition: transform 1000ms cubic-bezier(0.81,0,0.26,0.98), opacity 500ms ease;
}
.rc-nav.visible { transform: translateX(-50%) translateY(0); opacity: 1; pointer-events: all; }
.rc-back {
  width: 48px; height: 48px; border-radius: 8px; flex-shrink: 0;
  background: rgba(255,255,255,0.16); border: none; cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: opacity 120ms;
}
.rc-back:active { opacity: 0.7; }
.rc-next {
  width: 200px; height: 48px; border-radius: 8px;
  background: #f2f3e5; border: none; cursor: pointer;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #1f1f25; letter-spacing: -0.1px; box-shadow: 0 1px 1px rgba(20,21,26,0.03);
  transition: opacity 120ms;
}
.rc-next:active { opacity: 0.8; }

/* Slides (recap.html:73-77) */
.rc-slide { position: absolute; inset: 0; opacity: 0; pointer-events: none; overflow: hidden; }
.rc-slide.active { opacity: 1; pointer-events: all; }

/* Slide 1: Intro (recap.html:80-114) */
.rc-slide-intro { background: #1f1f25; }
.rc-intro-bg { position: absolute; inset: 0; }
.rc-intro-bg img { width: 100%; height: 100%; display: block; object-fit: cover; }
.rc-intro-group {
  position: absolute; bottom: 228px; left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.rc-intro-month {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #737472; letter-spacing: -0.1px; line-height: 20px; margin: 0 0 24px;
}
.rc-intro-title {
  font-family: var(--font-student-display); font-weight: 400; font-size: 80px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5; margin: 0;
}
.rc-intro-planet {
  position: absolute; bottom: -250px; left: 50%; transform: translateX(-50%);
  width: 500px; height: 500px; display: block;
}
.rc-btn-start {
  position: absolute; bottom: 64px; left: 50%; transform: translateX(-50%);
  width: 270px; height: 48px; border-radius: 8px;
  background: #f2f3e5; border: none; cursor: pointer;
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #1f1f25; letter-spacing: -0.1px; box-shadow: 0 1px 1px rgba(20,21,26,0.03);
  transition: opacity 120ms;
}
.rc-btn-start:active { opacity: 0.8; }

/* Slide 2: Cloud / Quote (recap.html:117-136) */
.rc-slide-cloud { background: #49aee1; }
.rc-cloud-img { position: absolute; inset: 0; }
.rc-cloud-img img { width: 100%; height: 100%; display: block; object-fit: cover; }
.rc-cloud-text {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
  width: 661px; text-align: center; display: flex; flex-direction: column; gap: 24px; align-items: center;
}
.rc-cloud-label {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #a4a59f; letter-spacing: -0.1px; line-height: 20px; margin: 0;
}
.rc-cloud-quote {
  font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5; margin: 0;
}

/* Slide 3: Emotions (recap.html:139-178) */
.rc-slide-emotions { background: #1f1f25; }
.rc-emo-content {
  position: absolute; top: 111px; left: 0; right: 0;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.rc-emo-bg {
  position: absolute; bottom: -500px; left: 50%; transform: translateX(-50%);
  width: 1000px; height: 1000px; display: block;
  animation: rc-spin 15000ms linear infinite; transform-origin: center center;
}
@keyframes rc-spin {
  from { transform: translateX(-50%) rotate(0deg); }
  to   { transform: translateX(-50%) rotate(360deg); }
}
.rc-stat-heading {
  font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5; margin: 0 0 24px;
}
.rc-stat-sub {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #a4a59f; letter-spacing: -0.1px; line-height: 20px; margin: 0 0 48px;
}
.rc-stat-pin {
  position: absolute; width: 99px; height: 96px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; gap: 6px;
}
.rc-stat-num {
  font-family: var(--font-student-display); font-weight: 400; font-size: 48px; line-height: 1.06;
  letter-spacing: -0.8px; color: #f2f3e5; margin: 0;
}
.rc-stat-num-desc {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; line-height: 20px; margin: 0; max-width: 110px;
}

/* Slide 4: Sleep & mood (recap.html:181-205) */
.rc-slide-journey { background: #1f1f25; }
.rc-journey-bg {
  position: absolute; bottom: -575px; left: 50%;
  width: 1150px; height: 1150px; display: block; opacity: 0.9;
  animation: rc-rock 2400ms linear infinite;
}
@keyframes rc-rock {
  0%     { transform: translateX(-50%) rotate(0deg); }
  33.33% { transform: translateX(-50%) rotate(0deg); animation-timing-function: cubic-bezier(0.62, 0, 0.3, 1); }
  66.67% { transform: translateX(-50%) rotate(15deg); animation-timing-function: cubic-bezier(0.62, 0, 0.3, 1); }
  100%   { transform: translateX(-50%) rotate(0deg); }
}
.rc-journey-content {
  position: absolute; top: 111px; left: 50%; transform: translateX(-50%); width: 660px;
  display: flex; flex-direction: column; align-items: center; text-align: center;
}
.rc-journey-heading {
  font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5; margin: 0 0 24px;
}
.rc-journey-sub {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #a4a59f; letter-spacing: -0.1px; line-height: 20px; margin: 0;
}

/* Slide 5: Care (recap.html:208-245) */
.rc-slide-care { background: #1f1f25; }
.rc-care-content {
  position: absolute; top: 121px; left: 50%; transform: translateX(-50%);
  width: 661px; text-align: center; display: flex; flex-direction: column; gap: 24px; align-items: center;
}
.rc-care-sub {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #a4a59f; letter-spacing: -0.1px; line-height: 20px; margin: 0;
}
.rc-care-heading {
  font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5; margin: 0;
}
.rc-care-cards { position: absolute; top: 292px; left: 108px; display: flex; gap: 12px; }
.rc-care-card {
  width: 318px; height: 376px; border-radius: 16px; overflow: hidden;
  position: relative; flex-shrink: 0; background: #1f1f25; border: 1px solid #36363f; box-sizing: border-box;
}
.rc-care-card-label {
  position: absolute; top: 24px; left: 24px; right: 24px;
  font-family: var(--font-student-body); font-size: 20px; font-weight: 500;
  line-height: 1.1; letter-spacing: -0.4px; color: #f2f3e5;
}
.rc-care-card-shape { position: absolute; left: 118px; top: 150px; width: 300px; height: 300px; }
.rc-care-card-shape img { width: 100%; height: 100%; display: block; object-fit: contain; }
.rc-care-card-num {
  position: absolute; left: 268px; top: 264px; transform: translateX(-50%);
  font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5;
}

/* Slide 6: Final (recap.html:258-284) */
.rc-slide-final { background: #1f1f25; }
.rc-final-bg { position: absolute; inset: 0; }
.rc-final-bg img { width: 100%; height: 100%; display: block; object-fit: cover; }
.rc-final-wave {
  position: absolute; left: 50%; top: 50%;
  width: 1194px; height: 834px; transform: translate(-50%, -50%) scale(6);
  transform-origin: center; pointer-events: none; z-index: 1;
}
.rc-final-content {
  position: absolute; left: 50%; top: 50%; transform: translate(-50%, -55%);
  width: 661px; text-align: center; display: flex; flex-direction: column; gap: 24px; align-items: center; z-index: 2;
}
.rc-final-label {
  font-family: var(--font-student-body); font-size: 16px; font-weight: 500;
  color: #f2f3e5; letter-spacing: -0.1px; line-height: 20px; margin: 0;
}
.rc-final-heading {
  font-family: var(--font-student-display); font-weight: 400; font-size: 64px; line-height: 1.06;
  letter-spacing: 1.5px; color: #f2f3e5; margin: 0;
}
`
