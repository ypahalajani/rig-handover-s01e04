// Contract for the morning digest (plan.md § 1). Types only: the reader lives in reader.ts.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  owner: string | null; // null in the log; views show it as —
  runs: number; // lines for this job
  retries: number; // lines with status "retry"
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string; // keeps the offset from the log, never converted to UTC
  lastAt: string;
};

export type DigestNight = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that did not parse: counted, never thrown
};

// Reads runs/<night>.jsonl. Returns null when the night has no file (the route answers 404).
// An empty file gives rows: []. Never throws on a bad line.
export type ReadNight = (runsDir: string, night: string) => DigestNight | null;

export declare function readNight(runsDir: string, night: string): DigestNight | null;
