'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('../web/assets/js/ps4-catalogue-api.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const sender = fs.readFileSync(path.join(root, 'web/assets/js/ps4-package-sender.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'web/manifest.webmanifest'), 'utf8'));

test('BGFT app is self-contained and explicitly user initiated', () => {
  assert.doesNotMatch(html, /class="topbar"|href="\/ps4\/(?:install|catalogues)\/"/);
  assert.match(html, /id="connectPs4Button"/);
  assert.match(html, /id="choosePkgButton"/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(sender, /const bgftMode = true/);
  assert.doesNotMatch(sender, /connect\(savedIp\)/);
  assert.match(sender, /\/pairing\/challenge/);
  assert.match(sender, /\/bgft\/tasks/);
  assert.match(sender, /\/bgft\/uploads/);
});

test('service worker only caches the app shell and ignores external requests', () => {
  assert.match(worker, /bgft-shell-v2/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /url\.pathname\.startsWith\(APP_SCOPE\.pathname\)/);
  assert.match(worker, /bgft-shell-/);
});

test('PWA starts within its own scope', () => {
  assert.equal(manifest.scope, './');
  assert.equal(manifest.start_url, './');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.type === 'image/svg+xml'));
});

test('PS4 requests use CORS without credentials and explicit API path', async () => {
  let call;
  const client = createClient(async (url, options) => {
    call = { url, options };
    return { ok: true, status: 200, text: async () => '{"service":"test"}' };
  }, 12801);
  const result = await client.request('192.168.1.10', '/status');
  assert.deepEqual(result, { service: 'test' });
  assert.equal(call.url, 'http://192.168.1.10:12801/api/v1/status');
  assert.equal(call.options.mode, 'cors');
  assert.equal(call.options.credentials, 'omit');
  assert.equal(call.options.cache, 'no-store');
});

test('upload stays a raw PKG body and sends the pairing bearer token', async () => {
  class MockXhr {
    constructor() { this.upload = {}; this.headers = {}; this.status = 202; this.responseText = '{"task_id":"x","source":"upload","status":"registered"}'; }
    open(method, url) { this.method = method; this.url = url; }
    setRequestHeader(name, value) { this.headers[name] = value; }
    send(body) { this.body = body; this.onload(); }
  }
  let xhr;
  const client = createClient(async () => { throw new Error('unexpected fetch'); }, 12801, () => (xhr = new MockXhr()));
  const file = { name: 'homebrew.pkg' };
  const result = await client.upload('192.168.1.10', '/bgft/uploads?filename=homebrew.pkg', file, 'pair-token');
  assert.equal(result.status, 'registered');
  assert.equal(xhr.method, 'POST');
  assert.equal(xhr.url, 'http://192.168.1.10:12801/api/v1/bgft/uploads?filename=homebrew.pkg');
  assert.equal(xhr.headers.Authorization, 'Bearer pair-token');
  assert.equal(xhr.headers['Content-Type'], 'application/vnd.vortex-prime.pkg');
  assert.equal(xhr.withCredentials, false);
  assert.equal(xhr.body, file);
});
