import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlatform } from '../src/platform.mjs';

test('adds members and keeps project activity', () => {
 const app=createPlatform(); const m=app.bootstrapManager(); const p=app.createProject(m.token,{name:'Alpha',key:'A'}); const d=app.register({name:'Dev',email:'dev@test.com',password:'password1'}); app.addMember(m.token,p.id,d.user.id); assert.equal(app.activity(m.token,p.id).length,2);
});
test('comments, metrics, notifications and summary are available', () => {
 const app=createPlatform(); const m=app.bootstrapManager(); const p=app.createProject(m.token,{name:'Alpha',key:'A'}); const i=app.createIssue(m.token,{projectId:p.id,title:'Broken',severity:'CRITICAL'}); app.comment(m.token,i.id,{text:'Investigating'}); assert.equal(app.metrics(m.token).critical,1); assert.ok(app.summary(m.token).openIssues); assert.ok(app.notifications(m.token).length);
});
