import crypto from 'node:crypto';

const roles = new Set(['ADMIN', 'MANAGER', 'DEVELOPER', 'TESTER']);
const issueStatuses = new Set(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'TESTING', 'RESOLVED', 'CLOSED']);

export function createPlatform({ state = {}, onChange = () => {} } = {}) {
  const users = state.users ?? [], projects = state.projects ?? [], issues = state.issues ?? [], events = state.events ?? [], alerts = state.alerts ?? [], sessions = new Map(Object.entries(state.sessions ?? {}));
  const persist = () => onChange({ users, projects, issues, events, alerts, sessions: Object.fromEntries(sessions) });
  const event = (projectId, type, message, userId) => { const value={id:crypto.randomUUID(),projectId,type,message,userId,createdAt:new Date().toISOString()}; events.unshift(value); alerts.unshift({...value,read:false}); return value; };
  const requireUser = token => { const u = sessions.get(token); if (!u) throw new Error('unauthorized'); return u; };
  const allowed = (user, allowedRoles) => { if (!allowedRoles.includes(user.role)) throw new Error('forbidden'); };
  const sessionFor = user => { const token = crypto.randomUUID(); sessions.set(token, user); return { token, user: publicUser(user) }; };
  const publicUser = ({ id, name, email, role }) => ({ id, name, email, role });
  const app = {
    register({ name, email, password, role = 'DEVELOPER' }) {
      if (!name || !/^\S+@\S+\.\S+$/.test(email || '') || String(password || '').length < 8 || !roles.has(role)) throw new Error('invalid registration');
      if (users.some(u => u.email === email)) throw new Error('email already registered');
      const user = { id: crypto.randomUUID(), name, email, password, role };
      users.push(user); const result = sessionFor(user); persist(); return result;
    },
    login({ email, password }) { const user = users.find(u => u.email === email && u.password === password); if (!user) throw new Error('invalid email or password'); const result = sessionFor(user); persist(); return result; },
    me(token) { return publicUser(requireUser(token)); },
    bootstrapManager() { return app.register({ name: 'Demo Manager', email: 'manager@demo.local', password: 'demo1234', role: 'MANAGER' }); },
    createProject(token, { name, key, description = '' }) { const user = requireUser(token); allowed(user, ['ADMIN', 'MANAGER']); if (!name || !key) throw new Error('project name and key required'); const p = { id: crypto.randomUUID(), name, key: key.toUpperCase(), description, ownerId: user.id, members: [user.id] }; projects.push(p); event(p.id,'PROJECT_CREATED',`Project ${p.name} created`,user.id); persist(); return p; },
    listProjects(token) { const user = requireUser(token); return projects.filter(p => p.members.includes(user.id) || ['ADMIN', 'MANAGER'].includes(user.role)); },
    addMember(token, id, userId) { const user=requireUser(token), p=projects.find(x=>x.id===id); if(!p) throw new Error('project not found'); if(user.role!=='ADMIN' && p.ownerId!==user.id) throw new Error('forbidden'); if(!users.some(x=>x.id===userId)) throw new Error('user not found'); if(!p.members.includes(userId)) p.members.push(userId); event(id,'MEMBER_ADDED','Project member added',user.id); persist(); return p; },
    activity(token,id) { requireUser(token); return events.filter(x=>x.projectId===id); },
    createIssue(token, { projectId, title, description = '', priority = 'MEDIUM', severity = 'MEDIUM', assignee = '' }) { const user = requireUser(token); allowed(user, ['ADMIN', 'MANAGER', 'DEVELOPER', 'TESTER']); if (!projects.some(p => p.id === projectId) || !title) throw new Error('valid project and title required'); const issue = { id: crypto.randomUUID(), projectId, title, description, priority, severity, assignee, status: 'OPEN', createdBy: user.name, createdAt: new Date().toISOString(), comments: [] }; issues.push(issue); event(projectId,'ISSUE_CREATED',`Issue ${title} created`,user.id); persist(); return issue; },
    listIssues(token, { projectId, severity, status } = {}) { requireUser(token); return issues.filter(i => (!projectId || i.projectId === projectId) && (!severity || i.severity === severity) && (!status || i.status === status)); },
    updateIssue(token, id, changes) { const user = requireUser(token); allowed(user, ['ADMIN', 'MANAGER', 'DEVELOPER', 'TESTER']); const issue = issues.find(i => i.id === id); if (!issue) throw new Error('issue not found'); if (changes.status && !issueStatuses.has(changes.status)) throw new Error('invalid status'); Object.assign(issue, Object.fromEntries(Object.entries(changes).filter(([k]) => ['status', 'priority', 'severity', 'assignee', 'title', 'description'].includes(k)))); event(issue.projectId,'ISSUE_UPDATED',`Issue ${issue.title} updated`,user.id); persist(); return issue; },
    comment(token,id,{text}) { const user=requireUser(token), issue=issues.find(i=>i.id===id); if(!issue) throw new Error('issue not found'); if(!text?.trim()) throw new Error('comment required'); const c={id:crypto.randomUUID(),text:text.trim(),author:user.name,createdAt:new Date().toISOString()}; issue.comments.push(c); event(issue.projectId,'COMMENT_ADDED',`Comment added to ${issue.title}`,user.id); persist(); return c; },
    metrics(token) { requireUser(token); return {total:issues.length,open:issues.filter(i=>i.status==='OPEN').length,critical:issues.filter(i=>i.severity==='CRITICAL').length,resolved:issues.filter(i=>['RESOLVED','CLOSED'].includes(i.status)).length}; },
    notifications(token) { const user=requireUser(token); return alerts.filter(a=>!a.userId || a.userId===user.id); },
    markNotificationRead(token,id) { requireUser(token); const a=alerts.find(x=>x.id===id); if(!a) throw new Error('notification not found'); a.read=true; persist(); return a; },
    exportState() { return { users, projects, issues, events, alerts, sessions: Object.fromEntries(sessions) }; },
    summary(token) { const user=requireUser(token), m=app.metrics(token); return {activeProjects:app.listProjects(token).length,openIssues:m.open,criticalIssues:m.critical,resolvedRate:m.total?Math.round(m.resolved/m.total*100):0,unreadNotifications:app.notifications(token).filter(x=>!x.read).length,user:publicUser(user)}; },
    assistant(token, { command, projectId }) { const user = requireUser(token); const text = String(command || '').toLowerCase(); if (!text.trim()) throw new Error('command required'); const context = { projectId, user: publicUser(user) };
      if (text.includes('create') && text.includes('issue')) { allowed(user, ['ADMIN','MANAGER','DEVELOPER','TESTER']); const title = command.replace(/^.*?create\s+(?:a\s+)?(?:high\s+priority\s+)?(?:issue|bug)\s*(?:for)?\s*/i, '').trim() || 'AI-created issue'; const issue = app.createIssue(token, { projectId, title, priority: text.includes('high') ? 'HIGH' : 'MEDIUM', severity: text.includes('critical') ? 'CRITICAL' : 'MEDIUM' }); return { provider: providerName(), action: 'CREATE', message: `Created ${issue.title}`, issue, context }; }
      const severity = text.includes('critical') ? 'CRITICAL' : text.includes('high severity') ? 'HIGH' : undefined;
      const status = text.includes('open') || text.includes('unresolved') ? 'OPEN' : undefined;
      const found = app.listIssues(token, { projectId, severity, status }); return { provider: providerName(), action: 'SEARCH', message: `Found ${found.length} matching issue(s).`, issues: found, context };
    }
  };
  return app;
}

function providerName() { return process.env.AI_PROVIDER && process.env.AI_PROVIDER !== 'deterministic' ? `${process.env.AI_PROVIDER} (configured; safe tool fallback)` : 'deterministic demo assistant'; }
