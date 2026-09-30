// ---- tiny helpers ----
const TILE = 32;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function dist(ax, ay, bx, by) { return Math.hypot(ax - bx, ay - by); }

// deterministic PRNG for map decoration
function mulberry32(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// rounded rect path
function rr(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawText(ctx, text, x, y, opts = {}) {
  const size = opts.size || 14;
  ctx.font = `${opts.bold ? "bold " : ""}${size}px "Courier New", monospace`;
  ctx.textAlign = opts.align || "left";
  ctx.textBaseline = opts.baseline || "top";
  if (opts.shadow !== false) {
    ctx.fillStyle = "rgba(0,0,0,.85)";
    ctx.fillText(text, x + 1, y + 1);
  }
  ctx.fillStyle = opts.color || "#e8eefc";
  ctx.fillText(text, x, y);
}

// wrap text into lines fitting maxW
function wrapText(ctx, text, maxW, fontSpec) {
  ctx.font = fontSpec;
  const words = String(text).split(/\s+/);
  const lines = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (ctx.measureText(test).width > maxW && cur) { lines.push(cur); cur = w; }
    else cur = test;
  }
  if (cur) lines.push(cur);
  return lines;
}

// simple AABB overlap
function aabb(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}
