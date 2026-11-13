/*
 * Commit city: the last twelve months of GitHub contributions as an
 * isometric 3D skyline, one bar per day, written to an animated SVG.
 * The bars rise week by week when the image loads; today's bar glows.
 *
 *   node city.mjs <username> <output.svg>
 *
 * Data: GitHub's GraphQL API when GITHUB_TOKEN is set (as in the Action),
 * otherwise a public mirror of the same calendar. No dependencies.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const [user = 'TanmoyBiswas478', out = 'assets/city.svg'] = process.argv.slice(2);

/* ------------------------------ Data ------------------------------ */

const LEVELS = { NONE: 0, FIRST_QUARTILE: 1, SECOND_QUARTILE: 2, THIRD_QUARTILE: 3, FOURTH_QUARTILE: 4 };

async function fromGraphQL(token) {
  const query = `query ($login: String!) { user(login: $login) { contributionsCollection { contributionCalendar {
    totalContributions weeks { contributionDays { date contributionCount contributionLevel } } } } } }`;
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${token}`, 'content-type': 'application/json', 'user-agent': 'commit-city' },
    body: JSON.stringify({ query, variables: { login: user } }),
  });
  const json = await response.json();
  const calendar = json?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar) throw new Error(json?.errors?.[0]?.message || `GraphQL ${response.status}`);
  return {
    total: calendar.totalContributions,
    days: calendar.weeks.flatMap((w) => w.contributionDays.map((d) => ({
      date: d.date, count: d.contributionCount, level: LEVELS[d.contributionLevel] ?? 0,
    }))),
  };
}

async function fromMirror() {
  const response = await fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`);
  if (!response.ok) throw new Error(`mirror ${response.status}`);
  const data = await response.json();
  return { total: data.total.lastYear, days: data.contributions };
}

async function load() {
  if (process.env.GITHUB_TOKEN) {
    try { return await fromGraphQL(process.env.GITHUB_TOKEN); } catch (error) { console.warn('GraphQL failed:', error.message); }
  }
  return fromMirror();
}

function summarise(days) {
  let longest = 0, run = 0, best = days[0];
  for (const day of days) {
    run = day.count ? run + 1 : 0;
    longest = Math.max(longest, run);
    if (day.count > best.count) best = day;
  }
  let current = 0, i = days.length - 1;
  if (days[i]?.count === 0) i--;               // no commit yet today does not break a streak
  for (; i >= 0 && days[i].count; i--) current++;
  return { longest, current, best, active: days.filter((d) => d.count).length };
}

/* ------------------------------ Drawing ------------------------------ */

const W = 1200, H = 640;
const S = 18.6;                                 // size of one day's tile
// A three-quarter view: weeks run almost level to the right, weekdays
// step down to the left, so the whole year reads as one long skyline.
const WEEK = [0.95, 0.19], DAY = [-0.56, 0.44];
const ORIGIN = { x: 150, y: 250 };              // screen position of week 0, Sunday

const VIOLET = [139, 123, 255], CORAL = [255, 107, 139], EMPTY = [43, 37, 80];
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const rgb = (c, k = 1) => `rgb(${c.map((v) => Math.round(v * k)).join(',')})`;
const COLORS = [EMPTY, VIOLET, mix(VIOLET, CORAL, 1 / 3), mix(VIOLET, CORAL, 2 / 3), CORAL];

/** Screen point for grid position (week, weekday) at height z. */
const at = (week, weekday, z = 0) => [
  ORIGIN.x + (week * WEEK[0] + weekday * DAY[0]) * S,
  ORIGIN.y + (week * WEEK[1] + weekday * DAY[1]) * S - z,
];
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

function bar(week, weekday, height, color, delay, isToday) {
  const g = 0.14;                               // gap between neighbouring bars
  const a = week + g, b = week + 1 - g, c = weekday + g, d = weekday + 1 - g;
  const top = [at(a, c, height), at(b, c, height), at(b, d, height), at(a, d, height)];
  const left = [at(a, d, height), at(b, d, height), at(b, d), at(a, d)];
  const right = [at(b, c, height), at(b, d, height), at(b, d), at(b, c)];
  const flat = height < 3;
  const cls = isToday ? 'b t' : flat ? 'f' : 'b';
  return `<g class="${cls}" style="animation-delay:${delay.toFixed(2)}s">`
    + (flat ? '' : `<polygon points="${pts(left)}" fill="${rgb(color, 0.62)}"/><polygon points="${pts(right)}" fill="${rgb(color, 0.42)}"/>`)
    + `<polygon points="${pts(top)}" fill="${rgb(color)}"/></g>`;
}

const fmt = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function render({ total, days }) {
  const stats = summarise(days);
  const offset = new Date(`${days[0].date}T00:00:00Z`).getUTCDay();
  const weeks = Math.ceil((offset + days.length) / 7);
  const max = Math.max(1, ...days.map((d) => d.count));

  const cells = days.map((day, i) => {
    const slot = offset + i;
    return { ...day, week: Math.floor(slot / 7), weekday: slot % 7, today: i === days.length - 1 };
  });
  // Painter's order: back (small week+weekday) to front.
  const depth = (c) => c.week * WEEK[1] + c.weekday * DAY[1];
  cells.sort((p, q) => depth(p) - depth(q));

  const city = cells.map((c) => {
    const height = c.count ? 10 + 95 * Math.sqrt(c.count / max) : 1.5;
    return bar(c.week, c.weekday, height, COLORS[Math.min(4, c.level ?? 0)], 0.3 + (c.week / weeks) * 1.6, c.today);
  }).join('');

  // The plinth under the city.
  const p = 0.5;
  const base = [at(-p, -p), at(weeks + p, -p), at(weeks + p, 7 + p), at(-p, 7 + p)];
  const baseSide = [at(-p, 7 + p), at(weeks + p, 7 + p), at(weeks + p, 7 + p, -10), at(-p, 7 + p, -10)];
  const baseEnd = [at(weeks + p, -p), at(weeks + p, 7 + p), at(weeks + p, 7 + p, -10), at(weeks + p, -p, -10)];

  const stat = (x, value, label) => `<g transform="translate(${x} 566)"><text class="v" y="0">${esc(value)}</text><text class="l" y="24">${esc(label)}</text></g>`;
  const first = fmt(days[0].date), last = fmt(days.at(-1).date);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(`${user}: ${total} contributions in the last year, shown as a 3D city`)}">
<title>${esc(`${total} contributions in the last year`)}</title>
<defs>
  <radialGradient id="bg" cx="50%" cy="100%" r="90%"><stop offset="0" stop-color="#1b1442"/><stop offset=".65" stop-color="#07060d"/></radialGradient>
  <linearGradient id="grad" x1="0" x2="1"><stop offset="0" stop-color="#8b7bff"/><stop offset="1" stop-color="#ff6b8b"/></linearGradient>
  <radialGradient id="glow"><stop offset="0" stop-color="#ff6b8b" stop-opacity=".55"/><stop offset="1" stop-color="#ff6b8b" stop-opacity="0"/></radialGradient>
</defs>
<style>
  text { font-family: 'Segoe UI', -apple-system, 'Helvetica Neue', Arial, sans-serif; }
  .k { font: 500 13px ui-monospace, 'SFMono-Regular', Consolas, monospace; letter-spacing: .12em; fill: #918da8; }
  .h { font-size: 30px; font-weight: 600; fill: #f4f3f9; letter-spacing: -.02em; }
  .v { font-size: 34px; font-weight: 600; fill: #f4f3f9; letter-spacing: -.03em; }
  .l { font: 400 12.5px ui-monospace, Consolas, monospace; fill: #918da8; letter-spacing: .04em; }
  .b { transform-box: fill-box; transform-origin: 50% 100%; animation: rise 1.1s cubic-bezier(.2,.8,.2,1) both; }
  .f { animation: fade .8s ease both; }
  .t polygon:last-child { animation: pulse 2.4s ease-in-out 2.6s infinite; }
  .in { animation: fade 1s ease both; }
  @keyframes rise { from { transform: scaleY(0); } }
  @keyframes fade { from { opacity: 0; } }
  @keyframes pulse { 50% { fill: #ffffff; } }
  @media (prefers-reduced-motion: reduce) { .b, .f, .in, .t polygon { animation: none !important; } }
</style>
<rect width="${W}" height="${H}" rx="18" fill="url(#bg)"/>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="18" fill="none" stroke="#ffffff" stroke-opacity=".08"/>
<g class="in">
  <text class="k" x="48" y="58">GITHUB · LAST 12 MONTHS · ${esc(first.toUpperCase())} – ${esc(last.toUpperCase())}</text>
  <text class="h" x="48" y="98">Every commit, built up in 3D.</text>
  <rect x="48" y="112" width="120" height="3" rx="1.5" fill="url(#grad)"/>
</g>
<polygon points="${pts(base)}" fill="#17113a"/>
<polygon points="${pts(baseSide)}" fill="#100c29"/>
<polygon points="${pts(baseEnd)}" fill="#0c0920"/>
${city}
<g class="in" style="animation-delay:1.6s">
  <line x1="48" x2="${W - 48}" y1="530" y2="530" stroke="#ffffff" stroke-opacity=".08"/>
  ${stat(48, total.toLocaleString('en-GB'), 'CONTRIBUTIONS')}
  ${stat(318, stats.active, 'ACTIVE DAYS')}
  ${stat(588, `${stats.longest} days`, `LONGEST STREAK · NOW ${stats.current}`)}
  ${stat(888, stats.best.count, `BUSIEST DAY · ${fmt(stats.best.date).toUpperCase()}`)}
</g>
<g class="in" transform="translate(${W - 230} 58)" style="animation-delay:1.2s">
  <text class="l" x="0" y="0">LESS</text>
  ${COLORS.map((c, i) => `<rect x="${44 + i * 22}" y="-11" width="14" height="14" rx="3" fill="${rgb(c)}"/>`).join('')}
  <text class="l" x="158" y="0">MORE</text>
</g>
</svg>
`;
}

const data = await load();
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, render(data));
console.log(`Wrote ${out}: ${data.total} contributions over ${data.days.length} days`);
