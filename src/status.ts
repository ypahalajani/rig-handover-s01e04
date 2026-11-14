import { readdirSync } from 'node:fs';
import type { RigConfig } from './config.js';
import { lastBeat, type Beat } from './heartbeat.js';
import { readNight } from './digest/reader.js';

export type Status = {
  adapter: string;
  installed: string;
  lastBeat: Beat | null;
  nights: NightEntry[];
};

// counts = rows by lastStatus, as the digest shows them; null when the night can't be read.
export type NightEntry = { night: string; counts: { ok: number; retry: number; fail: number } | null };

function nightEntry(runsDir: string, night: string): NightEntry {
  try {
    const d = readNight(runsDir, night);
    if (!d) return { night, counts: null };
    const counts = { ok: 0, retry: 0, fail: 0 };
    for (const r of d.rows) counts[r.lastStatus]++;
    return { night, counts };
  } catch {
    return { night, counts: null };
  }
}

// Nights on disk = runs/<YYYY-MM-DD>.jsonl, newest first.
export function nightsOnDisk(runsDir: string): string[] {
  try {
    return readdirSync(runsDir)
      .filter((f) => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(f))
      .map((f) => f.slice(0, 10))
      .sort()
      .reverse();
  } catch {
    return [];
  }
}

export function readStatus(config: RigConfig): Status {
  return {
    adapter: config.adapter,
    installed: config.installed,
    lastBeat: lastBeat(),
    nights: nightsOnDisk(config.runsDir).map((n) => nightEntry(config.runsDir, n)),
  };
}
