import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('dashboard provides verified endpoint-driven feature surfaces', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  for (const label of ['Command centre', 'Issue flow', 'Activity stream', 'Notifications']) assert.match(html, new RegExp(label));
  const script = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  for (const endpoint of ['/api/dashboard/summary', '/api/issues', '/api/ai/assistant', '/api/notifications']) assert.ok(script.includes(endpoint));
  const server = await readFile(new URL('../server.mjs', import.meta.url), 'utf8');
  assert.match(server, /web\/styles\.css/);
  assert.doesNotMatch(script, /open\.textContent/);
});
