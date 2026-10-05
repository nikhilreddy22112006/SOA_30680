import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPlatform } from '../src/platform.mjs';

test('restores users, projects, issues, and active sessions from an exported state', () => {
  const app = createPlatform();
  const session = app.register({ name: 'Persistent', email: 'persistent@example.com', password: 'password1', role: 'MANAGER' });
  const project = app.createProject(session.token, { name: 'Keep', key: 'KEEP' });
  app.createIssue(session.token, { projectId: project.id, title: 'Survives restart' });
  const restored = createPlatform({ state: app.exportState() });
  assert.equal(restored.me(session.token).email, 'persistent@example.com');
  assert.equal(restored.listIssues(session.token, { projectId: project.id }).length, 1);
});

test('sidebar has an accessible workspace switcher', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.match(html, /id="workspaceSwitcher"/);
  assert.match(html, /aria-label="Select project"/);
  assert.match(app, /workspaceSwitcher\.onclick/);
});
