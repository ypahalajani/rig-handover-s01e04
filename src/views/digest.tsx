import type { DigestRow } from '../digest/types.js';

const dash = '—';

function Row({ row }: { row: DigestRow }) {
  const retriesHigh = row.retries >= 3;
  const failed = row.lastStatus === 'fail';
  return (
    <tr class={failed ? 'warn' : undefined}>
      <td>{row.job}</td>
      <td>{row.owner ?? dash}</td>
      <td>{row.runs}</td>
      <td>
        {row.retries}
        {retriesHigh ? <span class="warn"> · retries high</span> : null}
      </td>
      <td>
        {row.lastStatus}
        {failed ? <span class="warn"> · fail</span> : null}
      </td>
      <td>{row.lastError ?? dash}</td>
      <td>{row.firstAt || dash}</td>
      <td>{row.lastAt || dash}</td>
    </tr>
  );
}

export function DigestPage({ night, rows, badLines }: { night: string; rows: DigestRow[]; badLines: number }) {
  return (
    <>
      <h1>digest · {night}</h1>
      {badLines > 0 ? <p class="warn">{badLines} bad line(s) skipped</p> : null}
      {rows.length === 0 ? (
        <p class="mute">nothing ran</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>job</th>
              <th>owner</th>
              <th>runs</th>
              <th>retries</th>
              <th>last status</th>
              <th>last error</th>
              <th>first</th>
              <th>last</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Row row={r} />
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
