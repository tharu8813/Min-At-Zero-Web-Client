import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the shipped handlers without a network connection or launching the client.
const source = readFileSync(new URL('../asset/script.js', import.meta.url), 'utf8');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    textContent: '', dataset: {}, style: {}, attributes: {}, listeners: {},
    classList: { remove() {} },
    setAttribute(key, value) { this.attributes[key] = value; },
    querySelector: selector => element(selector),
    addEventListener(type, handler) { this.listeners[type] = handler; },
  });
  return elements.get(id);
};
const messages = [];
const environment = {
  CONFIG: { FALLBACK: { clientUrl: 'https://github.com/example/client/releases/latest' }, SERVER_IP: 'example.test' },
  utils: { $: element, setText: (id, text) => { element(id).textContent = text; },
    animateText: (el, text) => { el.textContent = text; } },
  platformGuard: { isSupported: true },
  toast: { show: text => messages.push(text) },
  ui: { countUpText: (el, online, max) => { el.textContent = `${online}/${max}`; } },
  AbortController, setTimeout, clearTimeout,
};
function moduleSource(name) {
  const start = source.indexOf(`const ${name} =`);
  return source.slice(start, source.indexOf('\n/*', start));
}
const download = runInNewContext(`${moduleSource('download')}\ndownload;`, environment);
const button = element('download-btn');
download.init();
download.setRelease(null);
assert.equal(button.href, environment.CONFIG.FALLBACK.clientUrl);
assert.equal(button.attributes['aria-label'], '다운로드 페이지 열기');
button.listeners.click({ preventDefault() { assert.fail('Valid link was blocked'); } });
assert.match(messages.at(-1), /GitHub/);
download.setRelease({ assets: [{ name: 'setup.exe', browser_download_url: 'https://example.test/setup.exe', size: 1048576 }] });
assert.equal(button.href, 'https://example.test/setup.exe');
assert.equal(button.dataset.directDownload, 'true');
assert.equal(element('file-size').textContent, '약 1.0MB');
button.listeners.click({ preventDefault() { assert.fail('Valid link was blocked'); } });
assert.match(messages.at(-1), /다운로드를 요청/);
download.setRelease({ assets: [{ name: 'setup.exe', browser_download_url: 'javascript:alert(1)' }] });
assert.equal(button.href, environment.CONFIG.FALLBACK.clientUrl);
environment.platformGuard.isSupported = false;
let prevented = false;
button.listeners.click({ preventDefault() { prevented = true; } });
assert.equal(prevented, true);

// A failed refresh must clear the previous online count and success indicator.
let response = { online: true, players: { online: 3, max: 20 } };
environment.fetch = async () => {
  if (response instanceof Error) throw response;
  return { ok: true, json: async () => response };
};
const status = runInNewContext(`${moduleSource('serverStatus').replace('return { start };', 'return { checkServer };')}\nserverStatus;`, environment);
await status.checkServer();
assert.equal(element('server-players').textContent, '3/20');
response = new Error('offline network');
await status.checkServer();
assert.equal(element('server-status-text').textContent, '확인 불가');
assert.equal(element('server-players').textContent, '— / —');
assert.equal(element('status-dot').style.background, '#a7b2a9');
response = { online: false };
await status.checkServer();
assert.equal(element('server-status-text').textContent, '오프라인');
assert.match(element('server-status-checked').textContent, /확인$/);
assert.doesNotMatch(element('server-status-checked').textContent, /전부터/);
console.log('UX checks passed: download destinations, unsupported platform, server status recovery.');
