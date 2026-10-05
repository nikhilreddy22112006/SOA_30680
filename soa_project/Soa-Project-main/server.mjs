import http from 'node:http';
import { readFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import { createPlatform } from './src/platform.mjs';
const app = createPlatform();
const port = Number(process.env.PORT || 8080);
const json = (res, status, data) => { const requestId = crypto.randomUUID(); res.writeHead(status, {'content-type':'application/json','access-control-allow-origin':'*','x-request-id':requestId}); res.end(JSON.stringify(status >= 400 ? {...data, code: status, requestId} : data)); };
const body = req => new Promise(resolve => { let raw=''; req.on('data', d => raw += d); req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } }); });
const token = req => (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
http.createServer(async (req,res) => {
  if (req.method === 'OPTIONS') return json(res, 204, {});
  if (req.method === 'GET' && req.url === '/') { res.writeHead(200, {'content-type':'text/html'}); return res.end(await readFile('./web/index.html')); }
  if (req.method === 'GET' && req.url === '/web/styles.css') { res.writeHead(200, {'content-type':'text/css'}); return res.end(await readFile('./web/styles.css')); }
  if (req.method === 'GET' && req.url === '/web/app.js') { res.writeHead(200, {'content-type':'text/javascript'}); return res.end(await readFile('./web/app.js')); }
  if (req.method === 'GET' && req.url === '/health') return json(res, 200, {status:'UP', services:['api-gateway','auth-service','project-service','issue-service']});
  const data = await body(req);
  try {
    if (req.method==='POST' && req.url==='/api/auth/register') return json(res,201,app.register(data));
    if (req.method==='POST' && req.url==='/api/auth/login') return json(res,200,app.login(data));
    if (req.method==='GET' && req.url==='/api/auth/me') return json(res,200,app.me(token(req)));
    if (req.method==='GET' && req.url==='/api/projects') return json(res,200,app.listProjects(token(req)));
    if (req.method==='POST' && req.url==='/api/projects') return json(res,201,app.createProject(token(req),data));
    if (req.method==='GET' && /^\/api\/projects\/[^/]+\/activity$/.test(req.url)) return json(res,200,app.activity(token(req),req.url.split('/')[3]));
    if (req.method==='POST' && /^\/api\/projects\/[^/]+\/members$/.test(req.url)) return json(res,201,app.addMember(token(req),req.url.split('/')[3],data.userId));
    if (req.method==='GET' && req.url==='/api/issues/metrics') return json(res,200,app.metrics(token(req)));
    if (req.method==='GET' && req.url.startsWith('/api/issues')) return json(res,200,app.listIssues(token(req),Object.fromEntries(new URL(req.url,'http://x').searchParams)));
    if (req.method==='POST' && req.url==='/api/issues') return json(res,201,app.createIssue(token(req),data));
    if (req.method==='POST' && (req.url==='/api/ai/assistant' || req.url==='/api/issues/assistant')) return json(res,200,app.assistant(token(req),data));
    if (req.method==='POST' && /^\/api\/issues\/[^/]+\/comments$/.test(req.url)) return json(res,201,app.comment(token(req),req.url.split('/')[3],data));
    if (req.method==='PATCH' && /^\/api\/issues\//.test(req.url)) return json(res,200,app.updateIssue(token(req),req.url.split('/').pop(),data));
    if (req.method==='GET' && req.url==='/api/ai/providers') return json(res,200,{active:process.env.AI_PROVIDER || 'deterministic',fallback:'deterministic'});
    if (req.method==='GET' && req.url==='/api/notifications') return json(res,200,app.notifications(token(req)));
    if (req.method==='PATCH' && /^\/api\/notifications\/[^/]+\/read$/.test(req.url)) return json(res,200,app.markNotificationRead(token(req),req.url.split('/')[3]));
    if (req.method==='GET' && req.url==='/api/dashboard/summary') return json(res,200,app.summary(token(req)));
    return json(res,404,{error:'not found'});
  } catch (e) { return json(res, /unauthorized/.test(e.message)?401:/forbidden/.test(e.message)?403:400,{error:e.message}); }
}).listen(port, () => console.log(`SOA Collaboration MVP running at http://localhost:${port}`));
