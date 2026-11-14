import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/reader.js';

const RUNS = join(import.meta.dirname, '..', 'runs');

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight(RUNS, '2026-10-28');

  it('reads 5 jobs and 1 bad line', () => {
    expect(night).not.toBeNull();
    expect(night?.rows).toHaveLength(5);
    expect(night?.badLines).toBe(1);
  });

  it('sorts rows by job', () => {
    const jobs = night?.rows.map((r) => r.job) ?? [];
    expect(jobs).toEqual([...jobs].sort());
  });

  it('aggregates a job with retries and keeps offsets', () => {
    const row = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps a row whose owner is null', () => {
    const row = night?.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
  });
});

describe('readNight on a temp runs dir', () => {
  let dir = '';
  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns null when the night has no file', () => {
    expect(readNight(dir, '2026-01-01')).toBeNull();
  });

  it('gives no rows for an empty file', () => {
    writeFileSync(join(dir, '2026-01-02.jsonl'), '');
    expect(readNight(dir, '2026-01-02')).toEqual({ night: '2026-01-02', rows: [], badLines: 0 });
  });

  it('keeps a null owner, counts bad lines, ignores the trailing newline', () => {
    const lines = [
      '{"at":"2026-01-03T01:00:00+01:00","job":"a/job","status":"retry","owner":null,"error":"x"}',
      '{"at":"2026-01-03T02:00:00+01:00","job":"a/job","status":"fail","owner":null}',
      '[1,2]',
      '{"at":"2026-01-03T03:00:00+01:00","job":"b/job","status":"weird","owner":"rook"}',
      'not json',
    ];
    writeFileSync(join(dir, '2026-01-03.jsonl'), lines.join('\n') + '\n');
    const night = readNight(dir, '2026-01-03');
    expect(night?.badLines).toBe(3);
    expect(night?.rows).toEqual([
      {
        job: 'a/job',
        owner: null,
        runs: 2,
        retries: 1,
        lastStatus: 'fail',
        lastError: 'x',
        firstAt: '2026-01-03T01:00:00+01:00',
        lastAt: '2026-01-03T02:00:00+01:00',
      },
    ]);
  });
});
