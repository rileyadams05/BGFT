'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('../web/assets/js/ps4-catalogue-api.js');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'web/index.html'), 'utf8');
const sender = fs.readFileSync(path.join(root, 'web/assets/js/ps4-package-sender.js'), 'utf8');
const installScript = fs.readFileSync(path.join(root, 'web/assets/js/pwa-install.js'), 'utf8');
const worker = fs.readFileSync(path.join(root, 'web/sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'web/manifest.webmanifest'), 'utf8'));

test('BGFT app is self-contained and explicitly user initiated', () => {
  assert.doesNotMatch(html, /class="topbar"|href="\/ps4\/(?:install|catalogues)\/"/);
  assert.match(html, /href="\/projects\/"[^>]*aria-label="Back to Projects page"/);
  assert.match(html, /id="connectPs4Button"/);
  assert.match(html, /id="choosePkgButton"/);
  assert.match(html, /\.mobile-upload \{ display:none/);
  assert.match(html, /@media \(hover:none\) and \(pointer:coarse\)/);
  assert.match(html, /title="Choose a PKG file">\+/);
  assert.match(html, /manifest\.webmanifest/);
  assert.match(html, /pwa-install[^>]+manifest-url="\.\/manifest\.webmanifest"/);
  assert.match(html, /assets\/vendor\/pwa-install-0\.7\.0\.es\.js/);
  assert.match(html, /assets\/js\/pwa-install\.js/);
  assert.match(html, /id="pwaStatus"/);
  const shellVersion = worker.match(/bgft-shell-v(\d+)/)?.[1];
  assert.ok(shellVersion, 'service worker declares a versioned app-shell cache');
  assert.ok(html.includes(`./sw.js?v=${shellVersion}`), 'HTML registers the current service-worker version');
  assert.ok(fs.existsSync(path.join(root, 'web/assets/vendor/pwa-install-0.7.0.es.js')));
  assert.match(sender, /const bgftMode = true/);
  assert.doesNotMatch(sender, /connect\(savedIp\)/);
  assert.match(sender, /\/pairing\/challenge/);
  assert.match(sender, /\/bgft\/tasks/);
  assert.match(sender, /\/bgft\/uploads/);
});

test('service worker only caches the app shell and ignores external requests', () => {
  assert.match(worker, /const CACHE_NAME = 'bgft-shell-v\d+'/);
  assert.match(worker, /assets\/vendor\/pwa-install-0\.7\.0\.es\.js/);
  assert.match(worker, /url\.origin !== self\.location\.origin/);
  assert.match(worker, /url\.pathname\.startsWith\(APP_SCOPE\.pathname\)/);
  assert.match(worker, /bgft-shell-/);
});

test('PWA starts within its own scope', () => {
  assert.equal(manifest.id, '/bgft/');
  assert.equal(manifest.scope, '/bgft/');
  assert.equal(manifest.start_url, '/bgft/');
  assert.equal(manifest.display, 'standalone');
  assert.ok(manifest.icons.some(icon => icon.type === 'image/svg+xml'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '192x192'));
  assert.ok(manifest.icons.some(icon => icon.sizes === '512x512'));
  assert.ok(fs.existsSync(path.join(root, 'web/icons/icon-192.png')));
  assert.ok(fs.existsSync(path.join(root, 'web/icons/icon-512.png')));
  assert.match(installScript, /new URLSearchParams\(location\.search\).*install/);
  assert.match(installScript, /installer\.showDialog\(true\)/);
  assert.match(installScript, /installer\.install\(\)/);
  assert.match(installScript, /customElements\.get\('pwa-install'\)/);
  assert.match(installScript, /pwa-install-success-event/);
  assert.match(installScript, /pwa-install-fail-event/);
  assert.match(installScript, /Installation was not completed/);
  assert.match(html, /id=\"bgftOpenInstalledApp\"/);
  assert.match(html, /id=\"bgftOpenInBrowser\"/);
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
