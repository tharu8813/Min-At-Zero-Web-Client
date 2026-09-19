"use strict";

/* ════════════════════════════════════════════
   CONFIG
════════════════════════════════════════════ */
const CONFIG = Object.freeze({
  REPOS: {
    client: 'tharu8813/Min-At-Zero-Client',
    game: 'tharu8813/Min-At-Zero',
    notice: 'tharu8813/Min-At-Zero-Web-Client',
  },
  FALLBACK: {
    clientUrl: 'https://github.com/tharu8813/Min-At-Zero-Client/releases/latest',
  },
  SUPABASE: Object.freeze({
    url: 'https://mcojlhiycruiifrcaxam.supabase.co',
    key: 'sb_publishable_motLaW6vYM8bLPov6QTYMg_LxfbSXfr',
  }),
  EFFECTS: Object.freeze({
    particles: false,
    aurora: false,
    customCursor: false,
    typewriter: false,
    buttonFx: false,
  }),
  SERVER_IP: 'tharu81.kro.kr',
  STATUS_INTERVAL: 60_000,
  SLIDER_IMAGES: 10,
  SLIDER_AUTO_MS: 5_000,
  PARTICLES_MAX: 120,
  PARTICLES_CELL: 100,
  PARTICLES_MOUSE_R: 120,
  AURORA_LERP: 0.07,
  CURSOR_RING_LERP: 0.13,
  SOUND_PATH: 'asset/audio/',
  CUSTOM_PROTOCOL: 'matz-client://',
  MINI_RANK_TTL: 5 * 60 * 1000,
  API_CACHE_TTL: 3 * 60 * 1000,
});

const platformGuard = (() => {
  const ua = navigator.userAgent || '';
  const platform = navigator.userAgentData?.platform || navigator.platform || '';
  const userAgentDataBrands = navigator.userAgentData?.brands?.map(b => b.brand).join(' ') || '';
  const combinedAgent = `${ua} ${userAgentDataBrands}`;

  const isWindows = /windows/i.test(combinedAgent) || /win32|win64|windows/i.test(platform);
  const isMac = /macintosh|mac os x|macos/i.test(combinedAgent) || /mac|darwin/i.test(platform);
  const isLinux = /linux|x11/i.test(combinedAgent) || /linux/i.test(platform);
  const isAndroid = /android/i.test(combinedAgent);
  const isIOS = /(iphone|ipad|ipod)/i.test(combinedAgent);
  const isMobile = /android|iphone|ipad|ipod|mobile/i.test(combinedAgent);

  return {
    ua,
    platform,
    isWindows,
    isMac,
    isLinux,
    isAndroid,
    isIOS,
    isMobile,
    isSupported: isWindows,
    isDesktop: !isAndroid && !isIOS && !isMobile,
  };
})();

const platformGate = {
  init() {
    const unsupported = !platformGuard.isSupported;
    document.body.classList.toggle('platform-unsupported', unsupported);
    document.querySelectorAll('.launcher-card button').forEach(button => {
      button.disabled = unsupported;
    });
  },
};

/* ════════════════════════════════════════════
   SOUND (graceful no-op when audio unavailable)
════════════════════════════════════ */
const sound = (() => {
  const cache = Object.create(null);
  let muted = false;

  function play(name) {
    if (muted) return;
    try {
      if (!cache[name]) {
        const audio = new Audio(`${CONFIG.SOUND_PATH}${name}.mp3`);
        audio.volume = 0.25;
        audio.addEventListener('error', () => { muted = true; }, { once: true });
        cache[name] = audio;
      }
      const clip = cache[name];
      clip.currentTime = 0;
      clip.play().catch(() => {});
    } catch { /* audio unavailable */ }
  }

  return { play };
})();

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */
const utils = {
  fmtDate(d) {
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  },

  sanitizeText(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');
  },

  sanitizeUrl(url) {
    const trimmed = url.trim();
    if (/^https?:\/\//i.test(trimmed) || /^\//.test(trimmed) || /^\.\.?\//.test(trimmed)) {
      return trimmed.replace(/"/g, '%22').replace(/'/g, '%27');
    }
    return '#';
  },

  fmtMd(md) {
    if (!md) return '';

    // ── 0단계: CRLF → LF 정규화 (GitHub API는 \r\n 반환) ───────────────────
    md = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // ── 1단계: raw HTML <img> 태그를 토큰으로 보호 ──────────────────────────
    // GitHub 릴리즈 본문에는 ![alt](url) 대신 <img ...> 태그가 직접 오기도 함
    const tokens = [];

    const protectRawImg = (str) =>
      str.replace(/<img\b([^>]*)>/gi, (full, attrs) => {
        const srcM = attrs.match(/src=["']([^"']+)["']/i);
        const altM = attrs.match(/alt=["']([^"']*?)["']/i);
        if (!srcM) return full; // src 없으면 그냥 이스케이프되도록 둠
        const safeUrl = utils.sanitizeUrl(srcM[1]);
        const safeAlt = utils.sanitizeText(altM ? altM[1] : '');
        const id = `\x00T${tokens.length}\x00`;
        tokens.push(
          `<img src="${safeUrl}" alt="${safeAlt}" loading="lazy"` +
          ` style="max-width:100%;border-radius:8px;margin:10px 0;display:block;` +
          `border:1px solid var(--border);cursor:zoom-in;` +
          `transition:opacity 0.4s,transform 0.3s;opacity:0;transform:scale(0.97)"` +
          ` onload="this.style.opacity='1';this.style.transform='scale(1)'"` +
          ` onerror="this.style.display='none'"` +
          ` onclick="lightbox.open(this.src,this.alt)">`
        );
        return id;
      });

    // ── 2단계: MD 이미지/링크를 토큰으로 치환 ───────────────────────────────
    const protectMdInline = (str) =>
      str.replace(
        /!\[([^\]]*)\]\(([^)]+)\)|(?<!!)\[([^\]]*)\]\(([^)]+)\)/g,
        (_, iAlt, iUrl, lText, lUrl) => {
          const id = `\x00T${tokens.length}\x00`;
          if (iUrl !== undefined) {
            const safeUrl = utils.sanitizeUrl(iUrl);
            const safeAlt = utils.sanitizeText(iAlt || '');
            tokens.push(
              `<img src="${safeUrl}" alt="${safeAlt}" loading="lazy"` +
              ` style="max-width:100%;border-radius:8px;margin:10px 0;display:block;` +
              `border:1px solid var(--border);cursor:zoom-in;` +
              `transition:opacity 0.4s,transform 0.3s;opacity:0;transform:scale(0.97)"` +
              ` onload="this.style.opacity='1';this.style.transform='scale(1)'"` +
              ` onerror="this.style.display='none'"` +
              ` onclick="lightbox.open(this.src,this.alt)">`
            );
          } else {
            const safeUrl = utils.sanitizeUrl(lUrl);
            const safeText = utils.sanitizeText(lText || '');
            const isExt = /^https?:\/\//i.test(safeUrl);
            tokens.push(
              `<a href="${safeUrl}" ${isExt ? 'target="_blank" rel="noopener noreferrer"' : ''}` +
              ` style="color:var(--blue);text-decoration:underline;text-underline-offset:2px">${safeText}</a>`
            );
          }
          return id;
        }
      );

    // ── 3단계: 줄 단위로 블록 분류 ──────────────────────────────────────────
    const rawLines = md.split('\n');
    const blocks = [];

    for (const rawLine of rawLines) {
      // raw HTML img 보호 → MD 인라인 보호 순서로 처리
      const line = protectMdInline(protectRawImg(rawLine)).trimEnd();

      if (/^### (.+)$/.test(line))
        blocks.push({ type: 'heading', level: 3, raw: line.replace(/^### /, '') });
      else if (/^## (.+)$/.test(line))
        blocks.push({ type: 'heading', level: 2, raw: line.replace(/^## /, '') });
      else if (/^# (.+)$/.test(line))
        blocks.push({ type: 'heading', level: 1, raw: line.replace(/^# /, '') });
      else if (/^[*\-] (.+)$/.test(line))
        blocks.push({ type: 'li', listStyle: 'disc', raw: line.replace(/^[*\-] /, '') });
      else if (/^\d+\. (.+)$/.test(line))
        blocks.push({ type: 'li', listStyle: 'decimal', raw: line.replace(/^\d+\. /, '') });
      else if (/^\s*$/.test(line))
        blocks.push({ type: 'blank' });
      else
        blocks.push({ type: 'text', raw: line });
    }

    // ── 4단계: 인라인 포맷 적용 (HTML 이스케이프 + 토큰 복원 포함) ──────────
    const inlineFormat = (raw) => {
      // HTML 특수문자 이스케이프 (토큰 플레이스홀더 \x00...\x00 은 건드리지 않음)
      let s = raw.replace(/\x00T(\d+)\x00|[&<>"']/g, (m) => {
        if (m[0] === '\x00') return m; // 토큰은 그대로
        return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[m];
      });
      // 토큰 복원
      s = s.replace(/\x00T(\d+)\x00/g, (_, i) => tokens[Number(i)]);
      // 볼드
      s = s.replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>');
      // 이탤릭 (볼드 처리 후)
      s = s.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');
      // 인라인 코드
      s = s.replace(/`([^`]+)`/g, '<code style="background:rgba(59,130,246,0.12);padding:1px 6px;border-radius:4px;font-family:monospace;color:#60a5fa;font-size:12px">$1</code>');
      return s;
    };

    // ── 5단계: 블록 → HTML 조합 ─────────────────────────────────────────────
    const headingStyle = [
      '',
      'color:var(--green);font-size:15px;font-weight:700;margin:14px 0 6px',
      'color:var(--green);font-size:14px;font-weight:600;margin:14px 0 6px',
      'color:var(--green);font-size:13px;font-weight:600;margin:14px 0 6px',
    ];
    const headingTag = ['', 'h2', 'h3', 'h4'];

    const parts = [];
    let i = 0;

    while (i < blocks.length) {
      const b = blocks[i];

      if (b.type === 'heading') {
        const tag = headingTag[b.level];
        parts.push(`<${tag} style="${headingStyle[b.level]}">${inlineFormat(b.raw)}</${tag}>`);
        i++;

      } else if (b.type === 'li') {
        // 같은 listStyle의 연속된 li를 하나의 ul/ol로 묶음
        const style = b.listStyle;
        const isOrdered = style === 'decimal';
        const tag = isOrdered ? 'ol' : 'ul';
        const items = [];
        while (i < blocks.length && blocks[i].type === 'li' && blocks[i].listStyle === style) {
          items.push(`<li style="margin:4px 0 4px 16px;color:var(--text-muted)">${inlineFormat(blocks[i].raw)}</li>`);
          i++;
        }
        parts.push(`<${tag} style="margin:6px 0;list-style:${style};padding-left:16px">${items.join('')}</${tag}>`);

      } else if (b.type === 'blank') {
        while (i < blocks.length && blocks[i].type === 'blank') i++;

      } else {
        // 연속 text 줄 → <br>로 이어서 <p> 하나로
        const textLines = [];
        while (i < blocks.length && blocks[i].type === 'text') {
          textLines.push(inlineFormat(blocks[i].raw));
          i++;
        }
        parts.push(`<p style="margin:6px 0">${textLines.join('<br>')}</p>`);
      }
    }

    return parts.join('\n');
  },

  animateText(el, newText) {
    if (!el) return;
    el.style.transition = 'opacity 0.25s';
    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = newText;
      el.style.opacity = '1';
    }, 250);
  },

  $(id) { return document.getElementById(id); },

  setText(id, text) {
    const el = this.$(id);
    if (el) el.textContent = text;
  },
};

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
const toast = (() => {
  const active = new Map();

  function show(msg, icon = '✅', duration = 3000) {
    const container = utils.$('toast-container');
    if (!container) return;

    if (active.has(msg)) {
      const existing = active.get(msg);
      const bar = existing.querySelector('.toast-progress');
      if (bar) {
        bar.style.animation = 'none';
        void bar.offsetWidth;
        bar.style.animationDuration = `${duration}ms`;
        bar.style.animation = '';
      }
      return;
    }

    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'alert');
    el.innerHTML =
      `<span class="toast-icon" aria-hidden="true">${icon}</span>` +
      `<span class="toast-msg">${utils.sanitizeText(msg)}</span>` +
      `<div class="toast-progress" style="animation-duration:${duration}ms"></div>`;

    container.prepend(el);
    active.set(msg, el);

    const remove = () => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => {
        el.remove();
        active.delete(msg);
      }, { once: true });
    };
    setTimeout(remove, duration);
  }

  return { show };
})();

/* ════════════════════════════════════════════
   API
════════════════════════════════════════════ */
const api = {
  async fetchRelease(type) {
    const key = `release_${type}`;
    let cached = null;
    try {
      const raw = localStorage.getItem(key);
      if (raw) cached = JSON.parse(raw);
    } catch { cached = null; }

    if (cached && Date.now() - cached.time < CONFIG.API_CACHE_TTL) {
      return cached.data;
    }

    try {
      const r = await fetch(`https://api.github.com/repos/${CONFIG.REPOS[type]}/releases/latest`, { signal: AbortSignal.timeout(10_000) });
      if (!r.ok) return cached?.data ?? null;

      const data = await r.json();
      try {
        localStorage.setItem(key, JSON.stringify({ data, time: Date.now() }));
      } catch { }
      return data;
    } catch {
      return cached?.data ?? null;
    }
  },
};

/* ════════════════════════════════════════════
   UI
════════════════════════════════════════════ */
const ui = {
  updateClientInfo(data) {
    const tag = data?.tag_name ?? '1.0.0';

    const verBar = utils.$('client-version-bar');
    if (verBar) {
      verBar.classList.remove('skeleton-text');
      verBar.textContent = `v${tag}`;
    }
    utils.setText('dl-version-text', `v${tag}`);
    utils.setText('dl-sub-ver', `Client v${tag}`);

    download.setRelease(data);

    if (data?.body) {
      const wrap = utils.$('client-patch-notes');
      if (!wrap) return;
      wrap.innerHTML = `
        <details class="client-update-box release-details"><summary>클라이언트 업데이트 내용</summary>
          <div class="client-update-header">
            <span style="font-family:var(--mono);font-size:16px;letter-spacing:2px;color:var(--blue);text-transform:uppercase">Client Update</span>
            <span style="font-family:var(--mono);font-size:14px;color:var(--text-dim)">v${utils.sanitizeText(tag)} · ${utils.fmtDate(data.published_at)}</span>
          </div>
          <div class="patch-body" style="border-color:rgba(59,130,246,0.1)">${utils.fmtMd(data.body)}</div>
          ${data.html_url ? `<a href="${utils.sanitizeUrl(data.html_url)}" target="_blank" rel="noopener noreferrer" class="patch-link" style="color:var(--blue)">GitHub에서 보기 →</a>` : ''}
        </details>`;
    }
  },

  updateGameInfo(data) {
    if (!data?.body) return;

    const card = utils.$('game-patch-notes-card');
    if (!card) return;

    const tag = data.tag_name ?? '';
    card.hidden = false;

    if (!card.classList.contains('revealed')) {
      card.style.opacity = '0';
      card.style.transform = 'translateY(-12px)';
      card.style.transition = 'opacity 0.5s ease, transform 0.5s cubic-bezier(0.23,1,0.32,1)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
        card.classList.add('revealed');
      }));
    }

    utils.setText('game-patch-title', data.name || `최신 게임 업데이트 (v${tag})`);
    utils.setText('game-patch-date', utils.fmtDate(data.published_at));

    const body = utils.$('game-patch-body');
    if (body) body.innerHTML = utils.fmtMd(data.body);

    const lnk = utils.$('game-patch-link');
    if (lnk) {
      if (data.html_url) lnk.href = data.html_url;
      else lnk.hidden = true;
    }
  },

  countUpText(el, online, max, duration = 800) {
    if (!el) return;
    const start = Date.now();
    const tick = () => {
      const t = Math.min((Date.now() - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = `${Math.round(eased * online)} / ${max}`;
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  },
};

/* ════════════════════════════════════════════
   SERVER STATUS
════════════════════════════════════════════ */
const serverStatus = (() => {
  let intervalId = null;

  async function checkServer() {
    const dot = utils.$('status-dot');
    const txt = utils.$('server-status-text');
    const players = utils.$('server-players');

    [txt, players].forEach(el => el?.classList.remove('skeleton-text'));

    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10_000);
      let data;
      try {
        const res = await fetch(`https://api.mcsrvstat.us/3/${CONFIG.SERVER_IP}`, { signal: ctrl.signal });
        if (!res.ok) throw new Error('network');
        data = await res.json();
      } finally {
        clearTimeout(timer);
      }

      if (data.online) {

        if (dot) {
          dot.style.background = '#22c55e';
          dot.style.boxShadow = '0 0 8px #22c55e';
        }
        utils.animateText(txt, '온라인');
        if (players && data.players) {
          const online = data.players.online ?? 0;
          const max = data.players.max ?? '?';
          ui.countUpText(players, online, max);
        } else if (players) {
          utils.animateText(players, '— / —');
        }
      } else {

        if (dot) {
          dot.style.background = '#ef4444';
          dot.style.boxShadow = '0 0 8px #ef4444';
        }
        utils.animateText(txt, '오프라인');
        utils.animateText(players, '— / —');

      }
      utils.setText('server-status-checked', `${new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 확인`);
    } catch (err) {
      utils.setText('server-status-checked', '잠시 후 다시 확인합니다');
      utils.animateText(players, '— / —');
      if (dot) { dot.style.background = '#a7b2a9'; dot.style.boxShadow = 'none'; }
      if (err.name === 'AbortError') {
        utils.animateText(txt, '응답 없음');
      } else {
        utils.animateText(txt, '확인 불가');
      }
    }
  }

  function start() {
    checkServer();
    intervalId = setInterval(checkServer, CONFIG.STATUS_INTERVAL);
    window.addEventListener('beforeunload', () => {
      if (intervalId) clearInterval(intervalId);
    }, { once: true });

    visibilityManager.register(
      () => { clearInterval(intervalId); intervalId = null; },
      () => { checkServer(); intervalId = setInterval(checkServer, CONFIG.STATUS_INTERVAL); }
    );
  }

  return { start };
})();

/* ════════════════════════════════════════════
   SLIDER
════════════════════════════════════════════ */
const slider = (() => {
  let current = 0;
  let total = 0;
  let autoTimer = null;
  let isInit = false;

  function build() {
    const wrapper = utils.$('showcase-slider');
    const dotsEl = utils.$('slider-dots');
    if (!wrapper || !dotsEl) return;

    total = CONFIG.SLIDER_IMAGES;

    for (let i = 1; i <= total; i++) {
      const img = document.createElement('img');
      img.onerror = () => {
        img.src = `https://placehold.co/1200x675/04080e/22c55e?text=Showcase+${i}`;
      };
      img.src = `screenshot/${i}.png`;
      img.alt = `스크린샷 ${i}`;
      img.loading = i === 1 ? 'eager' : 'lazy';
      img.addEventListener('click', () => lightbox.open(img.src, img.alt));
      img.style.cursor = 'zoom-in';
      wrapper.appendChild(img);
    }

    for (let i = 0; i < total; i++) {
      const dot = document.createElement('div');
      dot.className = i === 0 ? 'dot active' : 'dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('tabindex', '0');
      dot.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      dot.setAttribute('aria-label', `슬라이드 ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dot.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goTo(i); }
      });
      dotsEl.appendChild(dot);
    }

    utils.$('slider-prev')?.addEventListener('click', () => { move(-1); sound.play('click'); });
    utils.$('slider-next')?.addEventListener('click', () => { move(1); sound.play('click'); });

    let touchStartX = 0;
    const sliderOuter = wrapper.closest('.slider-outer');
    if (sliderOuter) {
      sliderOuter.addEventListener('touchstart', e => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });
      sliderOuter.addEventListener('touchend', e => {
        const diff = touchStartX - e.changedTouches[0].screenX;
        if (Math.abs(diff) > 40) { move(diff > 0 ? 1 : -1); }
      }, { passive: true });
    }

    document.addEventListener('keydown', e => {
      const tag = document.activeElement?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      if (e.key === 'ArrowLeft') { move(-1); sound.play('click'); }
      if (e.key === 'ArrowRight') { move(1); sound.play('click'); }
    });

    isInit = true;
    const firstImg = wrapper.querySelector('img');
    if (firstImg) firstImg.classList.add('is-active');
    startAuto();
  }

  function updateDots() {
    document.querySelectorAll('#slider-dots .dot').forEach((d, i) => {
      const active = i === current;
      d.classList.toggle('active', active);
      d.setAttribute('aria-selected', String(active));
    });
  }

  function goTo(n) {
    if (!isInit || total === 0) return;
    current = ((n % total) + total) % total;
    const wrapper = utils.$('showcase-slider');
    if (wrapper) {
      wrapper.style.transform = `translateX(-${current * 100}%)`;
      wrapper.querySelectorAll('img').forEach((img, i) => {
        img.classList.toggle('is-active', i === current);
      });
    }
    updateDots();
  }

  function move(dir) {
    goTo(current + dir);
    resetAuto();
  }

  function resetAuto() {
    if (autoTimer) clearInterval(autoTimer);
    autoTimer = setInterval(() => goTo(current + 1), CONFIG.SLIDER_AUTO_MS);
  }

  function startAuto() { resetAuto(); }

  return { build };
})();

/* ════════════════════════════════════════════
   LIGHTBOX
════════════════════════════════════════════ */
const lightbox = (() => {
  let overlay, img, closeBtn;

  function init() {
    overlay = utils.$('lightbox-overlay');
    img = utils.$('lightbox-img');
    closeBtn = utils.$('lightbox-close');
    if (!overlay) return;

    closeBtn?.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });
  }

  function open(src, alt = '') {
    if (!overlay || !img) return;
    img.src = src;
    img.alt = alt;
    overlay.classList.add('active');
    overlay.setAttribute('aria-hidden', 'false');
    closeBtn?.focus();
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('active');
    overlay.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (img) img.src = ''; }, 300);
  }

  return { init, open, close };
})();

/* ════════════════════════════════════════════
   VISIBILITY MANAGER
════════════════════════════════════════════ */
const visibilityManager = (() => {
  const handlers = [];

  function register(onHide, onShow) {
    handlers.push({ onHide, onShow });
  }

  function init() {
    document.addEventListener('visibilitychange', () => {
      const hidden = document.hidden;
      handlers.forEach(({ onHide, onShow }) => {
        try {
          if (hidden) onHide?.();
          else onShow?.();
        } catch (e) {
          console.error('visibilityManager handler error:', e);
        }
      });
    });
  }

  return { register, init };
})();

/* ════════════════════════════════════════════
   PARTICLES
════════════════════════════════════════════ */
const particles = (() => {
  let canvas, ctx, W, H, pts, rafId;
  const mouse = { x: -9999, y: -9999 };

  function init() {
    canvas = document.createElement('canvas');
    canvas.id = 'particle-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none;opacity:0.55;';
    document.body.insertBefore(canvas, document.body.firstChild);
    ctx = canvas.getContext('2d');

    resize();
    create();
    draw();

    window.addEventListener('mousemove', e => {
      mouse.x = e.clientX; mouse.y = e.clientY;
    }, { passive: true });

    window.addEventListener('resize', debounceResize, { passive: true });

    visibilityManager.register(
      () => cancelAnimationFrame(rafId),
      () => { rafId = requestAnimationFrame(drawLoop); }
    );
  }

  let resizeTimer;
  function debounceResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); create(); }, 200);
  }

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function create() {
    const count = Math.min(Math.floor((W * H) / 10_000), CONFIG.PARTICLES_MAX);
    pts = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      hue: Math.random() > 0.8 ? 210 : 142,
    }));
  }

  function buildGrid() {
    const CELL = CONFIG.PARTICLES_CELL;
    const cols = Math.ceil(W / CELL);
    const grid = new Map();
    pts.forEach((p, i) => {
      const key = Math.floor(p.x / CELL) + Math.floor(p.y / CELL) * cols;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key).push(i);
    });
    return { grid, cols };
  }

  function drawConnections({ grid, cols }) {
    const CELL = CONFIG.PARTICLES_CELL;
    ctx.lineWidth = 0.5;
    pts.forEach((p, i) => {
      const cx = Math.floor(p.x / CELL);
      const cy = Math.floor(p.y / CELL);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const cell = grid.get((cx + dx) + (cy + dy) * cols);
          if (!cell) continue;
          cell.forEach(j => {
            if (j <= i) return;
            const ddx = p.x - pts[j].x;
            const ddy = p.y - pts[j].y;
            const d = Math.sqrt(ddx * ddx + ddy * ddy);
            if (d < 90) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(pts[j].x, pts[j].y);
              ctx.strokeStyle = `rgba(34,197,94,${(1 - d / 90) * 0.08})`;
              ctx.stroke();
            }
          });
        }
      }
    });
  }

  function drawLoop() {
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const R = CONFIG.PARTICLES_MOUSE_R;

    pts.forEach(p => {
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < R && dist > 0) {
        const force = (R - dist) / R;
        p.vx += (dx / dist) * force * 0.04;
        p.vy += (dy / dist) * force * 0.04;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;

      if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 142
        ? `rgba(34,197,94,${p.alpha})`
        : `rgba(59,130,246,${p.alpha * 0.6})`;
      ctx.fill();
    });

    drawConnections(buildGrid());
    rafId = requestAnimationFrame(draw);
  }

  return { init };
})();

/* ════════════════════════════════════════════
   MOUSE AURORA
════════════════════════════════════════════ */
const aurora = (() => {
  function init() {
    const el = document.createElement('div');
    el.id = 'mouse-aurora';
    el.setAttribute('aria-hidden', 'true');
    el.style.cssText = `
      position:fixed;width:600px;height:600px;border-radius:50%;
      pointer-events:none;z-index:0;transform:translate(-50%,-50%);
      background:radial-gradient(circle,rgba(34,197,94,0.07) 0%,rgba(34,197,94,0.03) 40%,transparent 70%);
      will-change:transform;
    `;
    document.body.appendChild(el);

    let ax = innerWidth / 2, ay = innerHeight / 2;
    let tx = ax, ty = ay;
    let rafId;

    window.addEventListener('mousemove', e => { tx = e.clientX; ty = e.clientY; }, { passive: true });

    el.style.left = `${ax}px`;
    el.style.top = `${ay}px`;

    const tick = () => {
      ax += (tx - ax) * CONFIG.AURORA_LERP;
      ay += (ty - ay) * CONFIG.AURORA_LERP;
      el.style.left = `${ax}px`;
      el.style.top = `${ay}px`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    visibilityManager.register(
      () => cancelAnimationFrame(rafId),
      () => { rafId = requestAnimationFrame(tick); }
    );
  }

  return { init };
})();

/* ════════════════════════════════════════════
   CARD TILT
════════════════════════════════════════════ */
const cardTilt = (() => {
  function attach(card) {
    if (card.dataset.tiltInit) return;
    card.dataset.tiltInit = '1';

    const glare = document.createElement('div');
    glare.className = 'card-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);

      card.style.transform = `perspective(900px) rotateX(${-dy}deg) rotateY(${dx}deg) translateZ(6px)`;
      card.style.transition = 'transform 0.1s ease, border-color 0.3s, box-shadow 0.3s';

      const gx = ((e.clientX - rect.left) / rect.width) * 100;
      const gy = ((e.clientY - rect.top) / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.10) 0%, transparent 55%)`;
      glare.style.opacity = '0.5';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), border-color 0.3s, box-shadow 0.3s';
      glare.style.opacity = '0';
    });
  }

  return { attach };
})();

/* ════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════ */
const scrollReveal = (() => {
  function getDir(el) {
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const vw = window.innerWidth;
    if (cx < vw * 0.25) return 'from-left';
    if (cx > vw * 0.75) return 'from-right';
    return 'from-bottom';
  }

  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        const dir = getDir(entry.target);
        entry.target.dataset.revealDir = dir;
        setTimeout(() => {
          entry.target.classList.add('revealed', dir);
          cardTilt.attach(entry.target);
        }, i * 60);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.card').forEach(c => observer.observe(c));
  }

  return { init };
})();

/* ════════════════════════════════════════════
   SCROLL PROGRESS BAR
════════════════════════════════════════════ */
const scrollProgress = (() => {
  function init() {
    let bar = utils.$('scroll-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'scroll-progress';
      bar.setAttribute('aria-hidden', 'true');
      document.body.appendChild(bar);
    }

    window.addEventListener('scroll', () => {
      const docH = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (docH > 0 ? (scrollY / docH) * 100 : 0) + '%';
    }, { passive: true });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   BUTTON FX
════════════════════════════════════════════ */
const buttonFX = (() => {
  function attach() {
    document.querySelectorAll('.btn, .comm-btn, .slider-btn').forEach(btn => {
      if (btn.dataset.fxInit) return;
      btn.dataset.fxInit = '1';

      const shimmer = document.createElement('span');
      shimmer.className = 'btn-shimmer';
      shimmer.setAttribute('aria-hidden', 'true');
      btn.appendChild(shimmer);

      const flash = document.createElement('span');
      flash.className = 'btn-flash';
      flash.setAttribute('aria-hidden', 'true');
      btn.appendChild(flash);

      btn.addEventListener('mouseenter', () => {
        shimmer.style.animation = 'none';
        void shimmer.offsetWidth;
        shimmer.style.animation = '';
        sound.play('hover');
      });

      btn.addEventListener('click', e => {
        flash.classList.remove('active');
        void flash.offsetWidth;
        flash.classList.add('active');

        const rect = btn.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height);
        const ripple = document.createElement('span');
        ripple.className = 'btn-ripple';
        ripple.setAttribute('aria-hidden', 'true');
        ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px`;
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove(), { once: true });
        sound.play('click');
      });
    });
  }

  return { attach };
})();

/* ════════════════════════════════════════════
   CUSTOM CURSOR
════════════════════════════════════════════ */
const customCursor = (() => {
  const HOVER_SEL = 'a, button, .btn, .comm-btn, .slider-btn, .dot, .faq-q, .faq-copy-btn, .hdr-link, .dl-btn, .mini-rank-row, [role="button"], [tabindex="0"]';

  function init() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const ring = document.createElement('div');
    ring.id = 'cursor-ring';
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(ring);

    document.documentElement.classList.add('use-custom-cursor');

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx, ry = my;
    let rafId;

    document.addEventListener('mousemove', e => {
      mx = e.clientX;
      my = e.clientY;
    }, { passive: true });

    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';

    const animRing = () => {
      rx += (mx - rx) * CONFIG.CURSOR_RING_LERP;
      ry += (my - ry) * CONFIG.CURSOR_RING_LERP;
      ring.style.left = rx + 'px';
      ring.style.top = ry + 'px';
      rafId = requestAnimationFrame(animRing);
    };
    animRing();

    let curState = '';
    const setState = state => {
      if (curState === state) return;
      curState = state;
      ring.className = state ? 'state-' + state : '';
    };

    document.addEventListener('mouseover', e => {
      setState(e.target.closest(HOVER_SEL) ? 'hover' : '');
    }, { passive: true });

    document.addEventListener('mouseout', e => {
      if (!e.relatedTarget || !e.relatedTarget.closest?.(HOVER_SEL)) {
        setState('');
      }
    }, { passive: true });

    document.addEventListener('mousedown', () => setState('click'));

    document.addEventListener('mouseup', () => {
      const hov = document.elementFromPoint(mx, my);
      setState(hov?.closest(HOVER_SEL) ? 'hover' : '');
    });

    document.addEventListener('mouseleave', () => { ring.style.opacity = '0'; });
    document.addEventListener('mouseenter', () => { ring.style.opacity = '1'; });

    visibilityManager.register(
      () => cancelAnimationFrame(rafId),
      () => { rafId = requestAnimationFrame(animRing); }
    );
  }

  return { init };
})();

/* ════════════════════════════════════════════
   TYPEWRITER
════════════════════════════════════════════ */
const typewriter = (() => {
  function init() {
    const el = document.querySelector('.site-desc');
    if (!el) return;

    const nodes = Array.from(el.childNodes).map(n => ({
      type: n.nodeType === Node.TEXT_NODE ? 'text' : 'element',
      content: n.nodeType === Node.TEXT_NODE ? n.textContent : n.outerHTML,
    }));

    el.innerHTML = '';

    let nodeIdx = 0;
    let charIdx = 0;

    const tick = () => {
      if (nodeIdx >= nodes.length) return;

      const node = nodes[nodeIdx];

      if (node.type === 'element') {
        el.insertAdjacentHTML('beforeend', node.content);
        nodeIdx++;
        charIdx = 0;
        setTimeout(tick, 5);
      } else {
        if (charIdx < node.content.length) {
          el.insertAdjacentText('beforeend', node.content[charIdx]);
          charIdx++;
          setTimeout(tick, 28);
        } else {
          nodeIdx++;
          charIdx = 0;
          setTimeout(tick, 5);
        }
      }
    };

    setTimeout(tick, 300);
  }

  return { init };
})();

/* ════════════════════════════════════════════
   POPUP
════════════════════════════════════════════ */
const popup = (() => {
  const CFG = {
    reset: {
      icon: '🗑️',
      title: '클라이언트 초기화',
      sub: 'WARNING · RESET',
      msg: '클라이언트 설정과 캐시를 모두 초기화합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?',
      confirmText: '초기화',
      action: () => { window.location.href = CONFIG.CUSTOM_PROTOCOL + 'reset'; },
    },
    uninstall: {
      icon: '❌',
      title: '클라이언트 삭제',
      sub: 'DANGER · UNINSTALL',
      msg: '클라이언트를 완전히 삭제합니다.\n모든 데이터가 제거되며 되돌릴 수 없습니다.',
      confirmText: '삭제',
      action: () => { window.location.href = CONFIG.CUSTOM_PROTOCOL + 'uninstall'; },
    },
  };

  let pendingAction = null;
  let triggerBtn = null;
  const popupEl = () => utils.$('matz-popup');
  const overlayEl = () => utils.$('popup-overlay');

  function reposition(pEl, btn) {
    const rect = btn.getBoundingClientRect();
    const W = 300;
    const goUp = (innerHeight - rect.bottom - 16) < 180;
    let left = rect.left + rect.width / 2 - W / 2;
    left = Math.max(8, Math.min(left, innerWidth - W - 8));

    pEl.classList.toggle('popup-up', goUp);
    pEl.style.width = `${W}px`;
    pEl.style.left = `${left}px`;

    if (goUp) {
      pEl.style.top = 'auto';
      pEl.style.bottom = `${innerHeight - rect.top + 10}px`;
    } else {
      pEl.style.top = `${rect.bottom + 10}px`;
      pEl.style.bottom = 'auto';
    }
  }

  function show(btn, type) {
    const cfg = CFG[type];
    if (!cfg) return;
    pendingAction = cfg.action;
    triggerBtn = btn;

    const pEl = popupEl();
    const oEl = overlayEl();
    if (!pEl || !oEl) return;

    utils.setText('popup-icon', cfg.icon);
    utils.setText('popup-title', cfg.title);
    utils.setText('popup-sub', cfg.sub);
    utils.setText('popup-msg', cfg.msg);
    utils.setText('popup-confirm', cfg.confirmText);

    reposition(pEl, btn);
    oEl.classList.add('active');
    oEl.setAttribute('aria-hidden', 'false');
    pEl.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => requestAnimationFrame(() => pEl.classList.add('show')));
    sound.play('click');

    setTimeout(() => utils.$('popup-cancel')?.focus(), 100);
  }

  function close() {
    const pEl = popupEl();
    const oEl = overlayEl();
    pEl?.classList.remove('show');
    pEl?.setAttribute('aria-hidden', 'true');
    oEl?.classList.remove('active');
    oEl?.setAttribute('aria-hidden', 'true');
    triggerBtn?.focus();
    pendingAction = null;
    triggerBtn = null;
  }

  function init() {
    utils.$('popup-cancel')?.addEventListener('click', close);
    utils.$('popup-confirm')?.addEventListener('click', () => {
      const action = pendingAction;
      close();
      if (action) setTimeout(action, 100);
    });
    overlayEl()?.addEventListener('click', close);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') close();
    });
    const repos = () => {
      const pEl = popupEl();
      if (pEl?.classList.contains('show') && triggerBtn) reposition(pEl, triggerBtn);
    };
    window.addEventListener('scroll', repos, { passive: true });
    window.addEventListener('resize', repos, { passive: true });
  }

  return { init, show, close };
})();

/* ════════════════════════════════════════════
   SCORE CALCULATOR
   두 페이지에서 동일한 로직으로 COMBAT RATING 계산
════════════════════════════════════════════ */
const scoreCalc = (() => {
  const SUPABASE_URL = CONFIG.SUPABASE.url;
  const SUPABASE_KEY = CONFIG.SUPABASE.key;

  let globalCache = null;
  let globalCacheTime = 0;
  const CACHE_TTL = 5 * 60 * 1000;

  async function fetchTable(t) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const url = `${SUPABASE_URL}/rest/v1/${t}?select=entry,value&order=value.desc&limit=100`;
      const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        signal: ctrl.signal,
      });
      if (!res.ok) return [];
      return await res.json();
    } catch { return []; }
    finally { clearTimeout(timer); }
  }

  async function computeAll() {
    if (globalCache && Date.now() - globalCacheTime < CACHE_TTL) return globalCache;

    const tables = ['all_kill', 'all_death', 'kill_assist_all', 'win_count', 'round_count', 'playTime_H'];
    const results = await Promise.allSettled(tables.map(t => fetchTable(t)));
    const [killRows, deathRows, assistRows, winRows, roundRows, ptRows] =
      results.map(r => r.status === 'fulfilled' ? (r.value ?? []) : []);

    const map = {};
    const ensure = n => { if (!map[n]) map[n] = { entry: n, kills: 0, deaths: 0, assists: 0, wins: 0, rounds: 0, playtime: 0 }; };

    killRows.forEach(r => { ensure(r.entry); map[r.entry].kills = r.value; });
    deathRows.forEach(r => { ensure(r.entry); map[r.entry].deaths = r.value; });
    assistRows.forEach(r => { ensure(r.entry); map[r.entry].assists = r.value; });
    winRows.forEach(r => { ensure(r.entry); map[r.entry].wins = r.value; });
    roundRows.forEach(r => { ensure(r.entry); map[r.entry].rounds = r.value; });
    ptRows.forEach(r => { ensure(r.entry); map[r.entry].playtime = r.value; });

    const players = Object.values(map).filter(p => p.rounds > 0 || p.kills > 0);
    if (!players.length) return [];

    players.forEach(p => {
      p.kda = p.deaths > 0 ? (p.kills + p.assists) / p.deaths : (p.kills + p.assists);
      p.winRate = p.rounds > 0 ? (p.wins / p.rounds) * 100 : 0;
    });

    const maxKda = players.reduce((m, p) => Math.max(m, p.kda), 1);
    const maxWinRate = players.reduce((m, p) => Math.max(m, p.winRate), 1);
    const maxRounds = players.reduce((m, p) => Math.max(m, p.rounds), 1);
    const maxPt = players.reduce((m, p) => Math.max(m, p.playtime), 1);

    const scored = players.map(p => ({
      entry: p.entry,
      value: Math.round(
        ((p.kda / maxKda) * 40 + (p.winRate / maxWinRate) * 30 + (p.rounds / maxRounds) * 20 + (p.playtime / maxPt) * 10) * 10
      ) / 10,
    })).sort((a, b) => b.value - a.value);

    globalCache = scored;
    globalCacheTime = Date.now();
    return scored;
  }

  async function getTop(limit = 5) {
    const all = await computeAll();
    return all.slice(0, limit);
  }

  async function getPlayerScore(name) {
    const all = await computeAll();
    return all.find(p => p.entry.toLowerCase() === name.toLowerCase()) ?? null;
  }

  return { computeAll, getTop, getPlayerScore };
})();

/* ════════════════════════════════════════════
   MINI RANKING CARD
════════════════════════════════════════════ */
const miniRanking = (() => {
  const SUPABASE_URL = CONFIG.SUPABASE.url;
  const SUPABASE_KEY = CONFIG.SUPABASE.key;

  /* [FIX] score 탭은 scoreCalc 공유 모듈 사용, 나머지는 DB 직접 조회 */
  const TAB_CONFIG = {
    score: { label: 'COMBAT RATING', format: v => v.toFixed(1), unit: 'CR', rankingTab: 'score' },
    all_kill: { label: '킬', format: v => v.toLocaleString(), unit: '킬', rankingTab: 'all_kill' },
    win_count: { label: '승리', format: v => v.toLocaleString(), unit: '승', rankingTab: 'win_count' },
    playTime_H: { label: '플레이타임', format: v => `${v}h`, unit: 'h', rankingTab: 'playTime_H' },
  };

  const FALLBACK_AV = 'data:image/svg+xml,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" fill="#112"/><text x="12" y="17" text-anchor="middle" fill="#66ff99" font-size="12">?</text></svg>'
  );

  let cache = {};

  function isCacheValid(table) {
    if (!cache[table]) return false;
    return Date.now() - cache[table].time < CONFIG.MINI_RANK_TTL;
  }

  async function fetchTop(table) {
    /* [FIX] score는 항상 공유 scoreCalc 사용 → 랭킹 페이지와 동일한 값 보장 */
    if (table === 'score') return scoreCalc.getTop(5);

    if (isCacheValid(table)) return cache[table].data;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10_000);
    try {
      const url = `${SUPABASE_URL}/rest/v1/${table}?select=entry,value&order=value.desc&limit=5`;
      const res = await fetch(url, {
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      cache[table] = { data, time: Date.now() };
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function render(table) {
    const listEl = utils.$('mini-rank-list');
    if (!listEl) return;

    listEl.innerHTML = Array(5).fill('<div class="skeleton-mini-row skeleton"></div>').join('');

    const loadingTimeout = setTimeout(() => {
      if (listEl.querySelector('.skeleton')) {
        listEl.innerHTML = `<div class="mini-rank-loading" style="color:var(--text-dim);padding:20px 0">⏳ 불러오는 중...</div>`;
      }
    }, 8000);

    try {
      const rows = await fetchTop(table);
      clearTimeout(loadingTimeout);

      const cfg = TAB_CONFIG[table];
      const medals = ['🥇', '🥈', '🥉'];

      if (!rows || !rows.length) {
        listEl.innerHTML = `<div class="mini-rank-loading" style="color:var(--text-dim);padding:20px 0">데이터 없음</div>`;
        return;
      }

      listEl.innerHTML = rows.map((row, i) => {
        const isTop3 = i < 3;
        const pos = isTop3 ? medals[i] : String(i + 1);
        const posClass = i === 0 ? 'p1' : i === 1 ? 'p2' : i === 2 ? 'p3' : '';
        const delay = i * 60;
        const safeName = utils.sanitizeText(row.entry);
        const rankingUrl = `ranking.html?player=${encodeURIComponent(row.entry)}&tab=${encodeURIComponent(cfg.rankingTab)}`;

        return `
          <a class="mini-rank-row" href="${rankingUrl}"
            aria-label="${pos} ${safeName} — ${cfg.format(row.value)} ${cfg.unit}"
            style="animation-delay:${delay}ms">
            <span class="mini-rank-pos ${posClass}">${pos}</span>
            <img class="mini-rank-avatar"
              src="https://mc-heads.net/avatar/${encodeURIComponent(row.entry)}/24"
              alt="" onerror="this.src='${FALLBACK_AV}'" loading="lazy">
            <span class="mini-rank-name">${safeName}</span>
            <span class="mini-rank-val">${cfg.format(row.value)}</span>
          </a>`;
      }).join('');

    } catch (err) {
      listEl.innerHTML = `<div class="mini-rank-loading" style="color:#fca5a5">⚠️ 불러오기 실패</div>`;
      console.error('Mini ranking error:', err);
    }
  }

  function init() {
    const tabsEl = utils.$('mini-rank-tabs');
    if (!tabsEl) return;

    tabsEl.addEventListener('click', e => {
      const tab = e.target.closest('.mini-rank-tab');
      if (!tab) return;
      tabsEl.querySelectorAll('.mini-rank-tab').forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      render(tab.dataset.table);
    });

    render('score');
  }

  return { init };
})();

const pageTransition = (() => {
  const TRANSITION_DELAY = 250;
  let inProgress = false;

  function isInternalLink(anchor) {
    if (!(anchor instanceof HTMLAnchorElement)) return false;
    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return false;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    try {
      const url = new URL(href, location.href);
      if (url.origin !== location.origin) return false;
      if (url.pathname === location.pathname && url.search === location.search) return false;
      return true;
    } catch {
      return false;
    }
  }

  function handleNavigationClick(e) {
    const anchor = e.target.closest('a');
    if (!anchor || !isInternalLink(anchor)) return;
    e.preventDefault();
    if (inProgress) return;

    const href = anchor.href;
    if (!href) return;

    inProgress = true;
    document.body.classList.add('page-exit');

    setTimeout(() => {
      location.href = href;
    }, TRANSITION_DELAY);
  }

  function init() {
    document.body.classList.remove('page-exit');
    requestAnimationFrame(() => {
      document.body.classList.add('page-loaded');
    });

    document.addEventListener('click', handleNavigationClick);
    window.addEventListener('pageshow', () => {
      document.body.classList.remove('page-exit');
      document.body.classList.add('page-loaded');
      inProgress = false;
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   MOBILE MENU
════════════════════════════════════════════ */
const mobileMenu = (() => {
  function init() {
    const btn = utils.$('mobile-menu-btn');
    const nav = utils.$('mobile-nav');
    if (!btn || !nav) return;

    const isOpen = btn.classList.contains('open');
    btn.setAttribute('aria-expanded', String(isOpen));
    nav.setAttribute('aria-hidden', String(!isOpen));

    btn.addEventListener('click', () => {
      const isOpen = btn.classList.toggle('open');
      nav.classList.toggle('open', isOpen);
      btn.setAttribute('aria-expanded', String(isOpen));
      nav.setAttribute('aria-hidden', String(!isOpen));
      sound.play('click');
    });

    nav.querySelectorAll('.mobile-nav-link').forEach(link => {
      link.addEventListener('click', () => {
        btn.classList.remove('open');
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');
      });
    });

    document.addEventListener('click', e => {
      if (!btn.contains(e.target) && !nav.contains(e.target)) {
        btn.classList.remove('open');
        nav.classList.remove('open');
        btn.setAttribute('aria-expanded', 'false');
        nav.setAttribute('aria-hidden', 'true');
      }
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   FAQ
════════════════════════════════════════════ */
const faq = (() => {
  function init() {
    initFaqHidden();
    document.querySelectorAll('[data-faq]').forEach(btn => {
      btn.addEventListener('click', () => toggle(btn));
    });
    utils.$('copy-ip-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      copyIP(e.currentTarget);
    });
  }

  function toggle(btn) {
    const item = btn.closest('.faq-item');
    const answer = item?.querySelector('.faq-a');
    if (!item || !answer) return;

    const isOpen = item.classList.contains('faq-open');

    document.querySelectorAll('.faq-item.faq-open').forEach(i => {
      i.classList.remove('faq-open');
      i.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('faq-open');
      btn.setAttribute('aria-expanded', 'true');
      setTimeout(() => {
        answer.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 50);
    }
  }

  function initFaqHidden() {
    document.querySelectorAll('.faq-a').forEach(a => { a.removeAttribute('hidden'); });
  }

  function copyIP(btn) {
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(CONFIG.SERVER_IP)
        .then(() => _copySuccess(btn))
        .catch(() => _copyFallback(btn));
    } else {
      _copyFallback(btn);
    }
  }

  function _copySuccess(btn) {
    const prev = btn.textContent;
    btn.textContent = '완료!';
    toast.show('서버 IP가 클립보드에 복사되었습니다', '📋', 2500);
    setTimeout(() => { btn.textContent = prev; }, 1500);
  }

  function _copyFallback(btn) {
    try {
      const ta = document.createElement('textarea');
      ta.value = CONFIG.SERVER_IP;
      ta.style.cssText = 'position:fixed;opacity:0;';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      _copySuccess(btn);
    } catch {
      toast.show('복사에 실패했습니다. IP: ' + CONFIG.SERVER_IP, '⚠️', 3000);
    }
  }

  return { init };
})();

/* ════════════════════════════════════════════
   LAUNCHER
════════════════════════════════════════════ */
const launcher = (() => {
  const timers = new WeakMap();

  function setLoading(btn, msg, duration = 2000) {
    const textEl = btn.querySelector('.btn-text');
    if (!textEl) return;

    if (timers.has(btn)) {
      clearTimeout(timers.get(btn));
    }

    const original = textEl.textContent;
    textEl.textContent = msg;
    btn.disabled = true;

    const id = setTimeout(() => {
      textEl.textContent = original;
      btn.disabled = false;
      timers.delete(btn);
    }, duration);
    timers.set(btn, id);
  }

  function invokeProtocol(path, bool = true) {
    const url = CONFIG.CUSTOM_PROTOCOL + path;
    window.location.href = url;
    if (bool) {
      setTimeout(() => {
        if (document.hasFocus()) {
          toast.show('실행되지 않았나요? 브라우저의 앱 열기 요청을 확인하거나 설치·로그인 안내를 확인하세요.', 'ℹ️', 6000);
        }
      }, 1000);
    }
  }

  function init() {
    utils.$('btn-start-game')?.addEventListener('click', e => {
      if (!platformGuard.isSupported) {
        toast.show('Windows에서만 게임 실행이 가능합니다.', '⚠️', 3000);
        return;
      }
      setLoading(e.currentTarget, '⏳ 실행 준비 중...');
      setTimeout(() => invokeProtocol('start'), 100);
    });
    utils.$('btn-login-info')?.addEventListener('click', e => {
      if (!platformGuard.isSupported) {
        toast.show('Windows에서만 클라이언트 정보를 열 수 있습니다.', '⚠️', 3000);
        return;
      }
      setLoading(e.currentTarget, '⏳ 여는 중...');
      setTimeout(() => invokeProtocol('login-info'), 100);
    });
    utils.$('btn-replay-folder')?.addEventListener('click', e => {
      if (!platformGuard.isSupported) {
        toast.show('Windows에서만 리플레이 폴더를 열 수 있습니다.', '⚠️', 3000);
        return;
      }
      setLoading(e.currentTarget, '⏳ 폴더 여는 중...');
      setTimeout(() => invokeProtocol('replay', true), 100);
    });
    utils.$('btn-reset')?.addEventListener('click', e => {
      if (!platformGuard.isSupported) {
        toast.show('Windows에서만 클라이언트를 초기화할 수 있습니다.', '⚠️', 3000);
        return;
      }
      popup.show(e.currentTarget, 'reset');
    });
    utils.$('btn-uninstall')?.addEventListener('click', e => {
      if (!platformGuard.isSupported) {
        toast.show('Windows에서만 클라이언트를 삭제할 수 있습니다.', '⚠️', 3000);
        return;
      }
      popup.show(e.currentTarget, 'uninstall');
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   DOWNLOAD
════════════════════════════════════════════ */
const download = (() => {
  function setRelease(data) {
    const btn = utils.$('download-btn');
    if (!btn) return;
    const exe = data?.assets?.find(asset => asset.name.toLowerCase().endsWith('.exe') && /^https:\/\//.test(asset.browser_download_url));
    btn.href = exe ? exe.browser_download_url : CONFIG.FALLBACK.clientUrl;
    btn.dataset.directDownload = String(!!exe);
    const label = exe ? 'Windows 설치 파일 다운로드' : '다운로드 페이지 열기';
    btn.querySelector('.dl-text').textContent = label;
    btn.setAttribute('aria-label', label);
    utils.setText('dl-sub-ver', exe ? 'Windows 10/11 · 64비트' : 'GitHub에서 Windows 설치 파일 선택');
    utils.setText('file-size', exe ? `약 ${(exe.size / 1048576).toFixed(1)}MB` : '파일 용량은 다운로드 페이지에서 확인');
  }

  function init() {
    const btn = utils.$('download-btn');
    if (!btn) return;
    btn.addEventListener('click', e => {
      if (!platformGuard.isSupported) {
        e.preventDefault();
        toast.show('Windows PC에서 클라이언트를 설치해 주세요.', 'ℹ️', 4000);
        return;
      }
      toast.show(btn.dataset.directDownload === 'true'
        ? '다운로드를 요청했습니다. 브라우저의 다운로드 목록을 확인하세요.'
        : 'GitHub 다운로드 페이지를 엽니다. Assets에서 .exe 파일을 선택하세요.', '⬇️', 5000);
    });
  }
  return { init, setRelease };
})();

/* ════════════════════════════════════════════
   LAYOUT LOADER
════════════════════════════════════════════ */
const layout = (() => {
  const HEADER_CACHE_KEY = 'maz_layout_header_html_v3';
  const FOOTER_CACHE_KEY = 'maz_layout_footer_html_v2';

  function getCached(key) {
    try {
      const cached = window.__mazLayoutCache?.[key];
      if (cached) return cached;

      const stored = sessionStorage.getItem(key);
      if (stored) {
        window.__mazLayoutCache = window.__mazLayoutCache || {};
        window.__mazLayoutCache[key] = stored;
        return stored;
      }
    } catch {
      // ignore storage errors
    }
    return null;
  }

  function setCached(key, html) {
    try {
      window.__mazLayoutCache = window.__mazLayoutCache || {};
      window.__mazLayoutCache[key] = html;
      sessionStorage.setItem(key, html);
    } catch {
      // ignore storage errors
    }
  }

  function applyActiveLink(root) {
    if (!root) return;
    let page = window.location.pathname.split('/').pop().split('.')[0] || 'index';
    if (!page || page === '') page = 'index';
    const activeLink = root.querySelector(`[data-nav="${page}"]`);
    if (activeLink) {
      activeLink.classList.add('is-active');
      activeLink.setAttribute('aria-current', 'page');
    }
  }

  async function loadPart(root, url, cacheKey, onRender) {
    if (!root) return;

    const cached = getCached(cacheKey);
    if (cached) {
      onRender(root, cached);
    }

    try {
      const res = await fetch(url);
      if (!res.ok) return;

      const html = await res.text();
      if (!html) return;

      if (html !== cached) {
        onRender(root, html);
        setCached(cacheKey, html);
      }
    } catch (e) {
      console.error(`${cacheKey} load error:`, e);
    }
  }

  async function load() {
    const headerRoot = utils.$('header-root');
    const footerRoot = utils.$('footer-root');
    const HEADER_ANIM_KEY = 'matz_header_animated';

    if (headerRoot && sessionStorage.getItem(HEADER_ANIM_KEY)) {
      headerRoot.classList.add('no-header-anim');
    }

    await Promise.all([
      loadPart(headerRoot, 'asset/header.html', HEADER_CACHE_KEY, (root, html) => {
        root.innerHTML = html;
        applyActiveLink(root);
        if (headerRoot && !sessionStorage.getItem(HEADER_ANIM_KEY)) {
          try {
            sessionStorage.setItem(HEADER_ANIM_KEY, '1');
          } catch {}
        }
      }),
      loadPart(footerRoot, 'asset/footer.html', FOOTER_CACHE_KEY, (root, html) => {
        root.innerHTML = html;
      }),
    ]);
  }

  return { load };
})();

/* 홈에서 필요할 때 펼쳐 읽는 공지 */
async function loadNotice() {
  if (!utils.$('notice-card')) return;
  const release = await api.fetchRelease('notice');
  if (!release) return;
  utils.setText('notice-title', release.name || '최신 서버 공지');
  utils.setText('notice-date', utils.fmtDate(release.published_at));
  utils.$('notice-body').innerHTML = utils.fmtMd(release.body || '');
  utils.$('notice-details').hidden = !release.body;
  if (release.html_url) utils.$('notice-link').href = utils.sanitizeUrl(release.html_url);
}

/* 사이트 앱 설치는 사용자가 요청할 때만 제공한다. */
const pwaInstall = {
  init() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(error => console.warn('SW registration failed:', error));
    }
    const button = utils.$('site-install-btn');
    if (!button) return;
    let prompt = null;
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      prompt = event;
      button.hidden = false;
    });
    button.addEventListener('click', async () => {
      if (!prompt) return;
      const request = prompt;
      prompt = null;
      button.hidden = true;
      try {
        await request.prompt();
        await request.userChoice;
      } catch {
        toast.show('사이트 앱을 설치하지 못했습니다. 브라우저 메뉴에서 다시 시도해 주세요.', 'ℹ️');
      }
    });
    window.addEventListener('appinstalled', () => { prompt = null; button.hidden = true; });
  },
};

/* ════════════════════════════════════════════
   INIT
════════════════════════════════════════════ */
(async () => {
  // 레이아웃 먼저 로드
  await layout.load();

  document.documentElement.classList.add('js-ready');

  platformGate.init();
  visibilityManager.init();

  popup.init();
  faq.init();
  launcher.init();
  mobileMenu.init();
  pageTransition.init();
  miniRanking.init();
  lightbox.init();

  document.querySelectorAll('details.launcher-maintenance, details.mobile-disclosure').forEach(details => {
    const summary = details.querySelector(':scope > summary');
    if (!summary) return;
    const sync = () => {
      summary.setAttribute('aria-expanded', String(details.open));
      const action = summary.querySelector('.mobile-disclosure-action');
      if (action) action.textContent = details.open ? '접기' : '펼쳐보기';
    };
    details.addEventListener('toggle', sync);
    if (details.classList.contains('mobile-disclosure')) {
      const desktop = window.matchMedia('(min-width: 769px)');
      details.open = desktop.matches;
      desktop.addEventListener('change', () => { details.open = desktop.matches; });
    }
    sync();
  });

  scrollProgress.init();
  scrollReveal.init();
  if (CONFIG.EFFECTS.particles) particles.init();
  if (CONFIG.EFFECTS.aurora) aurora.init();
  if (CONFIG.EFFECTS.customCursor) customCursor.init();
  if (CONFIG.EFFECTS.typewriter) typewriter.init();

  requestAnimationFrame(() => {
    if (CONFIG.EFFECTS.buttonFx) buttonFX.attach();
    download.init();
  });

  slider.build();

  if (utils.$('server-status-text')) serverStatus.start();

  loadNotice();

  // 사용자 요청에 따른 사이트 앱 설치
  pwaInstall.init();

  const isHomePage = !!utils.$('download-btn');
  if (isHomePage) {
    const [clientData, gameData] = await Promise.all([
      api.fetchRelease('client'),
      api.fetchRelease('game'),
    ]);

    if (clientData) {
      ui.updateClientInfo(clientData);

    } else {
      const verBar = utils.$('client-version-bar');
      if (verBar) {
        verBar.classList.remove('skeleton-text');
        verBar.textContent = '릴리스 페이지';
      }
      download.setRelease(null);
      utils.setText('dl-version-text', 'GitHub');

    }

    if (gameData) {
      ui.updateGameInfo(gameData);

    }


  }


})();
