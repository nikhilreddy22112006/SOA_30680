import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from '../src/platform.mjs';

test('authenticates a manager and preserves their role', () => {
  const app = createPlatform();
  app.register({ name: 'Maya', email: 'maya@example.com', password: 'secret123', role: 'MANAGER' });
  const session = app.login({ email: 'maya@example.com', password: 'secret123' });
  assert.equal(session.user.role, 'MANAGER');
  assert.ok(session.token);
});

test('manager creates a project and issue assistant finds critical issues', () => {
  const app = createPlatform();
  const manager = app.bootstrapManager();
  const project = app.createProject(manager.token, { name: 'Alpha', key: 'ALPHA' });
  app.createIssue(manager.token, { projectId: project.id, title: 'Payment fails', priority: 'HIGH', severity: 'CRITICAL' });
  const result = app.assistant(manager.token, { command: 'show critical open issues', projectId: project.id });
  assert.equal(result.action, 'SEARCH');
  assert.equal(result.issues.length, 1);
});

test('developer cannot create a project', () => {
  const app = createPlatform();
  const developer = app.register({ name: 'Dev', email: 'dev@example.com', password: 'secret123', role: 'DEVELOPER' });
  assert.throws(() => app.createProject(developer.token, { name: 'Nope', key: 'NOPE' }), { message: /forbidden/i });
});
