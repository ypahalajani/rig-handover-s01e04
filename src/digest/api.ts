import { Hono } from 'hono';
import type { RigConfig } from '../config.js';
import { readNight } from './reader.js';

const NIGHT = /^\d{4}-\d{2}-\d{2}$/;

// GET /api/digest/:night: the same rows, in the same order, as the page (readNight is the one
// source for both, ADR 0001).
export function digestApi(config: RigConfig) {
  const api = new Hono();

  api.get('/api/digest/:night', (c) => {
    const night = c.req.param('night');
    if (!NIGHT.test(night)) return c.json({ error: 'not found', night }, 404);
    const digest = readNight(config.runsDir, night);
    if (!digest) return c.json({ error: 'not found', night }, 404);
    const { rows, badLines } = digest;
    return c.json({ night: digest.night, rows, badLines });
  });

  return api;
}
