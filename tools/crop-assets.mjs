// One-off cropper: slices the generated persona sheets into web-sized webp assets.
// Usage: node tools/crop-assets.mjs [--dry]   (--dry only prints the detected segments)
import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';

const SRC = 'C:/Users/pierre bassily/projects/biblee/church/Service Domains';
import { fileURLToPath } from 'node:url';
const OUT = fileURLToPath(new URL('../public/img/personas/', import.meta.url));
const DIRS = ['1 - Marketing and Content', '2 - Media and Design', '3 - Gamify and Engage', '4 - Admin and System', '5 - Event Management'];
const SCALE = 4; // analysis runs on a 1/4 size copy
const dry = process.argv.includes('--dry');

// Find horizontal runs of "busy" columns (figures) inside a vertical band of a sheet.
async function segments(file, y0f, y1f) {
  const { data, info } = await sharp(file).resize({ width: 688 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  const y0 = Math.floor(h * y0f), y1 = Math.floor(h * y1f), rows = y1 - y0;
  const energy = new Float32Array(w);
  for (let x = 1; x < w - 1; x++) {
    let s = 0;
    for (let y = y0; y < y1; y++) s += Math.abs(data[y * w + x + 1] - data[y * w + x - 1]);
    energy[x] = s / rows;
  }
  const busy = Array.from(energy, (e) => e > 2.2);
  const runs = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    if (x < w && busy[x]) { if (start < 0) start = x; }
    else if (start >= 0) { runs.push([start, x - 1]); start = -1; }
  }
  const merged = [];
  for (const r of runs) {
    const last = merged[merged.length - 1];
    if (last && r[0] - last[1] <= 14) last[1] = r[1]; else merged.push([...r]);
  }
  return merged.filter((r) => r[1] - r[0] > 25).map(([a, b]) => [a * SCALE, (b + 1) * SCALE]);
}

// Fraction of the sheet height where the face row ends and the pose row begins (quietest row between them).
async function separator(file) {
  const { data, info } = await sharp(file).resize({ width: 688 }).greyscale().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height;
  let best = 0.36, min = Infinity;
  const rowE = [];
  for (let y = 0; y < h; y++) { let s = 0; for (let x = 1; x < w - 1; x++) s += Math.abs(data[y * w + x + 1] - data[y * w + x - 1]); rowE.push(s / w); }
  for (let y = Math.floor(h * 0.25); y < Math.floor(h * 0.5); y++) {
    const e = (rowE[y - 1] + rowE[y] + rowE[y + 1]) / 3;
    if (e < min) { min = e; best = y / h; }
  }
  return best;
}

// Crop a box centred on [a,b] with the given aspect (w/h) inside the band, clamped to the image.
function box(a, b, band, aspect, pad, W, H) {
  const [by0, by1] = band;
  const bh = by1 - by0;
  let w = Math.max((b - a) * (1 + pad), bh * aspect);
  let h = w / aspect;
  if (h > bh) { h = bh; w = h * aspect; }
  const cx = (a + b) / 2;
  let left = Math.round(cx - w / 2), top = Math.round(by0 + (bh - h) / 2);
  left = Math.max(0, Math.min(W - Math.round(w), left));
  return { left, top, width: Math.round(w), height: Math.round(h) };
}

const report = {};
fs.mkdirSync(OUT, { recursive: true });
for (let i = 0; i < DIRS.length; i++) {
  for (const g of ['female', 'male']) {
    const key = `p${i + 1}-${g}`;
    const turn = path.join(SRC, DIRS[i], `character-${g}-turnaround.jpg`);
    const expr = path.join(SRC, DIRS[i], `character-${g}-expressions.jpg`);
    const [W, H] = [2752, 1536];
    const fronts = await segments(turn, 0.02, 0.98);
    const front = fronts[0];
    const pad = Math.round((front[1] - front[0]) * 0.12);
    const frontBox = { left: Math.max(0, front[0] - pad), top: 0, width: 0, height: H };
    frontBox.width = Math.min(front[1] + pad, fronts[1][0] - 6) - frontBox.left;
    const sep = await separator(expr);
    const faces = await segments(expr, 0.02, sep - 0.01);
    const poses = await segments(expr, sep + 0.01, 0.98);
    report[key] = { front, faces: faces.length, face: faces[0], poses: poses.length, pose: poses[0] };
    if (dry) continue;
    const jobs = [
      [turn, frontBox, 'front', 520],
      [expr, box(faces[0][0], faces[0][1], [0, Math.round(H * sep)], 1, 0.30, W, H), 'face', 360],
      [expr, box(poses[0][0], poses[0][1], [Math.round(H * sep), H], 0.75, 0.40, W, H), 'wave', 600],
    ];
    for (const [file, region, name, width] of jobs) {
      await sharp(file).extract(region).resize({ width }).webp({ quality: 82 }).toFile(path.join(OUT, `${key}-${name}.webp`));
    }
    await sharp(turn).resize({ width: 1400 }).webp({ quality: 80 }).toFile(path.join(OUT, `${key}-sheet.webp`));
  }
}
console.log(JSON.stringify(report, null, 1));
