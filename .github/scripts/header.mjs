/*
 * Animated hero banner for the profile README: name and role over a
 * perspective field of particles rolling like a wave, violet into coral
 * (the portfolio's 3D colours). Pure CSS animation, so GitHub renders it.
 *
 *   node header.mjs <output.svg>
 * Run once; the banner does not depend on data.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const out = process.argv[2] || 'assets/header.svg';
const W = 1200, H = 340;

// A grid of points on a plane, seen in perspective from above the front edge.
const COLS = 46, ROWS = 13;
const VIOLET = [139, 123, 255], CORAL = [255, 107, 139];
const mix = (t) => VIOLET.map((v, i) => Math.round(v + (CORAL[i] - v) * t));

let dots = '';
for (let r = 0; r < ROWS; r++) {
  const depth = r / (ROWS - 1);               // 0 = far, 1 = near
  const scale = 0.35 + depth * 0.65;          // perspective shrink
  const y = 150 + depth * depth * 175;        // rows bunch up toward the horizon
  const spread = W * (0.55 + depth * 0.75);
  for (let c = 0; c < COLS; c++) {
    const u = c / (COLS - 1);
    const x = W * 0.62 + (u - 0.5) * spread;
    if (x < -10 || x > W + 10) continue;
    const [cr, cg, cb] = mix(u * 0.7 + depth * 0.3);
    const radius = (1.1 + scale * 2.1).toFixed(2);
    // Each dot bobs on the same keyframes; its phase (a negative delay)
    // follows its position, so together they read as a travelling wave.
    const phase = -((u * 2.2 + depth * 1.3) % 4).toFixed(2);
    const alpha = (0.25 + depth * 0.75 * (0.55 + 0.45 * Math.sin(u * Math.PI))).toFixed(2);
    dots += `<circle class="d r${Math.round(scale * 4)}" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${radius}" fill="rgb(${cr},${cg},${cb})" fill-opacity="${alpha}" style="animation-delay:${phase}s"/>`;
  }
}

const roles = ['Laravel systems for government & business', 'Payment and bank integrations', 'REST APIs, workflows and MIS reporting', 'Machine learning on the side'];
const ROLE_TIME = 3.2;
const cycle = roles.length * ROLE_TIME;
const roleText = roles.map((role, i) => `<text class="role" x="64" y="214" style="animation-delay:${(i * ROLE_TIME).toFixed(1)}s">${role.replace(/&/g, '&amp;')}</text>`).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Tanmoy Biswas, Associate Software Development Engineer at iLogitron Technologies">
<title>Tanmoy Biswas · Associate Software Development Engineer</title>
<defs>
  <radialGradient id="bg" cx="70%" cy="110%" r="95%"><stop offset="0" stop-color="#21184f"/><stop offset=".7" stop-color="#07060d"/></radialGradient>
  <linearGradient id="grad" x1="0" x2="1"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#ff6b8b"/></linearGradient>
  <linearGradient id="fadeL" x1="0" x2="1"><stop offset="0" stop-color="#07060d"/><stop offset=".42" stop-color="#07060d" stop-opacity=".85"/><stop offset=".62" stop-color="#07060d" stop-opacity="0"/></linearGradient>
  <clipPath id="card"><rect width="${W}" height="${H}" rx="18"/></clipPath>
</defs>
<style>
  text { font-family: 'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif; }
  .d { animation: bob 4s ease-in-out infinite; }
  .r1 { --a: -4px; } .r2 { --a: -7px; } .r3 { --a: -11px; } .r4 { --a: -15px; }
  .d.r1 { animation-name: b1; } .d.r2 { animation-name: b2; } .d.r3 { animation-name: b3; } .d.r4 { animation-name: b4; }
  @keyframes b1 { 50% { transform: translateY(-4px); } }
  @keyframes b2 { 50% { transform: translateY(-8px); } }
  @keyframes b3 { 50% { transform: translateY(-13px); } }
  @keyframes b4 { 50% { transform: translateY(-18px); } }
  .k { font: 500 13px ui-monospace, 'SFMono-Regular', Consolas, monospace; letter-spacing: .14em; fill: #bcb8cf; }
  .name { font-size: 64px; font-weight: 700; letter-spacing: -.035em; fill: #f4f3f9; }
  .role { font-size: 22px; font-weight: 500; fill: #f4f3f9; opacity: 0; animation: role ${cycle}s infinite; }
  @keyframes role {
    0% { opacity: 0; transform: translateY(10px); }
    ${(100 * 0.06 / roles.length).toFixed(2)}% { opacity: 1; transform: none; }
    ${(100 * 0.9 / roles.length).toFixed(2)}% { opacity: 1; transform: none; }
    ${(100 / roles.length).toFixed(2)}%, 100% { opacity: 0; transform: translateY(-10px); }
  }
  .in { animation: in 1s cubic-bezier(.2,.8,.2,1) both; }
  @keyframes in { from { opacity: 0; transform: translateY(14px); } }
  .dot { animation: blink 1.6s ease-in-out infinite; }
  @keyframes blink { 50% { opacity: .25; } }
  @media (prefers-reduced-motion: reduce) { .d, .role, .in, .dot { animation: none !important; } .role:first-of-type { opacity: 1; } }
</style>
<g clip-path="url(#card)">
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <g>${dots}</g>
  <rect width="${W}" height="${H}" fill="url(#fadeL)"/>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#ffffff" stroke-opacity=".08"/>
<g class="in">
  <circle class="dot" cx="70" cy="76" r="5" fill="#ff6b8b"/>
  <text class="k" x="86" y="81">ASSOCIATE SOFTWARE DEVELOPMENT ENGINEER · ILOGITRON TECHNOLOGIES</text>
</g>
<g class="in" style="animation-delay:.15s">
  <text class="name" x="60" y="156">Tanmoy Biswas</text>
  <rect x="64" y="174" width="150" height="4" rx="2" fill="url(#grad)"/>
</g>
<g class="in" style="animation-delay:.3s">${roleText}</g>
<g class="in" style="animation-delay:.45s"><text class="k" x="64" y="290">AGARTALA, INDIA · LARAVEL · PHP · PYTHON · MYSQL</text></g>
</svg>
`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, svg);
console.log(`Wrote ${out} (${(svg.length / 1024).toFixed(0)} KB)`);
