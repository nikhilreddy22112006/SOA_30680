import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from '../src/platform.mjs';

test('returns public profile for an authenticated user', () => {
  const app = createPlatform();
  const session = app.register({name:'A',email:'a@x.com',password:'password1',role:'MANAGER'});
  assert.deepEqual(app.me(session.token), session.user);
});

test('rejects unknown session tokens', () => {
  const app = createPlatform();
  assert.throws(() => app.me('not-a-token'), /unauthorized/);
});
