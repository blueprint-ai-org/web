#!/usr/bin/env node
// Export the six helpers-onboarding card illustrations as 240×240 PNGs
// (Ø120 circle @2x, transparent corners) into app/assets/onboarding-helpers/.
//
// Source of truth: Figma frame 40000473:8671 (Blueprint Hand-off
// 5pJKXHl6uEEHzHDBQnoULW) — geometry captured in
// scripts/helper-card-art/design-context.tsx; SVG parts committed in
// scripts/helper-card-art/src/<sha1>.svg (hash filenames from the Figma MCP).
//
// For each card we emit a temp 120×120 HTML page reproducing that card's
// "Avatar" circle exactly as captured (circle border-radius 50% +
// overflow hidden; bg #cbd1f5 where applicable; absolutely-positioned <img>
// parts with the captured offsets/rotations; Anton from Google Fonts for the
// sleep card's "z z z" glyphs), then rasterize it with headless Chrome at
// --force-device-scale-factor=2 over a transparent background.
//
// Usage: node scripts/export-helper-card-art.mjs

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC_DIR = path.join(__dirname, "helper-card-art", "src");
const OUT_DIR = path.join(__dirname, "..", "app", "assets", "onboarding-helpers");
const CHROME =
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

// Anton (the student display font) embedded as a base64 @font-face so the
// sleep card's "z z z" glyphs render without a Google-Fonts network request —
// headless Chrome otherwise stalls waiting on the font fetch and never exits.
// The woff2 (latin subset, OFL) is committed alongside the SVG parts.
const ANTON_DATA_URI = `data:font/woff2;base64,${fs
  .readFileSync(path.join(__dirname, "helper-card-art", "anton.woff2"))
  .toString("base64")}`;

/** Inline a committed part-SVG as a data URI (keeps the temp pages free of
 *  file:// subresource quirks while staying plain `<img>` elements). */
function part(hash) {
  const buf = fs.readFileSync(path.join(SRC_DIR, `${hash}.svg`));
  return `data:image/svg+xml;base64,${buf.toString("base64")}`;
}

// Part constants — names mirror design-context.tsx.
const imgPolygon = part("94fc4bbc8a310b536de341ad95338b5dfe8856a7");
const imgGroup111 = part("4287125557f500ba716aee5c30ffaf39f402a6c7");
const imgEllipse45 = part("2d5f918893fb6de6ca18470b11216675289bf8a7");
const imgShell = part("f00ff89e0837a612cfe62b4517a5856482ab9e13");
const imgGroup113 = part("19246103f76c299e10d8ca1b380b2451f6f6b3f9");
const imgGroup112 = part("aa2e64a4b79e7edd27aa56df3b58ac2694275c69");
const imgSoftFlower = part("e99054b1dcecebcd16212d2f4248c287d2b82482");
const imgGroup114 = part("db85420683881341dc2a22ab17e6f27f5a3d9409");
const imgGroup115 = part("dbd4f0ce8075f154ff593871dc33a35622d732a4");
const imgEllipse22 = part("cecf923f43a94ba03a7453292bf7d63faa4e31f7");
const imgPolygon1 = part("c761f3536a704dd76ac6977a7c0a767558c8dc0e");
const imgGroup116 = part("129c22cee5761ccd110c286a73cf21ce6aea2417");
const imgGroup117 = part("4dc86aff60d375472e6b2234da275129e4011d1e");
const imgEllipse46 = part("603a3abc455e1fd276c951e69c5b157b1562122d");
const imgAvatarMeal = part("e86419dcee6e9db3fbb2381a109e035a1a987f9f");
const imgAvatarSport = part("1e5108f78f5209a2817aa67c2d17016a6c1942a2");
const imgFrame1289 = part("7cafdd3d17dbcb7a14dc68391bd8638184d77869");
const imgEllipse47 = part("648d8d112a50fb73bf67f1f09c9980f3ff7b7517");
const imgGroup119 = part("54da48dd165043be82a161dbb3b76ec8853437fe");
const imgGroup118 = part("695814ae2e62d1cb4bb5465104b66c4fcc494245");
const imgGroup121 = part("4dd7af935593712eeaea080402f44994d5cfa5fe");

/** 120×120 transparent page shell. `font` embeds Anton (local, no network). */
function page(title, body, { font = false } = {}) {
  const fontFace = font
    ? `@font-face { font-family: 'Anton'; font-style: normal; font-weight: 400; src: url(${ANTON_DATA_URI}) format('woff2'); }`
    : "";
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  ${fontFace}
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 120px; height: 120px; background: transparent; overflow: hidden; }
  img { display: block; }
  /* Positioned stage so card art's calc(50% …) offsets resolve against this
     120×120 box. Without a positioned ancestor, %-based left/top on an
     absolutely-positioned element resolve against the initial containing
     block and the element lands off-canvas (blanks the friends circle). */
  #stage { position: relative; width: 120px; height: 120px; overflow: hidden; }
</style>
</head>
<body>
<div id="stage">${body}</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Card bodies — geometry transcribed 1:1 from design-context.tsx (node ids in
// comments). DOM order is preserved (later siblings paint on top, as in Figma).
// ---------------------------------------------------------------------------

// Card 40000473:8679 — "a good sleep": #cbd1f5 circle, dark polygon face
// rotated 180°, closed eyes, mouth dot, three Anton "z" glyphs.
function aGoodSleepBody() {
  const z = (x, y) =>
    `<div style="position:absolute; left:${x}px; top:${y}px; transform:translate(-50%,-50%); font-family:'Anton',sans-serif; font-size:20px; line-height:1.05; color:#f2f3e5; text-transform:uppercase; text-align:center; white-space:nowrap;">z</div>`;
  return `<div style="position:absolute; left:0; top:0; width:120px; height:120px; border-radius:50%; overflow:hidden; background:#cbd1f5;">
  <!-- Polygon face (254:10056, rotate 180) -->
  <div style="position:absolute; left:-8px; top:12px; width:137px; height:137px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:rotate(180deg); position:relative; width:137px; height:137px;">
      <div style="position:absolute; top:2.41%; right:4.24%; bottom:9.55%; left:4.24%;">
        <img src="${imgPolygon}" style="width:100%; height:100%;">
      </div>
    </div>
  </div>
  <!-- Eyes (254:10057 / 254:10059) -->
  <img src="${imgGroup111}" style="position:absolute; left:29.38px; top:42px; width:28px; height:28px;">
  <img src="${imgGroup111}" style="position:absolute; left:62.62px; top:42px; width:28px; height:28px;">
  <!-- Mouth (254:10061) -->
  <img src="${imgEllipse45}" style="position:absolute; left:56px; top:84px; width:8px; height:8px;">
  <!-- "z z z" (254:10062) -->
  ${z(70.5, 30.5)}
  ${z(79.5, 22.5)}
  ${z(88.5, 26.5)}
</div>`;
}

// Card 40000473:8680 — "friends": Ø112.434 #cbd1f5 circle centered in the
// 120 page; shell friend (bottom), flower friend (left), polygon friend
// (front), each with their own eyes/mouth.
function friendsBody() {
  return `<div style="position:absolute; left:calc(50% - 0.28px); top:calc(50% + 0.22px); transform:translate(-50%,-50%); width:112.434px; height:112.434px; border-radius:50%; overflow:hidden; background:#cbd1f5;">
  <!-- Shell friend (280:11526, rotate 180) -->
  <div style="position:absolute; left:21px; top:calc(50% + 27.28px); transform:translateY(-50%); width:148px; height:129px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:rotate(180deg); position:relative; width:148px; height:129px;">
      <img src="${imgShell}" style="position:absolute; inset:0; width:100%; height:100%;">
    </div>
  </div>
  <!-- Shell friend eyes (280:11478; left eye rotate 180 + flip) -->
  <div style="position:absolute; left:calc(50% + 40.59px); top:calc(50% - 11px); transform:translate(-50%,-50%); width:51.59px; height:23.932px; display:flex; align-items:center; gap:3.726px;">
    <div style="flex:none; display:flex; align-items:center; justify-content:center;">
      <div style="flex:none; transform:rotate(180deg) scaleY(-1); position:relative; width:23.932px; height:23.932px;">
        <img src="${imgGroup113}" style="position:absolute; inset:0; width:100%; height:100%;">
      </div>
    </div>
    <div style="flex:none; position:relative; width:23.933px; height:23.932px;">
      <img src="${imgGroup112}" style="position:absolute; inset:0; width:100%; height:100%;">
    </div>
  </div>
  <!-- Flower friend (280:11476) -->
  <img src="${imgSoftFlower}" style="position:absolute; left:calc(50% - 41.49px); top:calc(50% - 26.49px); transform:translate(-50%,-50%); width:115.457px; height:115.457px;">
  <div style="position:absolute; left:calc(50% - 27.17px); top:calc(50% - 30.49px); transform:translate(-50%,-50%); width:52.757px; height:24.125px; display:flex; align-items:center; gap:4.507px;">
    <img src="${imgGroup114}" style="flex:none; width:24.125px; height:24.125px;">
    <img src="${imgGroup115}" style="flex:none; width:24.125px; height:24.125px;">
  </div>
  <div style="position:absolute; left:calc(50% - 27.17px); top:25.93px; transform:translateX(-50%); width:24.124px; height:24.124px;">
    <div style="position:absolute; top:70.07%; right:14.64%; bottom:0; left:11.41%;">
      <img src="${imgEllipse22}" style="width:100%; height:100%;">
    </div>
  </div>
  <!-- Polygon friend (280:11428, rotate 180) -->
  <div style="position:absolute; left:-6.58px; top:42px; width:128.362px; height:128.362px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:rotate(180deg); position:relative; width:128.362px; height:128.362px;">
      <div style="position:absolute; top:2.41%; right:4.24%; bottom:9.55%; left:4.24%;">
        <img src="${imgPolygon1}" style="width:100%; height:100%;">
      </div>
    </div>
  </div>
  <!-- Polygon friend eyes + mouth (280:11429 / 280:11433 / 280:11436) -->
  <img src="${imgGroup116}" style="position:absolute; left:27.53px; top:65.84px; width:26.235px; height:26.235px;">
  <img src="${imgGroup117}" style="position:absolute; left:58.67px; top:65.84px; width:26.235px; height:26.235px;">
  <img src="${imgEllipse46}" style="position:absolute; left:51.97px; top:99.01px; width:6.98px; height:6.98px;">
</div>`;
}

// Card 40000473:8683 — "art/music": #cbd1f5 circle, coral headphone pads
// (rotated), headband arc, dark polygon face rotated 180°, eyes (right eye
// flipped vertically), mouth dot.
function artMusicBody() {
  return `<div style="position:absolute; left:0; top:0; width:120px; height:120px; border-radius:50%; overflow:hidden; background:#cbd1f5;">
  <!-- Left headphone pad (280:11613, rotate 19.9deg) -->
  <div style="position:absolute; left:-8px; top:36px; width:28.157px; height:37.156px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:rotate(19.9deg); width:18px; height:33px; border-radius:4px; background:#e65800;"></div>
  </div>
  <!-- Right headphone pad (280:11614, rotate 160.1deg + flip) -->
  <div style="position:absolute; left:101px; top:39px; width:28.157px; height:37.156px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:rotate(160.1deg) scaleY(-1); width:18px; height:33px; border-radius:4px; background:#e65800;"></div>
  </div>
  <!-- Headband (280:11609; art bleeds past the box via negative insets) -->
  <div style="position:absolute; left:calc(50% - 0.5px); top:22px; transform:translateX(-50%); width:102.961px; height:29.5px;">
    <div style="position:absolute; top:-19.61%; right:-4.97%; bottom:-9.17%; left:-4.97%;">
      <img src="${imgFrame1289}" style="width:100%; height:100%;">
    </div>
  </div>
  <!-- Polygon face (280:11566, rotate 180) -->
  <div style="position:absolute; left:-8px; top:22px; width:137px; height:137px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:rotate(180deg); position:relative; width:137px; height:137px;">
      <div style="position:absolute; top:2.41%; right:4.24%; bottom:9.55%; left:4.24%;">
        <img src="${imgPolygon}" style="width:100%; height:100%;">
      </div>
    </div>
  </div>
  <!-- Mouth (280:11677) -->
  <img src="${imgEllipse47}" style="position:absolute; left:calc(50% - 0.5px); top:91px; transform:translateX(-50%); width:7px; height:7px;">
  <!-- Eyes (280:11580; right eye 280:11579 flipped vertically) -->
  <img src="${imgGroup119}" style="position:absolute; left:29.38px; top:55px; width:28px; height:28px;">
  <div style="position:absolute; left:62.62px; top:55px; width:28px; height:28px; display:flex; align-items:center; justify-content:center;">
    <div style="flex:none; transform:scaleY(-1); position:relative; width:28px; height:28px;">
      <img src="${imgGroup118}" style="position:absolute; inset:0; width:100%; height:100%;">
    </div>
  </div>
</div>`;
}

// Card 40000473:8684 — "a good talk": #cbd1f5 circle, small flower friend
// (left, with eyes + mouth) and big flower (right, clipped by the circle).
function aGoodTalkBody() {
  return `<div style="position:absolute; left:0; top:0; width:120px; height:120px; border-radius:50%; overflow:hidden; background:#cbd1f5;">
  <!-- Small flower (280:11698) -->
  <img src="${imgSoftFlower}" style="position:absolute; left:calc(50% - 57.27px); top:calc(50% - 7.27px); transform:translate(-50%,-50%); width:115.457px; height:115.457px;">
  <!-- Small flower eyes (280:11699) -->
  <div style="position:absolute; left:calc(50% - 42.96px); top:calc(50% - 11.27px); transform:translate(-50%,-50%); width:52.757px; height:24.125px; display:flex; align-items:center; gap:4.507px;">
    <img src="${imgGroup114}" style="flex:none; width:24.125px; height:24.125px;">
    <img src="${imgGroup115}" style="flex:none; width:24.125px; height:24.125px;">
  </div>
  <!-- Small flower mouth (280:11706) -->
  <div style="position:absolute; left:calc(50% - 42.96px); top:48.93px; transform:translateX(-50%); width:24.124px; height:24.124px;">
    <div style="position:absolute; top:70.07%; right:14.64%; bottom:0; left:11.41%;">
      <img src="${imgEllipse22}" style="width:100%; height:100%;">
    </div>
  </div>
  <!-- Big flower (280:11717, clipped by the circle) -->
  <img src="${imgGroup121}" style="position:absolute; left:50px; top:-15px; width:147.675px; height:147.675px;">
</div>`;
}

// Cards 40000473:8681 ("a good meal") / 40000473:8682 ("sport") are single
// flat SVGs that carry their own circular background — wrap in a 120×120 img.
function flatBody(src) {
  return `<img src="${src}" style="position:absolute; left:0; top:0; width:120px; height:120px;">`;
}

const CARDS = [
  { id: "a-good-sleep", body: aGoodSleepBody(), font: true },
  { id: "friends", body: friendsBody() },
  { id: "a-good-meal", body: flatBody(imgAvatarMeal) },
  { id: "sport", body: flatBody(imgAvatarSport) },
  { id: "art-music", body: artMusicBody() },
  { id: "a-good-talk", body: aGoodTalkBody() },
];

// ---------------------------------------------------------------------------
// Rasterize
// ---------------------------------------------------------------------------

if (!fs.existsSync(CHROME)) {
  console.error(`Chrome not found at: ${CHROME}`);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "helper-card-art-"));
let failed = false;
try {
  for (const card of CARDS) {
    const htmlPath = path.join(tmpDir, `${card.id}.html`);
    fs.writeFileSync(htmlPath, page(card.id, card.body, { font: card.font }));
    const outPath = path.join(OUT_DIR, `${card.id}.png`);
    fs.rmSync(outPath, { force: true });
    // `--headless=new` reliably writes the screenshot within a couple of
    // seconds but often hangs on exit (GPU/process teardown). We give it a
    // hard timeout and SIGKILL it; the PNG is already on disk by then, so a
    // timeout is not a failure — only a missing/empty file is.
    try {
      execFileSync(
        CHROME,
        [
          "--headless=new",
          `--screenshot=${outPath}`,
          "--window-size=120,120",
          "--force-device-scale-factor=2",
          "--default-background-color=00000000",
          "--virtual-time-budget=5000",
          "--disable-gpu",
          // Per-card throwaway profile so a running desktop Chrome can't clash
          // and a SIGKILL'd profile lock can't stall the next launch.
          `--user-data-dir=${path.join(tmpDir, `profile-${card.id}`)}`,
          "--no-first-run",
          "--hide-scrollbars",
          pathToFileURL(htmlPath).href,
        ],
        { stdio: "pipe", timeout: 20000, killSignal: "SIGKILL" },
      );
    } catch (err) {
      // ETIMEDOUT (Chrome hung after writing) is expected and benign; any
      // other failure is only real if it left us without a usable PNG.
      if (err.code !== "ETIMEDOUT" && !fs.existsSync(outPath)) {
        console.error(`FAIL ${card.id}.png — Chrome error: ${err.message}`);
        failed = true;
        continue;
      }
    }
    if (!fs.existsSync(outPath) || fs.statSync(outPath).size === 0) {
      console.error(`FAIL ${card.id}.png — Chrome produced no output`);
      failed = true;
      continue;
    }
    console.log(`ok ${path.relative(process.cwd(), outPath)} (${fs.statSync(outPath).size} bytes)`);
  }
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}

process.exit(failed ? 1 : 0);
