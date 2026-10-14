import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

// Exercise the shipped handlers without a network connection or launching the client.
const source = readFileSync(new URL('../asset/script.js', import.meta.url), 'utf8');
const elements = new Map();
const element = id => {
  if (!elements.has(id)) elements.set(id, {
    textContent: '', dataset: {}, style: {}, attributes: {}, listeners: {},
    classList: { add() {}, remove() {} },
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
const sharedLoading = runInNewContext(`${moduleSource('loading')}\nloading;`);
environment.loading = sharedLoading;
const config = runInNewContext(`${source.slice(source.indexOf('const CONFIG ='), source.indexOf('const platformGuard ='))}\nCONFIG;`);
assert.equal(config.REPOS.client, 'tharu8813/Min-At-Zero-Clinet');
assert.equal(config.FALLBACK.clientUrl, `https://github.com/${config.REPOS.client}/releases/latest`);
const home = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
assert.ok(home.includes(`href="${config.FALLBACK.clientUrl}"`));
const serverGuide = readFileSync(new URL('../serverinfo.html', import.meta.url), 'utf8');
for (const markup of [home, serverGuide, readFileSync(new URL('../asset/footer.html', import.meta.url), 'utf8')]) {
  for (const [, page, fragment] of markup.matchAll(/href="(index|serverinfo)\.html#([^"]+)"/g)) {
    assert.ok((page === 'index' ? home : serverGuide).includes(`id="${fragment}"`), `Missing ${page} anchor: ${fragment}`);
  }
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
let siteMotionOff = false;
const slideDocument = { hidden: false, createElement: node, activeElement: null, documentElement: { classList: { contains: () => siteMotionOff } },
  querySelectorAll: () => sliderNodes.get('slider-dots').children,
  addEventListener: (type, handler) => { slideEvents[type] = handler; } };
const slideshow = runInNewContext(`${moduleSource('slider')}\nslider;`, {
  utils: { $: id => sliderNodes.get(id) }, CONFIG: { SLIDER_IMAGES: 10, SLIDER_AUTO_MS: 5000 },
  document: slideDocument, window: { matchMedia: () => media }, sound: { play() {} },
  lightbox: { open() {} }, requestAnimationFrame: fn => fn(),
  loading: sharedLoading,
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
media.matches = false; siteMotionOff = true; slideEvents.motionchange(); assert.equal(timers.size, 0);

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
const miniList = { innerHTML: '', attributes: {}, querySelector: () => null, classList: { add() {}, remove() {} },
  setAttribute(key, value) { this.attributes[key] = value; } };
let resolveScore;
const mini = runInNewContext(`${moduleSource('miniRanking').replace('return { init };', 'return { render };')}\nminiRanking;`, {
  CONFIG: { SUPABASE: { url: 'https://example.test', key: 'public' }, MINI_RANK_TTL: 60000 },
  utils: { $: () => miniList, sanitizeText: text => text }, AbortController, console,
  scoreCalc: { getTop: () => new Promise(resolve => { resolveScore = resolve; }) },
  fetch: async () => ({ ok: true, json: async () => [{ entry: 'Latest player', value: 7 }] }),
  setTimeout: () => 1, clearTimeout() {},
  loading: sharedLoading,
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
  document: { documentElement: { classList: { contains: () => false } } },
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
const wikiContent = { innerHTML: '', attributes: {}, querySelector: () => null, querySelectorAll: () => [], classList: { add() {}, remove() {} },
  setAttribute(key, value) { this.attributes[key] = value; } };
const wiki = runInNewContext(`let currentId = null, docRequest = 0; ${loadDocSource}\nloadDoc;`, {
  allDocs: ['a', 'b', 'c'].map(id => ({ id, title: `Document ${id}`, path: `${id}.md` })),
  setActiveNode() {}, location: docLocation,
  history: { pushState(_, __, hash) { docHistory.push(hash); docLocation.hash = hash; } }, window: { scrollTo() {} },
  document: { getElementById: () => wikiContent },
  processMarkdown: text => text, postProcessHTML: text => text,
  marked: { use() {}, parse: text => text }, buildBreadcrumb: () => '', buildSubpages: () => '', buildTOC: () => null, bindMediaEvents() {},
  fetch: path => new Promise((resolve, reject) => pendingDocs.set(path, { resolve, reject })),
  loading: sharedLoading, AbortSignal,
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
const mapContainer = node(), mapUpdates = [], mapFinishes = [], mapMedia = { matches: false };
const switchMapView = runInNewContext(`${switchSource}\nswitchView;`, {
  container: mapContainer, window: { matchMedia: () => mapMedia },
  document: { documentElement: mapContainer,
    startViewTransition(update) { mapUpdates.push(update); return { skipTransition() {}, ready: Promise.resolve(), finished: { then(callback) { mapFinishes.push(callback); } } }; } },
});
switchMapView(true); mapMedia.matches = true; switchMapView(false);
mapUpdates.shift()(); assert.equal(mapContainer.classList.contains('view-list'), false);
switchMapView(true); assert.equal(mapContainer.classList.contains('view-list'), true);
mapMedia.matches = false; mapContainer.classList.add('motion-off');
switchMapView(false); assert.equal(mapContainer.classList.contains('view-list'), false);
assert.equal(mapUpdates.length, 0, 'The site motion preference also disables native map transitions');
mapContainer.classList.remove('motion-off');
switchMapView(true); switchMapView(false);
mapUpdates.forEach(update => update());
mapFinishes[0](); mapFinishes[1]();
assert.equal(mapContainer.classList.contains('map-view-transition'), true, 'An older transition cannot reset the current capture scope');
mapFinishes[2](); assert.equal(mapContainer.classList.contains('map-view-transition'), false);

// Map search, mode and distance combine without recreating images or changing the source.
const mapHelpersSource = mapsSource.slice(mapsSource.indexOf('      function normalizeMap('), mapsSource.indexOf('      function mediaMarkup('));
const mapHelpers = runInNewContext(`${mapHelpersSource}\n({ normalizeMap, matchesMap });`);
const rawMaps = JSON.parse(readFileSync(new URL('../map/map.json', import.meta.url), 'utf8'));
const atlasMaps = rawMaps.map(mapHelpers.normalizeMap);
atlasMaps.forEach((map, i) => assert.equal(map.image.length, Array.isArray(rawMaps[i].image) ? rawMaps[i].image.length : 0, 'Every registered preview remains available'));
const individualMap = mapHelpers.normalizeMap({ title: 'City', by: 'Builder', CombatDistance: '근거리, 중거리', gamemode: '게인 데스메치', mapSize: '215x250', image: ['map/18/1.png', 'javascript:bad', 'map/../outside.png'] });
assert.equal(individualMap.mode, '개인 데스매치'); assert.equal(individualMap.size, '215 × 250');
assert.equal(individualMap.image.length, 1);
assert.equal(mapHelpers.matchesMap(individualMap, ' BUILDER ', '개인 데스매치', '근거리'), true);
assert.equal(mapHelpers.matchesMap(individualMap, '', '팀 데스매치', ''), false);
assert.equal(mapHelpers.matchesMap(individualMap, '', '', '장거리'), false);
const atlasNodes = new Map();
const atlasNode = id => { if (!atlasNodes.has(id)) atlasNodes.set(id, node()); return atlasNodes.get(id); };
const atlasEntries = atlasMaps.map(map => ({ map, card: node() }));
const modeButtons = ['', '팀 데스매치', '개인 데스매치'].map(mode => { const button = node(); button.dataset = { mode }; return button; });
const atlasEnv = { $: atlasNode, maps: atlasMaps, mapEntries: atlasEntries, selectedMode: '',
  search: { value: '' }, distance: { value: '' }, empty: atlasNode('empty'), matchesMap: mapHelpers.matchesMap,
  document: { querySelectorAll: () => modeButtons },
};
const filterSource = mapsSource.slice(mapsSource.indexOf('      function applyFilters('), mapsSource.indexOf('      function renderMaps('));
const atlasFilter = runInNewContext(`${filterSource}\n({ applyFilters, resetFilters });`, atlasEnv);
atlasEnv.search.value = 'Cryptic'; atlasEnv.distance.value = '근거리'; atlasEnv.selectedMode = '팀 데스매치';
atlasFilter.applyFilters();
assert.ok(atlasEntries.some(({ card }) => !card.hidden));
atlasEntries.filter(({ card }) => !card.hidden).forEach(({ map }) => {
  assert.match(map.by, /Cryptic/i); assert.equal(map.mode, '팀 데스매치'); assert.match(map.CombatDistance, /근거리/);
});
const retainedCard = atlasEntries[0].card;
atlasEnv.search.value = 'no_matching_map_000'; atlasFilter.applyFilters();
assert.equal(atlasEnv.empty.hidden, false); assert.equal(atlasEntries.every(({ card }) => card.hidden), true);
atlasFilter.resetFilters(); assert.equal(atlasEntries.every(({ card }) => !card.hidden), true);
assert.equal(atlasEntries[0].card, retainedCard); assert.equal(modeButtons[0].attributes['aria-pressed'], 'true');
assert.equal(rawMaps[0].gamemode, '팀 데스메치', 'Display normalization must not edit the registered map data');

// A failed or malformed catalog clears every skeleton; a retry restores the controls.
const atlasLoadEnv = { $: atlasNode, controls: [atlasNode('input')], container: atlasNode('container'),
  empty: atlasEnv.empty, retry: atlasNode('retry'), skeletons: '<div class="skeleton"></div>',
  maps: [], mapEntries: [], fetching: false, loading: sharedLoading, AbortSignal,
  normalizeMap: mapHelpers.normalizeMap, renderMaps() {}, fetch: async () => { throw new Error('offline'); },
};
const atlasLoadSource = mapsSource.slice(mapsSource.indexOf('      async function loadMaps('), mapsSource.indexOf('      /* ── 모달 열기'));
const loadAtlas = runInNewContext(`${atlasLoadSource}\nloadMaps;`, atlasLoadEnv);
await loadAtlas(); assert.equal(atlasLoadEnv.retry.hidden, false);
assert.equal(atlasLoadEnv.container.attributes['aria-busy'], 'false');
assert.equal(atlasNode('map-count').attributes['aria-busy'], 'false');
assert.equal(atlasLoadEnv.controls[0].disabled, true);
atlasLoadEnv.fetch = async () => ({ ok: true, json: async () => ({ invalid: true }) });
await loadAtlas(); assert.equal(atlasLoadEnv.retry.hidden, false);
atlasLoadEnv.fetch = async () => ({ ok: true, json: async () => rawMaps });
await loadAtlas(); assert.equal(atlasLoadEnv.retry.hidden, true); assert.equal(atlasLoadEnv.controls[0].disabled, false);
assert.equal(atlasNode('map-count').textContent, rawMaps.length);

// Modal images wrap, zero-image maps stay usable, and closing restores the opener.
class AtlasElement { constructor() { Object.assign(this, node()); } }
const modalNodes = new Map();
const modalNode = id => { if (!modalNodes.has(id)) modalNodes.set(id, new AtlasElement()); return modalNodes.get(id); };
let atlasKeys;
const atlasModalEnv = { $: modalNode, modal: modalNode('modal'), modalSlider: modalNode('slides'), sliderDots: modalNode('dots'),
  currentSlide: 0, totalSlides: 0, imageCount: 0, lastModalTrigger: null, esc: String,
  mediaMarkup: () => '<img alt="map">', HTMLElement: AtlasElement, requestAnimationFrame: callback => callback(),
  document: { body: { style: {} }, addEventListener(_, callback) { atlasKeys = callback; }, activeElement: null },
};
const modalSliderSource = mapsSource.slice(mapsSource.indexOf('      function updateSlider('), mapsSource.indexOf('      /* ── 뷰 전환'));
const atlasModalSource = mapsSource.slice(mapsSource.indexOf('      function openModal('), mapsSource.indexOf('      /* ── 이벤트'));
const atlasKeysSource = mapsSource.slice(mapsSource.indexOf("      document.addEventListener('keydown'"), mapsSource.indexOf("      $('btn-grid').onclick"));
const atlasModal = runInNewContext(`${modalSliderSource}${atlasModalSource}${atlasKeysSource}\n({ openModal, closeModal });`, atlasModalEnv);
const atlasOpener = new AtlasElement();
atlasModal.openModal(atlasMaps.find(map => map.image.length > 1), atlasOpener);
assert.equal(modalNode('page-content').inert, true); assert.equal(modalNode('modal-close').focused, true);
atlasKeys({ key: 'ArrowLeft', preventDefault() {} }); assert.equal(atlasModalEnv.currentSlide, atlasModalEnv.imageCount - 1);
atlasKeys({ key: 'ArrowRight', preventDefault() {} }); assert.equal(atlasModalEnv.currentSlide, 0);
atlasKeys({ key: 'Escape' }); assert.equal(modalNode('page-content').inert, false); assert.equal(atlasOpener.focused, true);
atlasModal.openModal(mapHelpers.normalizeMap({ title: 'No preview', image: null }), atlasOpener);
assert.equal(modalNode('slider-next').disabled, true); assert.equal(modalNode('modal-image-count').textContent, '미리보기 없음');
atlasKeys({ key: 'ArrowRight', preventDefault() {} }); assert.equal(atlasModalEnv.currentSlide, 0);
atlasModal.closeModal();

// A mobile document drawer loses its focusable controls while closed; desktop stays usable.
const drawer = menuElement(), drawerButton = menuElement(), drawerMedia = { matches: true };
drawerButton.querySelector = () => ({ textContent: '' });
const drawerDocument = { activeElement: drawer, getElementById: id => id === 'wiki-sidebar' ? drawer : drawerButton };
const drawerSource = wikiSource.slice(wikiSource.indexOf('    function setSidebarOpen('), wikiSource.indexOf('    const mobileWiki ='));
const setDrawerOpen = runInNewContext(`${drawerSource}\nsetSidebarOpen;`, { document: drawerDocument, mobileWiki: drawerMedia });
setDrawerOpen(false); assert.equal(drawer.inert, true); assert.equal(drawerButton.focused, true);
setDrawerOpen(true); assert.equal(drawer.inert, false);
drawerMedia.matches = false; setDrawerOpen(false); assert.equal(drawer.inert, false);

// Loading clears on failure and never fades the entire region back from zero.
const loadRegion = node(); loadRegion.textContent = 'Known content';
sharedLoading.begin(loadRegion);
assert.equal(loadRegion.attributes['aria-busy'], 'true');
assert.equal(loadRegion.classList.contains('skeleton-text'), true);
sharedLoading.end(loadRegion);
assert.equal(loadRegion.attributes['aria-busy'], 'false');
assert.equal(loadRegion.classList.contains('skeleton-text'), false);
assert.equal(loadRegion.classList.contains('loaded-content'), false);
assert.equal(loadRegion.textContent, 'Known content');

const mediaSkeleton = node(), mediaParent = node(), pendingImage = node();
mediaParent.querySelector = () => mediaSkeleton;
pendingImage.parentElement = mediaParent; pendingImage.tagName = 'IMG';
pendingImage.getAttribute = () => 'image.png'; pendingImage.complete = false; pendingImage.naturalWidth = 0;
const mediaLoader = runInNewContext(`${moduleSource('mediaLoading')}\nmediaLoading;`);
mediaLoader.pending(pendingImage);
assert.equal(pendingImage.classList.contains('media-pending'), true);
pendingImage.complete = true;
mediaLoader.settle(pendingImage);
assert.equal(pendingImage.attributes['aria-busy'], 'false');
assert.equal(pendingImage.classList.contains('media-error'), true);
assert.equal(mediaSkeleton.classList.contains('hidden'), true);
pendingImage.tagName = 'VIDEO'; pendingImage.readyState = 3;
mediaLoader.pending(pendingImage, true);
assert.equal(pendingImage.classList.contains('media-pending'), true, 'Buffering still needs a skeleton after metadata loads');
mediaLoader.settle(pendingImage);
assert.equal(pendingImage.classList.contains('media-pending'), false);

// Above-fold content settles without hiding; scrolled-in sections still reveal.
const motionRoot = node(), motionButton = node(), motionMedia = { matches: false, addEventListener(_, callback) { this.change = callback; } };
const sceneElements = [100, 1200, 1300].map(top => {
  const el = node(); el.getBoundingClientRect = () => ({ top }); el.closest = () => null;
  el.style.setProperty = () => {}; return el;
});
sceneElements.forEach(el => { el.parentElement = { children: sceneElements }; });
const motionDoc = { hidden: false, documentElement: motionRoot, body: {}, addEventListener() {}, dispatchEvent() {},
  querySelectorAll: selector => selector === '.motion-pending' ? sceneElements.filter(el => el.classList.contains('motion-pending')) : sceneElements };
const observedScenes = []; let sceneObserver; let motionSaved;
const motion = runInNewContext(`${moduleSource('scrollReveal')}\nscrollReveal;`, {
  utils: { $: () => motionButton }, innerHeight: 900, document: motionDoc,
  window: { matchMedia: () => motionMedia },
  localStorage: { getItem: () => null, setItem: (_, value) => { motionSaved = value; } },
  IntersectionObserver: class { constructor(callback) { sceneObserver = callback; } observe(el) { observedScenes.push(el); } unobserve() {} },
  MutationObserver: class { observe() {} }, Event,
});
motion.init();
assert.equal(sceneElements[0].classList.contains('motion-enter'), false);
assert.equal(sceneElements[0].classList.contains('motion-settle'), true);
assert.equal(sceneElements[0].classList.contains('motion-pending'), false);
assert.equal(observedScenes.length, 2);
sceneObserver([{ isIntersecting: true, target: sceneElements[1] }]);
assert.equal(sceneElements[1].classList.contains('motion-pending'), false);
assert.equal(sceneElements[1].classList.contains('motion-enter'), true);
sceneElements[2].classList.remove('motion-pending');
sceneObserver([{ isIntersecting: true, target: sceneElements[2] }]);
assert.equal(sceneElements[2].classList.contains('motion-enter'), false, 'A card revealed by filtering cannot fade back from zero');
motionButton.listeners.click();
assert.equal(motionRoot.classList.contains('motion-off'), true);
assert.equal(motionSaved, 'off');
motionMedia.matches = true; motionMedia.change();
assert.equal(motionButton.disabled, true);

// A player selected before rankings load gets a skeleton, then complete stats.
const rankingSource = readFileSync(new URL('../ranking.html', import.meta.url), 'utf8');
const sceneCSS = readFileSync(new URL('../asset/theme.css', import.meta.url), 'utf8');
assert.match(sceneCSS, /:root \{ view-transition-name: none; \}/);
assert.match(sceneCSS, /::view-transition-old\(page-scene\)\s*\{\s*animation: none; opacity: 1;/);
for (const page of ['index', 'serverinfo', 'ranking', 'maps', 'controls', 'developers']) {
  const markup = readFileSync(new URL(`../${page}.html`, import.meta.url), 'utf8');
  const start = markup.indexOf('<main id="page-content"');
  const end = markup.indexOf('</main>', start);
  assert.ok(start > markup.indexOf('id="header-root"') && end > start && end < markup.indexOf('id="footer-root"'), `${page}: navigation stays outside the captured content`);
}
assert.match(sceneCSS, /@keyframes scene-settle \{ from \{ opacity: 1;/);
assert.doesNotMatch(sceneCSS, /clip-path: inset\(0 0 100% 0\)/);
const rankingCSS = readFileSync(new URL('../asset/ranking.css', import.meta.url), 'utf8');
assert.match(rankingCSS, /\.lb-table tbody tr \{\s*opacity: 1;\s*animation: row-settle/);
// An interrupted navigation is expected; unexpected capture failures remain visible.
const navigationErrors = []; let onPageReveal, onReadyError, skippedNavigation = false;
runInNewContext(source.slice(source.indexOf("  window.addEventListener('pagereveal'"), source.indexOf('  mediaLoading.init();')), {
  window: { addEventListener(_, callback) { onPageReveal = callback; } },
  document: { documentElement: motionRoot }, console: { error: error => navigationErrors.push(error) },
});
onPageReveal({});
onPageReveal({ viewTransition: { ready: { catch(callback) { onReadyError = callback; } }, skipTransition() { skippedNavigation = true; } } });
assert.equal(skippedNavigation, true);
onReadyError({ name: 'AbortError' }); assert.equal(navigationErrors.length, 0);
onReadyError({ name: 'InvalidStateError' }); assert.equal(navigationErrors.length, 1);
const playerNodes = new Map();
const playerNode = id => { if (!playerNodes.has(id)) playerNodes.set(id, node()); return playerNodes.get(id); };
const playerSearchSource = rankingSource.slice(rankingSource.indexOf('      function performSearch('), rankingSource.indexOf('      function showSkeletons('));
const playerEnv = {
  searchedName: '', currentTab: 'score', allPlayers: null, loading: sharedLoading, $: playerNode,
  playerCard: playerNode('player-card'), playerNF: playerNode('not-found'), searchClear: playerNode('clear'),
  renderTable() {}, highlightPlayer() {}, animateStatBoxes() {}, requestAnimationFrame: callback => callback(),
};
const playerSearch = runInNewContext(`${playerSearchSource}\nperformSearch;`, playerEnv);
playerSearch('Example', false);
assert.equal(playerEnv.playerCard.attributes['aria-busy'], 'true');
assert.equal((playerNode('player-stats-grid').innerHTML.match(/stat-box skeleton/g) || []).length, 9);
playerEnv.allPlayers = [{ name: 'Example', score: 5, rounds: 3, wins: 1, kills: 4, deaths: 2, assists: 1, kda: 2.5, playtime: 1 }];
playerSearch('Example', false);
assert.equal(playerEnv.playerCard.attributes['aria-busy'], 'false');
assert.equal(playerNode('player-name').textContent, 'Example');
assert.equal(playerNode('player-name').classList.contains('skeleton-text'), false);
assert.doesNotMatch(playerNode('player-stats-grid').innerHTML, /stat-box skeleton/);

// Spotlight and table follow the same category, including zero and empty records.
const rankingNodes = new Map();
const rankingNode = id => { if (!rankingNodes.has(id)) rankingNodes.set(id, node()); return rankingNodes.get(id); };
const tabConfig = runInNewContext(`${rankingSource.slice(rankingSource.indexOf('      const TAB_CFG ='), rankingSource.indexOf('      let allPlayers'))}\nTAB_CFG;`);
const escSource = rankingSource.slice(rankingSource.indexOf('      function escHtml('), rankingSource.indexOf('      function handleUrlParams('));
const records = [
  { name: 'Alpha', score: 10, kills: 0, playtime: 0 },
  { name: 'Bravo', score: 6, kills: 12, playtime: 2 },
  { name: 'Delta', score: 4, kills: 3, playtime: 1 },
  { name: '<img onerror="bad">', score: 0, kills: 0, playtime: 0 },
].map(p => ({ deaths: 0, assists: 0, rounds: 4, wins: 0, winRate: 0, kda: 0, ...p }));
const rankingEnv = { $: rankingNode, TAB_CFG: tabConfig, allPlayers: records, currentTab: 'score', searchedName: '',
  spotlight: rankingNode('rank-spotlight'), spotlightSkeleton: '<div class="skeleton"></div>',
  lbTbody: rankingNode('tbody'), lbColLabel: rankingNode('label'), lbUpdated: rankingNode('updated'),
  lbCountBadge: rankingNode('count'), playerCard: rankingNode('player'), refreshBtn: rankingNode('refresh'),
  FALLBACK_AV: 'fallback', selectPlayer() {}, loading: sharedLoading,
};
const tableSource = rankingSource.slice(rankingSource.indexOf('      function highlightPlayer('), rankingSource.indexOf('      function performSearch('));
const renderRanking = runInNewContext(`${escSource}${tableSource}\nrenderTable;`, rankingEnv);
renderRanking('score');
assert.ok(rankingEnv.spotlight.innerHTML.indexOf('Alpha') < rankingEnv.spotlight.innerHTML.indexOf('Bravo'));
assert.equal((rankingEnv.spotlight.innerHTML.match(/class="spotlight-player"/g) || []).length, 3);
assert.match(rankingEnv.lbTbody.innerHTML, /&lt;img onerror=&quot;bad&quot;&gt;/);
renderRanking('all_kill');
assert.ok(rankingEnv.spotlight.innerHTML.indexOf('Bravo') < rankingEnv.spotlight.innerHTML.indexOf('Delta'));
assert.ok(rankingEnv.lbTbody.innerHTML.indexOf('Bravo') < rankingEnv.lbTbody.innerHTML.indexOf('Delta'));
assert.equal(rankingNode('lb-board').attributes['aria-labelledby'], 'rank-tab-all_kill');
renderRanking('playTime_H'); assert.match(rankingEnv.spotlight.innerHTML, /2<small>h<\/small>/);
renderRanking('win_count'); assert.doesNotMatch(rankingEnv.lbTbody.innerHTML, /NaN|Infinity/);
assert.match(rankingEnv.lbTbody.innerHTML, /--rank-share:0/);
rankingEnv.allPlayers = []; renderRanking('score');
assert.equal(rankingNode('spotlight-section').hidden, true);
assert.match(rankingEnv.lbTbody.innerHTML, /colspan="5"/);
const selectedRow = node(), selectedName = node(), selectedSpotlight = node();
selectedRow.dataset = { player: 'Alpha' }; selectedRow.querySelector = () => selectedName;
selectedSpotlight.dataset = { player: 'Alpha' };
rankingEnv.lbTbody.children = [selectedRow]; rankingEnv.spotlight.children = [selectedSpotlight];
rankingEnv.searchedName = 'alpha';
const highlightRanking = runInNewContext(`${tableSource}\nhighlightPlayer;`, rankingEnv);
highlightRanking();
assert.equal(selectedRow.classList.contains('row-highlighted'), true);
assert.equal(selectedSpotlight.classList.contains('is-selected'), true);
const existingRows = rankingEnv.lbTbody.innerHTML;
rankingEnv.searchedName = ''; highlightRanking();
assert.equal(selectedRow.classList.contains('row-highlighted'), false);
assert.equal(rankingEnv.lbTbody.innerHTML, existingRows, 'Selecting a player must retain rows, avatars and focus');

// Refresh failure clears both loading regions; retry uses the matching five-cell rows.
const skeletonSource = rankingSource.slice(rankingSource.indexOf('      function showSkeletons('), rankingSource.indexOf('      function handleUrlParams('));
const dataSource = rankingSource.slice(rankingSource.indexOf('      async function loadData('), rankingSource.indexOf('      function selectPlayer('));
Object.assign(rankingEnv, { allPlayers: null, fetching: false, performSearch() {},
  fetchTable: async () => { throw new Error('offline'); }, console: { error() {}, warn() {} },
});
const loadRanking = runInNewContext(`${skeletonSource}${dataSource}\nloadData;`, rankingEnv);
await loadRanking();
assert.equal(rankingEnv.spotlight.attributes['aria-busy'], 'false');
assert.equal(rankingEnv.lbTbody.attributes['aria-busy'], 'false');
assert.equal(rankingNode('spotlight-section').hidden, true);
assert.match(rankingEnv.lbTbody.innerHTML, /role="alert"/);

// Keyboard category selection wraps and keeps only the active tab in the focus order.
const categoryTabs = ['score', 'all_kill', 'kda'].map(key => {
  const tab = node(); tab.dataset = { tab: key }; tab.closest = () => tab; tab.scrollIntoView = () => {}; return tab;
});
let selectedCategory;
const tabHandlers = rankingSource.slice(rankingSource.indexOf('      function selectTab('), rankingSource.indexOf('      /* 새로고침 */'));
runInNewContext(tabHandlers, { $: rankingNode, spotlight: rankingEnv.spotlight, selectPlayer() {},
  document: { querySelectorAll: () => categoryTabs }, renderTable: key => { selectedCategory = key; },
});
const pressCategory = (key, tab) => rankingNode('lb-tab-bar').listeners.keydown({ key, target: tab, preventDefault() {} });
pressCategory('ArrowLeft', categoryTabs[0]); assert.equal(selectedCategory, 'kda');
assert.equal(categoryTabs[2].tabIndex, 0); assert.equal(categoryTabs[0].tabIndex, -1);
pressCategory('Home', categoryTabs[2]); assert.equal(selectedCategory, 'score');
pressCategory('End', categoryTabs[0]); assert.equal(selectedCategory, 'kda');
const queryEnv = { URLSearchParams, TAB_CFG: tabConfig, currentTab: 'score', searchedName: '',
  location: { search: '?tab=all_kill&player=Bravo' }, searchInput: rankingNode('query-input'),
  searchClear: rankingNode('query-clear'), document: { querySelectorAll: () => categoryTabs },
};
const querySource = rankingSource.slice(rankingSource.indexOf('      function handleUrlParams('), rankingSource.indexOf('      /* 탭 전환 */'));
const readRankingQuery = runInNewContext(`${querySource}\nhandleUrlParams;`, queryEnv);
readRankingQuery(); assert.equal(queryEnv.currentTab, 'all_kill'); assert.equal(queryEnv.searchInput.value, 'Bravo');
assert.equal(categoryTabs[1].tabIndex, 0);
queryEnv.currentTab = 'score'; queryEnv.location.search = '?tab=constructor';
readRankingQuery(); assert.equal(queryEnv.currentTab, 'score', 'URL categories must be own configuration keys');

// The server guide keeps mod search and category selection working together.
const serverSource = readFileSync(new URL('../serverinfo.html', import.meta.url), 'utf8');
const failedRegions = new Map();
const failedNode = id => { if (!failedRegions.has(id)) failedRegions.set(id, node()); return failedRegions.get(id); };
const failedDescription = failedNode('si-desc');
const guideScript = [...serverSource.matchAll(/<script>([\s\S]*?)<\/script>/g)][0][1];
await runInNewContext(guideScript, {
  fetch: async () => { throw new Error('network unavailable'); },
  document: { getElementById: failedNode }, loading: sharedLoading, AbortSignal,
});
assert.match(failedDescription.textContent, /설치 안내와 FAQ/);
assert.equal(failedDescription.attributes.role, 'alert');
assert.equal(failedNode('info-grid').attributes['aria-busy'], 'false');
const mods = JSON.parse(readFileSync(new URL('../asset/serverinfo.json', import.meta.url), 'utf8')).mods;
const modNodes = new Map(['mod-filter-row', 'mod-count', 'mod-list', 'mod-search'].map(id => [id, node()]));
const allModsButton = node(); allModsButton.dataset = { tag: 'ALL' };
modNodes.get('mod-filter-row').children.push(allModsButton);
const modDocument = {
  getElementById: id => modNodes.get(id),
  createElement: () => { const button = node(); button.dataset = {}; return button; },
  querySelectorAll: () => modNodes.get('mod-filter-row').children,
};
const modSource = serverSource.slice(serverSource.indexOf('    const allMods ='), serverSource.lastIndexOf('    renderMods();') + '    renderMods();'.length);
runInNewContext(modSource, { mods, document: modDocument, esc: value => String(value) });
const selectModTag = tag => {
  const button = modNodes.get('mod-filter-row').children.find(el => el.dataset.tag === tag);
  modNodes.get('mod-filter-row').listeners.click({ target: { closest: () => button } });
  return button;
};
assert.match(modNodes.get('mod-count').innerHTML, new RegExp(`<span>${mods.length}</span>`));
const coreButton = selectModTag('CORE');
assert.equal(coreButton.attributes['aria-pressed'], 'true');
assert.equal(allModsButton.attributes['aria-pressed'], 'false');
assert.match(modNodes.get('mod-list').innerHTML, /Timeless/);
assert.doesNotMatch(modNodes.get('mod-list').innerHTML, /Embeddium/);
modNodes.get('mod-search').listeners.input({ target: { value: 'Embeddium' } });
assert.match(modNodes.get('mod-count').innerHTML, /<span>0<\/span>/);
selectModTag('ALL');
assert.match(modNodes.get('mod-count').innerHTML, /<span>1<\/span>/);
assert.match(modNodes.get('mod-list').innerHTML, /Embeddium/);
console.log('UX checks passed: downloads, server recovery, menus, FAQ, slideshow, frame scheduling, wiki/ranking races, image focus, map transitions, map filters/retry/gallery, mod filters, skeleton cleanup, motion preferences, player loading, ranking spotlight, keyboard categories, refresh failure.');
