import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from './app.js';

async function fixture(t, options) {
  const server = createApp({ logging: false, ...options }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const base = `http://127.0.0.1:${server.address().port}`;
  return async (path, method = 'GET', body, headers = {}) => {
    const response = await fetch(base + path, { method, headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...headers }, body: body === undefined ? undefined : JSON.stringify(body) });
    const raw = await response.text();
    return { status: response.status, headers: response.headers, raw, data: response.headers.get('content-type')?.includes('application/json') && raw ? JSON.parse(raw) : raw };
  };
}

test('all five task endpoints: create, list, read one, update, delete', async t => {
  const call = await fixture(t);
  assert.deepEqual((await call('/api/tasks')).data, []);
  const created = await call('/api/tasks', 'POST', { text: '  Read a chapter  ' });
  assert.equal(created.status, 201);
  assert.equal(created.data.text, 'Read a chapter');
  assert.equal(created.data.completed, false);
  assert.ok(Number.isInteger(created.data.id));
  assert.ok(Number.isFinite(Date.parse(created.data.createdAt)));
  const path = `/api/tasks/${created.data.id}`;
  assert.equal(created.headers.get('location'), path);
  assert.deepEqual((await call(path)).data, created.data);
  assert.equal((await call('/api/tasks')).data.length, 1);
  const updated = await call(path, 'PUT', { completed: true });
  assert.equal(updated.status, 200); assert.equal(updated.data.completed, true);
  assert.equal(updated.data.text, created.data.text);
  const renamed = await call(path, 'PUT', { text: 'New text', completed: false });
  assert.equal(renamed.data.text, 'New text'); assert.equal(renamed.data.completed, false);
  assert.equal(renamed.data.id, created.data.id); assert.equal(renamed.data.createdAt, created.data.createdAt);
  const deleted = await call(path, 'DELETE');
  assert.equal(deleted.status, 204); assert.equal(deleted.raw, '');
  assert.equal((await call(path)).status, 404);
  assert.equal((await call(path, 'PUT', { completed: true })).status, 404);
  assert.equal((await call(path, 'DELETE')).status, 404);
});

test('validation rejects wrong types, blank text, unknown fields, long text and control characters', async t => {
  const call = await fixture(t);
  for (const body of [{}, [], null, {text: ''}, {text: '  '}, {text: 5}, {text: 'x'.repeat(141)}, {text: 'a\nb'}, {text: 'OK', id: 3}, {text: 'OK', completed: true}]) {
    assert.equal((await call('/api/tasks', 'POST', body)).status, 400, JSON.stringify(body));
  }
  const { data: task } = await call('/api/tasks', 'POST', {text: 'x'.repeat(140)});
  for (const body of [{}, {text: ''}, {completed: 'false'}, {completed: null}, {id: 4}, {createdAt: 'bad'}]) {
    assert.equal((await call(`/api/tasks/${task.id}`, 'PUT', body)).status, 400);
  }
  assert.equal((await call(`/api/tasks/${task.id}`)).data.text.length, 140);
});

test('strict IDs and JSON error responses for missing resources and routes', async t => {
  const call = await fixture(t);
  for (const id of ['abc', '1abc', '0', '-1', '1.5', '01', '9007199254740992']) {
    assert.equal((await call(`/api/tasks/${id}`)).status, 400, id);
  }
  assert.equal((await call('/api/tasks/999')).status, 404);
  for (const path of ['/unknown', '/server.js', '/.env', '/package.json', '/tests.mjs']) {
    const result = await call(path); assert.equal(result.status, 404); assert.equal(result.data.error, 'Route not found');
  }
});

test('malformed JSON, payload limit and unsupported content type', async t => {
  const server = createApp({logging:false}).listen(0, '127.0.0.1');
  await once(server, 'listening');
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  const url = `http://127.0.0.1:${server.address().port}/api/tasks`;
  for (const [body, type, status] of [['{bad', 'application/json', 400], ['x'.repeat(11000), 'application/json', 413], ['text', 'text/plain', 415]]) {
    const response = await fetch(url, {method:'POST', headers:{'Content-Type':type}, body});
    assert.equal(response.status, status); assert.equal(typeof (await response.json()).error, 'string');
  }
});

test('CORS allowlist, preflight, security headers and health check', async t => {
  const call = await fixture(t, {origins:['https://allowed.example']});
  const allowed = await call('/api/tasks','GET',undefined,{Origin:'https://allowed.example'});
  assert.equal(allowed.headers.get('access-control-allow-origin'),'https://allowed.example');
  const denied = await call('/api/tasks','GET',undefined,{Origin:'https://other.example'});
  assert.equal(denied.headers.get('access-control-allow-origin'),null);
  const preflight = await call('/api/tasks','OPTIONS',undefined,{Origin:'https://allowed.example','Access-Control-Request-Method':'PUT'});
  assert.equal(preflight.status,204); assert.match(preflight.headers.get('access-control-allow-methods'),/PUT/);
  assert.equal(allowed.headers.get('x-content-type-options'),'nosniff');
  assert.equal(allowed.headers.get('x-powered-by'),null);
  assert.ok(allowed.headers.get('content-security-policy'));
  assert.equal(allowed.headers.get('cache-control'),'no-store');
  assert.equal((await call('/health')).data.status,'ok');
});

test('unexpected store failures return sanitized 500, never stack or internal details', async t => {
  const call = await fixture(t, {store:{ list() { throw new Error('synthetic test failure'); } }});
  const result = await call('/api/tasks');
  assert.equal(result.status,500); assert.deepEqual(result.data,{error:'Internal Server Error'});
});

test('100 unique tasks persist across requests, updates and deletions; a new app starts empty', async t => {
  const call = await fixture(t);
  const ids = [];
  for (let i=0; i<100; i++) { const r = await call('/api/tasks','POST',{text:`Sample ${i}`}); assert.equal(r.status,201); ids.push(r.data.id); }
  assert.equal(new Set(ids).size,100);
  for (const id of ids.slice(0,50)) assert.equal((await call(`/api/tasks/${id}`,'PUT',{completed:true})).status,200);
  assert.equal((await call('/api/tasks')).data.filter(task=>task.completed).length,50);
  for (const id of ids.slice(0,60)) assert.equal((await call(`/api/tasks/${id}`,'DELETE')).status,204);
  assert.equal((await call('/api/tasks')).data.length,40);
  const fresh = await fixture(t); assert.deepEqual((await fresh('/api/tasks')).data,[]);
});

test('frontend is served and HTML-like task input remains plain JSON text', async t => {
  const call = await fixture(t);
  assert.match((await call('/')).raw,/TaskFlow API/);
  assert.equal((await call('/client.js')).status,200);
  const text = '<script>alert(1)</script>';
  const created = await call('/api/tasks','POST',{text});
  assert.equal(created.data.text,text);
  assert.match((await call('/render.js')).raw,/label.textContent = task.text/);
});
