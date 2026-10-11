/**
 * Builds the README mockups and the GitHub social preview from the raw
 * captures in tools/screenshots/out/ (made by `npx playwright test -c tools/screenshots`).
 *
 *   node tools/screenshots/compose.mjs
 *
 * Each composition is an HTML page with CSS device frames, rendered by
 * Chromium and squeezed with pngquant (when installed). Output: docs/media/.
 * Colours and type follow the BeatByte artwork: near-black violet, a white
 * wordmark flowing into violet, a heavy geometric face (Montserrat 900) and
 * widely spaced uppercase lines.
 */
import { chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
const BUILD = path.join(HERE, 'build');
const MEDIA = path.join(ROOT, 'docs/media');
fs.mkdirSync(BUILD, { recursive: true });
fs.mkdirSync(MEDIA, { recursive: true });

const img = name => `../out/${name}.png`;

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%}
body{font-family:Montserrat,system-ui,sans-serif;color:#fff;overflow:hidden;
  background:
    radial-gradient(60% 70% at 50% 110%, rgba(168,85,247,.38), transparent 70%),
    radial-gradient(40% 50% at 8% 0%, rgba(124,58,237,.30), transparent 70%),
    radial-gradient(40% 50% at 92% 0%, rgba(217,70,239,.22), transparent 70%),
    #07040d;}
.grain{position:absolute;inset:0;pointer-events:none;opacity:.5;
  background-image:radial-gradient(rgba(255,255,255,.035) 1px, transparent 1px);background-size:3px 3px}
.word{font-weight:900;letter-spacing:-.01em;line-height:.9;text-transform:uppercase}
.word .v{background:linear-gradient(90deg,#a78bfa 0%,#c084fc 45%,#e879f9 100%);-webkit-background-clip:text;background-clip:text;color:transparent}
.track{text-transform:uppercase;letter-spacing:.42em;font-weight:500}
.glow{filter:drop-shadow(0 30px 80px rgba(168,85,247,.45))}
/* Devices */
.laptop{position:absolute}
.laptop .lid{background:#0d0b12;border:2px solid #2a2433;border-radius:22px;padding:14px;box-shadow:0 0 0 1px #000 inset}
.laptop .lid img{display:block;width:100%;border-radius:8px}
.laptop .base{height:18px;margin:0 -6%;background:linear-gradient(#2b2532,#16121b);border-radius:0 0 18px 18px;position:relative}
.laptop .base:after{content:"";position:absolute;left:42%;right:42%;top:0;height:7px;background:#0b0910;border-radius:0 0 8px 8px}
.phone{position:absolute;background:#0d0b12;border:2px solid #2f2838;border-radius:52px;padding:12px;box-shadow:0 30px 80px rgba(0,0,0,.6)}
.phone{padding-top:52px}
.phone img{display:block;width:100%;border-radius:0 0 40px 40px}
.phone:before{content:"";position:absolute;top:22px;left:50%;width:96px;height:26px;margin-left:-48px;background:#000;border-radius:20px;z-index:2}
.tv{position:absolute}
.tv .panel{background:#050407;border:2px solid #221d29;border-radius:14px;padding:10px}
.tv .panel img{display:block;width:100%;border-radius:4px}
.tv .stand{width:30%;height:44px;margin:0 auto;background:linear-gradient(#1d1823,#0e0b12);clip-path:polygon(38% 0,62% 0,100% 100%,0 100%)}
.label{position:absolute;font-size:15px;font-weight:700;letter-spacing:.32em;text-transform:uppercase;color:#d8b4fe}
`;

const page = (title, w, h, body) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
<style>${BASE_CSS} body{width:${w}px;height:${h}px;position:relative}</style></head>
<body><div class="grain"></div>${body}</body></html>`;

const icon = d => `<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="#c084fc" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICONS = {
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2" fill="#c084fc"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0z"/><path d="M7 6H4a3 3 0 0 0 3 4M17 6h3a3 3 0 0 1-3 4M12 14v4M8 20h8"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  tv: '<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',
};

const feature = (k, title, sub) => `
  <div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:26px">
    ${icon(ICONS[k])}
    <div><div style="font-weight:700;font-size:15px;letter-spacing:.14em;text-transform:uppercase">${title}</div>
    <div style="font-size:11.5px;letter-spacing:.18em;text-transform:uppercase;color:#a29bb0;margin-top:5px">${sub}</div></div>
  </div>`;

const jobs = [
  {
    name: 'social-preview', w: 1280, h: 640,
    html: page('Social preview', 1280, 640, `
      <div style="position:absolute;top:44px;left:0;right:0;text-align:center">
        <div class="word" style="font-size:86px">State of the <span class="v">Dart</span></div>
        <div class="track" style="font-size:17px;margin-top:22px">Score it. Read it. Celebrate it.</div>
        <div class="track" style="font-size:11.5px;margin-top:14px;color:#b9a3e3;letter-spacing:.38em">Open-source dart scoring PWA · React + TypeScript</div>
      </div>
      <div style="position:absolute;left:52px;top:268px;width:300px">
        ${feature('target', 'X01 · Cricket · more', 'Shanghai · clock · training')}
        ${feature('chart', 'Live stats', 'Heatmaps · averages · charts')}
        ${feature('trophy', '463 achievements', 'Personal bests live')}
        ${feature('tv', 'TV scoreboard', 'Second screen · live')}
      </div>
      <div style="position:absolute;right:56px;top:276px;text-align:right;font-size:13px;line-height:2.15;letter-spacing:.32em;text-transform:uppercase;color:#cfc4e6">
        React 19<br>TypeScript<br>Material 3<br>PWA · Offline<br>Open source
        <div style="width:54px;height:2px;background:#a855f7;margin:14px 0 0 auto"></div>
      </div>
      <div class="laptop glow" style="left:388px;top:268px;width:504px">
        <div class="lid" style="padding:9px;border-radius:16px"><img src="${img('game-desktop')}"></div><div class="base" style="height:13px"></div>
      </div>
    `),
  },
  {
    name: 'mockup-hero', w: 1800, h: 1000,
    html: page('Hero', 1800, 1000, `
      <div style="position:absolute;top:48px;left:0;right:0;text-align:center">
        <div class="word" style="font-size:64px">State of the <span class="v">Dart</span></div>
        <div class="track" style="font-size:15px;margin-top:18px">Phone · laptop · TV — one match, every screen</div>
      </div>
      <div class="tv" style="left:70px;top:230px;width:760px;opacity:.96">
        <div class="panel"><img src="${img('scoreboard-tv')}"></div><div class="stand"></div>
      </div>
      <div class="laptop glow" style="left:560px;top:330px;width:900px">
        <div class="lid"><img src="${img('game-desktop')}"></div><div class="base"></div>
      </div>
      <div class="phone" style="left:1440px;top:250px;width:300px"><img src="${img('game-phone')}"></div>
    `),
  },
  {
    name: 'mockup-game', w: 1600, h: 1000,
    html: page('Game', 1600, 1000, `
      <div class="label" style="top:56px;left:0;right:0;text-align:center">Arena · spotlight on the player at the oche</div>
      <div class="laptop glow" style="left:150px;top:120px;width:1300px">
        <div class="lid"><img src="${img('game-desktop')}"></div><div class="base"></div>
      </div>
    `),
  },
  {
    name: 'mockup-phone', w: 1600, h: 1000,
    html: page('Phone', 1600, 1000, `
      <div class="phone glow" style="left:190px;top:60px;width:400px"><img src="${img('game-phone')}"></div>
      <div style="position:absolute;left:700px;top:300px;width:760px">
        <div class="word" style="font-size:58px">Thumb <span class="v">first</span></div>
        <div class="track" style="font-size:14px;margin-top:22px;line-height:2">Input docked in reach<br>Stats &amp; heatmap in a sheet<br>Every visit in one tap</div>
      </div>
    `),
  },
  {
    name: 'mockup-tv', w: 1600, h: 1000,
    html: page('TV', 1600, 1000, `
      <div class="label" style="top:56px;left:0;right:0;text-align:center">TV scoreboard · live on a second screen</div>
      <div class="tv glow" style="left:110px;top:120px;width:1380px">
        <div class="panel"><img src="${img('scoreboard-180')}"></div><div class="stand"></div>
      </div>
    `),
  },
  {
    name: 'mockup-wheel', w: 1600, h: 1000,
    html: page('Wheel', 1600, 1000, `
      <div style="position:absolute;left:110px;top:330px;width:620px">
        <div class="word" style="font-size:58px">Who throws <span class="v">first?</span></div>
        <div class="track" style="font-size:14px;margin-top:22px;line-height:2">Real friction &amp; drag<br>A click on every peg<br>The winner steps forward</div>
      </div>
      <div class="glow" style="position:absolute;left:880px;top:90px;width:560px">
        <img src="${img('wheel-dialog')}" style="display:block;width:100%;border-radius:36px;border:2px solid #2f2838">
      </div>
    `),
  },
  {
    name: 'mockup-stats', w: 1600, h: 1000,
    html: page('Stats', 1600, 1000, `
      <div class="label" style="top:56px;left:0;right:0;text-align:center">Statistics · insights during the match</div>
      <div class="laptop glow" style="left:90px;top:150px;width:900px">
        <div class="lid"><img src="${img('stats')}"></div><div class="base"></div>
      </div>
      <div class="phone" style="left:1060px;top:120px;width:440px;border-radius:30px;padding:10px">
        <img src="${img('insights')}" style="border-radius:20px">
      </div>
    `),
  },
  {
    name: 'mockup-home', w: 1600, h: 1000,
    html: page('Home', 1600, 1000, `
      <div class="label" style="top:56px;left:0;right:0;text-align:center">Home · rematch in one tap</div>
      <div class="laptop glow" style="left:150px;top:120px;width:1300px">
        <div class="lid"><img src="${img('home')}"></div><div class="base"></div>
      </div>
    `),
  },
  {
    name: 'mockup-achievements', w: 1600, h: 1000,
    html: page('Achievements', 1600, 1000, `
      <div class="label" style="top:56px;left:0;right:0;text-align:center">463 achievements · leaderboards</div>
      <div class="laptop glow" style="left:60px;top:170px;width:880px">
        <div class="lid"><img src="${img('achievements')}"></div><div class="base"></div>
      </div>
      <div class="laptop" style="left:980px;top:300px;width:560px">
        <div class="lid" style="padding:9px"><img src="${img('leaderboard')}"></div><div class="base" style="height:12px"></div>
      </div>
    `),
  },
];

const browser = await chromium.launch();
const ctx = await browser.newContext({ deviceScaleFactor: 1 });
const tab = await ctx.newPage();
for (const job of jobs) {
  const file = path.join(BUILD, `${job.name}.html`);
  fs.writeFileSync(file, job.html);
  await tab.setViewportSize({ width: job.w, height: job.h });
  await tab.goto(`file://${file}`);
  await tab.evaluate(() => document.fonts.ready);
  await tab.waitForTimeout(300);
  const target = path.join(MEDIA, `${job.name}.png`);
  await tab.screenshot({ path: target });
  try {
    execFileSync('pngquant', ['--force', '--quality=72-92', '--skip-if-larger', '--output', target, target]);
  } catch { /* pngquant missing or no gain: keep the PNG as is */ }
  console.log(`${job.name}.png  ${(fs.statSync(target).size / 1024).toFixed(0)} KB`);
}
await browser.close();
