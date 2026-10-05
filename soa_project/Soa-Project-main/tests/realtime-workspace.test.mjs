import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createPlatform } from '../src/platform.mjs';

test('moves an issue through the workflow with the existing update API', () => {
  const app = createPlatform();
  const manager = app.bootstrapManager();
  const project = app.createProject(manager.token, { name: 'Real', key: 'REAL' });
  const issue = app.createIssue(manager.token, { projectId: project.id, title: 'Move me' });
  assert.equal(app.updateIssue(manager.token, issue.id, { status: 'IN_PROGRESS' }).status, 'IN_PROGRESS');
});

test('dashboard is wired for persistent sessions, navigation, and drag/drop', async () => {
  const html = await readFile(new URL('../web/index.html', import.meta.url), 'utf8');
  const app = await readFile(new URL('../web/app.js', import.meta.url), 'utf8');
  assert.match(html, /data-view="projects"/);
  assert.match(app, /localStorage/);
  assert.match(app, /dragstart/);
  assert.match(app, /\/api\/issues\/\$\{issueId\}/);
  assert.doesNotMatch(app, /name\.value/);
  assert.match(app, /s\.projectId && i\.projectId===s\.projectId/);
  assert.doesNotMatch(app, /projectName\.value/);
  assert.match(html, /class="panel view overview ai"/);
  assert.match(app, /function showView\(view\)/);
});
