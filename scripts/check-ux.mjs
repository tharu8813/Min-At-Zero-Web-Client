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
const config = runInNewContext(`${source.slice(source.indexOf('const CONFIG ='), source.indexOf('const platformGuard ='))}\nCONFIG;`);
assert.equal(config.REPOS.client, 'tharu8813/Min-At-Zero-Clinet');
assert.equal(config.FALLBACK.clientUrl, `https://github.com/${config.REPOS.client}/releases/latest`);
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(home.includes(`href="${config.FALLBACK.clientUrl}"`));
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

// Closed menus cannot receive focus; Escape restores focus to the opener.
const menuListeners = {};
let resizeMenu;
const menuElement = () => {
  const classes = new Set();
  return {
    attributes: {}, listeners: {},
    classList: {
      contains: name => classes.has(name),
      add: name => classes.add(name),
      remove: name => classes.delete(name),
      toggle: (name, enabled) => { if (enabled) classes.add(name); else classes.delete(name); },
    },
    setAttribute(key, value) { this.attributes[key] = value; },
    addEventListener(type, handler) { this.listeners[type] = handler; },
    contains(target) { return target === this; },
    focus() { this.focused = true; },
  };
};
const menuButton = menuElement();
const menuNav = menuElement();
const menuLink = menuElement();
menuNav.querySelectorAll = () => [menuLink];
const menu = runInNewContext(`${moduleSource('mobileMenu')}\nmobileMenu;`, {
  utils: { $: id => id === 'mobile-menu-btn' ? menuButton : menuNav },
  sound: { play() {} },
  document: { addEventListener: (type, handler) => { menuListeners[type] = handler; } },
  window: { matchMedia: () => ({ addEventListener: (_, handler) => { resizeMenu = handler; } }) },
});
menu.init();
assert.equal(menuNav.inert, true);
menuButton.listeners.click();
assert.equal(menuButton.attributes['aria-expanded'], 'true');
assert.equal(menuButton.attributes['aria-label'], '메뉴 닫기');
assert.equal(menuNav.inert, false);
menuListeners.keydown({ key: 'Escape' });
assert.equal(menuButton.focused, true);
assert.equal(menuNav.inert, true);
assert.equal(menuButton.attributes['aria-expanded'], 'false');
for (const close of [() => menuLink.listeners.click(), () => menuListeners.click({ target: {} }), () => resizeMenu()]) {
  menuButton.listeners.click();
  close();
  assert.equal(menuButton.attributes['aria-label'], '메뉴 열기');
  assert.equal(menuNav.attributes['aria-hidden'], 'true');
  assert.equal(menuNav.inert, true);
}
// Rapid FAQ toggles keep only the latest answer open, even above the old 300px cap.
const faqItems = [420, 160].map(height => {
  const item = menuElement(), btn = menuElement();
  const answer = { style: {}, firstElementChild: { scrollHeight: height } };
  item.querySelector = selector => selector === '.faq-q' ? btn : answer;
  btn.closest = () => item;
  return { item, btn, answer };
});
const accordion = runInNewContext(`${moduleSource('faq').replace('return { init };', 'return { toggle };')}\nfaq;`, {
  document: { querySelectorAll: () => faqItems.filter(({ item }) => item.classList.contains('faq-open')).map(({ item }) => item) },
});
accordion.toggle(faqItems[0].btn);
assert.equal(faqItems[0].answer.style.height, '420px');
assert.equal(faqItems[0].answer.inert, false);
accordion.toggle(faqItems[1].btn);
assert.equal(faqItems[0].answer.style.height, '0px');
assert.equal(faqItems[0].answer.inert, true);
assert.equal(faqItems[1].btn.attributes['aria-expanded'], 'true');
accordion.toggle(faqItems[1].btn);
accordion.toggle(faqItems[1].btn);
assert.equal(faqItems[1].answer.style.height, '160px');

// Slideshow wrapping and user interaction must not restart unwanted autoplay.
const sliderNodes = new Map(), slideEvents = {}, timers = new Map();
let timerId = 0, hover = false;
const media = { matches: false, addEventListener(_, handler) { this.change = handler; } };
const node = () => {
  const el = menuElement();
  el.style = {}; el.children = []; el.complete = true; el.naturalWidth = 100;
  el.appendChild = child => el.children.push(child);
  el.querySelectorAll = () => el.children;
  el.querySelector = () => el.children.find(child => child.classList.contains('is-active'));
  return el;
};
for (const id of ['showcase-slider', 'slider-dots', 'slider-prev', 'slider-next', 'slider-pause']) sliderNodes.set(id, node());
const outer = node(); outer.matches = () => hover;
const slides = sliderNodes.get('showcase-slider'); slides.closest = () => outer;
const slideDocument = { hidden: false, createElement: node, activeElement: null,
  querySelectorAll: () => sliderNodes.get('slider-dots').children,
  addEventListener: (type, handler) => { slideEvents[type] = handler; } };
const slideshow = runInNewContext(`${moduleSource('slider')}\nslider;`, {
  utils: { $: id => sliderNodes.get(id) }, CONFIG: { SLIDER_IMAGES: 10, SLIDER_AUTO_MS: 5000 },
  document: slideDocument, window: { matchMedia: () => media }, sound: { play() {} },
  lightbox: { open() {} }, requestAnimationFrame: fn => fn(),
  setInterval: fn => { timers.set(++timerId, fn); return timerId; }, clearInterval: id => timers.delete(id),
});
slideshow.build();
assert.equal(timers.size, 1);
sliderNodes.get('slider-prev').listeners.click();
assert.equal(slides.children[9].tabIndex, 0);
sliderNodes.get('slider-next').listeners.click();
assert.equal(slides.children[0].tabIndex, 0);
assert.equal(slides.children.filter(img => img.tabIndex === 0).length, 1);
slides.children[1].complete = false;
sliderNodes.get('slider-next').listeners.click();
assert.equal(slides.children[0].classList.contains('is-active'), true);
assert.equal(slides.children[1].loading, 'eager');
slides.children[1].complete = true; slides.children[1].listeners.load();
assert.equal(slides.children[1].classList.contains('is-active'), true);
assert.equal(slideEvents.keydown, undefined, 'Arrow keys must remain scoped to the slideshow');
const pause = sliderNodes.get('slider-pause');
pause.listeners.click({ currentTarget: pause });
assert.equal(timers.size, 0);
pause.listeners.click({ currentTarget: pause });
assert.equal(timers.size, 1);
hover = true; outer.listeners.mouseenter(); assert.equal(timers.size, 0);
hover = false; outer.listeners.mouseleave(); assert.equal(timers.size, 1);
slideDocument.hidden = true; slideEvents.visibilitychange(); assert.equal(timers.size, 0);
slideDocument.hidden = false; slideEvents.visibilitychange(); assert.equal(timers.size, 1);
media.matches = true; media.change(); assert.equal(timers.size, 0);

// Multiple scroll events share one frame; a short page never divides by zero.
const frames = [], progressEvents = {}, progressBar = { style: {} };
const progressEnv = {
  utils: { $: () => progressBar }, innerHeight: 100, scrollY: 450,
  document: { documentElement: { scrollHeight: 1000 }, body: {} },
  window: { addEventListener: (type, handler) => { progressEvents[type] = handler; } },
  ResizeObserver: class { observe() {} }, requestAnimationFrame: fn => frames.push(fn),
};
const progress = runInNewContext(`${moduleSource('scrollProgress')}\nscrollProgress;`, progressEnv);
progress.init();
for (let i = 0; i < 10; i++) progressEvents.scroll();
assert.equal(frames.length, 1); frames.shift()();
assert.equal(progressBar.style.transform, 'scaleX(0.5)');
progressEnv.document.documentElement.scrollHeight = 100;
progressEvents.resize(); frames.shift()();
assert.equal(progressBar.style.transform, 'scaleX(0)');

// A cached tab switch still wins over an earlier, slower leaderboard response.
const miniList = { innerHTML: '', attributes: {}, querySelector: () => null,
  setAttribute(key, value) { this.attributes[key] = value; } };
let resolveScore;
const mini = runInNewContext(`${moduleSource('miniRanking').replace('return { init };', 'return { render };')}\nminiRanking;`, {
  CONFIG: { SUPABASE: { url: 'https://example.test', key: 'public' }, MINI_RANK_TTL: 60000 },
  utils: { $: () => miniList, sanitizeText: text => text }, AbortController, console,
  scoreCalc: { getTop: () => new Promise(resolve => { resolveScore = resolve; }) },
  fetch: async () => ({ ok: true, json: async () => [{ entry: 'Latest player', value: 7 }] }),
  setTimeout: () => 1, clearTimeout() {},
});
const slowScore = mini.render('score'); await mini.render('all_kill');
resolveScore([{ entry: 'Old player', value: 9 }]); await slowScore;
assert.match(miniList.innerHTML, /Latest player/);
assert.doesNotMatch(miniList.innerHTML, /Old player/);
assert.equal(miniList.attributes['aria-busy'], 'false');

// The control counter follows frame timestamps and respects reduced motion.
const controlsSource = readFileSync(new URL('../controls.html', import.meta.url), 'utf8');
const counterSource = controlsSource.slice(controlsSource.indexOf('      function animateCount('), controlsSource.indexOf('      /* ── IntersectionObserver'));
const counterFrames = [], countMedia = { matches: false };
const counter = runInNewContext(`${counterSource}\nanimateCount;`, {
  window: { matchMedia: () => countMedia }, performance: { now: () => 0 }, requestAnimationFrame: fn => counterFrames.push(fn),
});
const countValue = {}; counter(countValue, 100, 700);
counterFrames.shift()(300); assert.ok(countValue.textContent > 0 && countValue.textContent < 100);
counterFrames.shift()(770); assert.equal(countValue.textContent, 100); assert.equal(counterFrames.length, 0);
countMedia.matches = true; counter(countValue, 50, 700);
assert.equal(countValue.textContent, 50); assert.equal(counterFrames.length, 0);

// An old wiki response must never overwrite the user's newer document choice.
const wikiSource = readFileSync(new URL('../wiki.html', import.meta.url), 'utf8');
const loadDocSource = wikiSource.slice(wikiSource.indexOf('    async function loadDoc(id)'), wikiSource.indexOf('    /* 전역 노출'));
const pendingDocs = new Map();
const docLocation = { hash: '' }, docHistory = [];
const wikiContent = { innerHTML: '', attributes: {}, querySelector: () => null, querySelectorAll: () => [],
  setAttribute(key, value) { this.attributes[key] = value; } };
const wiki = runInNewContext(`let currentId = null, docRequest = 0; ${loadDocSource}\nloadDoc;`, {
  allDocs: ['a', 'b', 'c'].map(id => ({ id, title: `Document ${id}`, path: `${id}.md` })),
  setActiveNode() {}, location: docLocation,
  history: { pushState(_, __, hash) { docHistory.push(hash); docLocation.hash = hash; } }, window: { scrollTo() {} },
  document: { getElementById: () => wikiContent },
  processMarkdown: text => text, postProcessHTML: text => text,
  marked: { use() {}, parse: text => text }, buildBreadcrumb: () => '', buildSubpages: () => '', buildTOC: () => null, bindMediaEvents() {},
  fetch: path => new Promise((resolve, reject) => pendingDocs.set(path, { resolve, reject })),
});
const first = wiki('a'), second = wiki('b');
pendingDocs.get('./wiki/b.md').resolve({ ok: true, text: async () => 'New document' });
await second;
assert.match(wikiContent.innerHTML, /Document b/);
pendingDocs.get('./wiki/a.md').resolve({ ok: true, text: async () => 'Old document' });
await first;
assert.match(wikiContent.innerHTML, /Document b/);
assert.equal(wikiContent.attributes['aria-busy'], 'false');
const failed = wiki('c'); pendingDocs.get('./wiki/c.md').reject(new Error('offline')); await failed;
assert.match(wikiContent.innerHTML, /다시 시도/);
assert.equal(wikiContent.attributes['aria-busy'], 'false');
docLocation.hash = '#b';
const previous = wiki('b');
pendingDocs.get('./wiki/b.md').resolve({ ok: true, text: async () => 'Previous document' }); await previous;
assert.equal(docHistory.length, 3, 'Back navigation must not add another history entry');

// Closing and immediately reopening an image cannot clear the new image.
const overlay = node(), image = node(), closeButton = node(), imageTrigger = node(), imageEvents = {};
const imageDocument = { activeElement: imageTrigger, body: { style: {} },
  addEventListener: (type, handler) => { imageEvents[type] = handler; } };
const imageViewer = runInNewContext(`${moduleSource('lightbox')}\nlightbox;`, {
  utils: { $: id => ({ 'lightbox-overlay': overlay, 'lightbox-img': image, 'lightbox-close': closeButton }[id]) }, document: imageDocument,
});
imageViewer.init(); assert.equal(overlay.inert, true);
imageViewer.open('first.png', 'First'); assert.equal(overlay.inert, false);
imageEvents.keydown({ key: 'Escape' }); assert.equal(imageTrigger.focused, true);
imageViewer.open('second.png', 'Second'); assert.equal(image.src, 'second.png');
let tabBlocked = false;
imageEvents.keydown({ key: 'Tab', preventDefault() { tabBlocked = true; } });
assert.equal(tabBlocked, true); assert.equal(closeButton.focused, true);

// Even a skipped native transition can call its update later: ignore old choices.
const mapsSource = readFileSync(new URL('../maps.html', import.meta.url), 'utf8');
const switchSource = mapsSource.slice(mapsSource.indexOf('      let viewTransition;'), mapsSource.indexOf('      /* ── 맵 로드'));
const mapContainer = node(), mapUpdates = [], mapMedia = { matches: false };
const switchMapView = runInNewContext(`${switchSource}\nswitchView;`, {
  container: mapContainer, window: { matchMedia: () => mapMedia },
  document: { startViewTransition(update) { mapUpdates.push(update); return { skipTransition() {} }; } },
});
switchMapView(true); mapMedia.matches = true; switchMapView(false);
mapUpdates.shift()(); assert.equal(mapContainer.classList.contains('view-list'), false);
switchMapView(true); assert.equal(mapContainer.classList.contains('view-list'), true);

// A mobile document drawer loses its focusable controls while closed; desktop stays usable.
const drawer = menuElement(), drawerButton = menuElement(), drawerMedia = { matches: true };
drawerButton.querySelector = () => ({ textContent: '' });
const drawerDocument = { activeElement: drawer, getElementById: id => id === 'wiki-sidebar' ? drawer : drawerButton };
const drawerSource = wikiSource.slice(wikiSource.indexOf('    function setSidebarOpen('), wikiSource.indexOf('    const mobileWiki ='));
const setDrawerOpen = runInNewContext(`${drawerSource}\nsetSidebarOpen;`, { document: drawerDocument, mobileWiki: drawerMedia });
setDrawerOpen(false); assert.equal(drawer.inert, true); assert.equal(drawerButton.focused, true);
setDrawerOpen(true); assert.equal(drawer.inert, false);
drawerMedia.matches = false; setDrawerOpen(false); assert.equal(drawer.inert, false);
console.log('UX checks passed: downloads, server recovery, menus, FAQ, slideshow, frame scheduling, wiki/ranking races, image focus, map transitions.');
