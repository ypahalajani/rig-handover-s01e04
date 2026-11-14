import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

type Json = { night: string; rows: { job: string }[]; badLines: number };

const line = (at: string, job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at, job, status, owner });

let dir: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    [
      line('2026-01-01T23:00:00+01:00', 'zeta/job', 'ok'),
      line('2026-01-01T23:05:00+01:00', 'alpha/job', 'ok'),
      line('2026-01-01T23:10:00+01:00', 'mid/job', 'fail'),
      line('2026-01-01T23:15:00+01:00', 'alpha/job', 'retry'),
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  writeFileSync(
    join(dir, '2026-01-03.jsonl'),
    [line('2026-01-03T23:00:00+01:00', 'good/job', 'ok'), 'not json at all'].join('\n') + '\n',
  );
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

const page = (night: string) => app.request(`/digest/${night}`);
const api = (night: string) => app.request(`/api/digest/${night}`);

describe('GET /digest/:night', () => {
  it('200 on a normal night', async () => {
    const res = await page('2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('alpha/job');
    expect(html).toContain('zeta/job');
  });

  it('404 for a night with no file', async () => {
    expect((await page('2026-02-02')).status).toBe(404);
  });

  it('empty night says nothing ran', async () => {
    const res = await page('2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('bad line still renders and is mentioned', async () => {
    const res = await page('2026-01-03');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('good/job');
    expect(html).toContain('1 bad line(s) skipped');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 on a normal night', async () => {
    const res = await api('2026-01-01');
    const body = (await res.json()) as Json;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-01-01');
    expect(body.rows).toHaveLength(3);
    expect(body.badLines).toBe(0);
  });

  it('404 for a night with no file', async () => {
    expect((await api('2026-02-02')).status).toBe(404);
  });

  it('empty night gives rows []', async () => {
    const res = await api('2026-01-02');
    const body = (await res.json()) as Json;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
  });

  it('bad line still answers 200 with badLines 1', async () => {
    const res = await api('2026-01-03');
    const body = (await res.json()) as Json;
    expect(res.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(['good/job']);
  });
});

describe('page and JSON agree', () => {
  it('list the same jobs in the same order', async () => {
    const body = (await (await api('2026-01-01')).json()) as Json;
    const html = await (await page('2026-01-01')).text();
    const jobs = body.rows.map((r) => r.job);
    const inPage = [...html.matchAll(/<td>([a-z]+\/job)<\/td>/g)].map((m) => m[1]);
    expect(jobs).toEqual(['alpha/job', 'mid/job', 'zeta/job']);
    expect(inPage).toEqual(jobs);
  });
});
