// Saves /digest/<night> as one self-contained HTML file (plan.md § 3, ADR 0003).
// Usage: pnpm preview [night] [outfile]   (reads LANE_MARKER from .env; unset = "no marker set")
// The output goes under var/ (git-ignored): previews never go into the repo.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { createApp } from '../src/app.js';

const night = process.argv[2] ?? '2026-10-28';
const out = process.argv[3] ?? 'var/preview/index.html';

const res = await createApp().request(`/digest/${night}`);
if (res.status !== 200) {
  console.error(`/digest/${night} answered ${res.status}`);
  process.exit(1);
}
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await res.text());
console.log(`saved ${out} (marker ${process.env.LANE_MARKER ? 'set' : 'unset'})`);
