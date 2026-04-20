/**
 * Min. At. Zero — script.js (v4.1)
 * ─────────────────────────────────
 * 모듈 구성:
 *   CONFIG       — 상수 / 설정값 (매직 넘버 제거)
 *   utils        — 공통 유틸리티
 *   toast        — 토스트 알림
 *   api          — GitHub Release API
 *   ui           — DOM 업데이트 (클라이언트 / 게임 정보)
 *   serverStatus — 서버 상태 조회 + 다운타임 추적
 *   slider       — 이미지 슬라이더 (동적 생성)
 *   sound        — UI 효과음
 *   particles    — 파티클 배경
 *   aurora       — 마우스 오라
 *   cardTilt     — 카드 3D 틸트 (단일 구현)
 *   scrollReveal — 스크롤 등장
 *   scrollProg   — 상단 진행 바
 *   buttonFX     — shimmer / flash / ripple
 *   cursor       — 커스텀 커서
 *   typewriter   — 헤더 타이핑 효과
 *   popup        — 커스텀 팝업
 *   faq          — FAQ 아코디언
 *   launcher     — 런처 버튼 이벤트
 *   download     — 다운로드 버튼 피드백
 */

'use strict';

/* ════════════════════════════════════════════
   CONFIG — 상수 관리 (매직 넘버 제거)
════════════════════════════════════════════ */
const CONFIG = Object.freeze({
  REPOS: {
    client: 'tharu8813/Min-At-Zero-Clinet',
    game:   'tharu8813/Min-At-Zero',
  },
  FALLBACK: {
    clientUrl: 'https://github.com/tharu8813/Min-At-Zero-Clinet/releases/latest',
  },
  SERVER_IP:        'tharu81.kro.kr',
  DOWNTIME_KEY:     'matz_offline_since',
  STATUS_INTERVAL:  60_000,   // ms
  SLIDER_IMAGES:    10,
  SLIDER_AUTO_MS:   5_000,
  PARTICLES_MAX:    120,
  PARTICLES_CELL:   100,      // 격자 셀 크기
  PARTICLES_MOUSE_R:120,
  AURORA_LERP:      0.07,
  CURSOR_RING_LERP: 0.13,
  SOUND_PATH:       'asset/audio/',
  CUSTOM_PROTOCOL:  'matz-client://',
});

/* ════════════════════════════════════════════
   UTILS
════════════════════════════════════════════ */
const utils = {
  /** 날짜 문자열을 한국어 형식으로 변환 */
  fmtDate(d) {
    return new Date(d).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
  },

  /** 마크다운 → HTML (제한적) */
  fmtMd(md) {
    if (!md) return '';
    return md
      .replace(/^### (.+)$/gm, '<h4 style="color:var(--green);font-size:13px;font-weight:600;margin:14px 0 6px">$1</h4>')
      .replace(/^## (.+)$/gm,  '<h3 style="color:var(--green);font-size:14px;font-weight:600;margin:14px 0 6px">$1</h3>')
      .replace(/^# (.+)$/gm,   '<h2 style="color:var(--green);font-size:15px;font-weight:700;margin:14px 0 6px">$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>')
      .replace(/`([^`]+)`/g, '<code style="background:rgba(59,130,246,0.12);padding:1px 6px;border-radius:4px;font-family:monospace;color:#60a5fa;font-size:12px">$1</code>')
      .replace(/^[\*\-] (.+)$/gm, '<li style="margin:4px 0 4px 16px;color:var(--text-muted)">$1</li>')
      .replace(/(<li[^>]*>.*<\/li>)+/gs, m => `<ul style="margin:6px 0;list-style:disc">${m}</ul>`)
      .replace(/\n\n/g, '</p><p style="margin:6px 0">')
      .replace(/\n/g, '<br>');
  },

  /** 텍스트를 fade 전환으로 변경 */
  animateText(el, newText) {
    if (!el) return;
    el.style.transition = 'opacity 0.25s';
    el.style.opacity    = '0';
    setTimeout(() => {
      el.textContent   = newText;
      el.style.opacity = '1';
    }, 250);
  },

  /** id로 엘리먼트 가져오기 */
  $(id) { return document.getElementById(id); },

  /** 텍스트 설정 (null 안전) */
  setText(id, text) {
    const el = this.$(id);
    if (el) el.textContent = text;
  },
};

/* ════════════════════════════════════════════
   TOAST
════════════════════════════════════════════ */
const toast = (() => {
  function show(msg, icon = '✅', duration = 3000) {
    const container = utils.$('toast-container');
    if (!container) return;

    const el = document.createElement('div');
    el.className = 'toast';
    el.setAttribute('role', 'alert');
    el.innerHTML = `
      <span class="toast-icon" aria-hidden="true">${icon}</span>
      <span class="toast-msg">${msg}</span>
      <div class="toast-progress" style="animation-duration:${duration}ms"></div>
    `;
    container.appendChild(el);

    const remove = () => {
      el.classList.add('toast-out');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };
    setTimeout(remove, duration);
  }

  return { show };
})();

/* ════════════════════════════════════════════
   API — GitHub Release
════════════════════════════════════════════ */
const api = {
  async fetchRelease(type) {
    try {
      const r = await fetch(
        `https://api.github.com/repos/${CONFIG.REPOS[type]}/releases/latest`,
        { cache: 'no-cache' }
      );
      if (!r.ok) return null;
      return await r.json();
    } catch {
      return null;
    }
  },
};

/* ════════════════════════════════════════════
   UI — DOM 업데이트
════════════════════════════════════════════ */
const ui = {
  updateClientInfo(data) {
    const tag = data?.tag_name ?? '1.0.0';

    utils.setText('client-version-bar', `v${tag}`);
    utils.setText('dl-version-text',    `v${tag}`);
    utils.setText('dl-sub-ver',         `Client v${tag}`);

    const exe = data?.assets?.find(a => a.name.toLowerCase().endsWith('.exe'));
    const btn = utils.$('download-btn');

    if (exe && btn) {
      btn.href = exe.browser_download_url;
      const sizeEl = utils.$('file-size');
      if (sizeEl) sizeEl.textContent = `약 ${(exe.size / 1048576).toFixed(1)}MB`;
    } else if (btn) {
      btn.href = CONFIG.FALLBACK.clientUrl;
    }

    if (data?.body) {
      const wrap = utils.$('client-patch-notes');
      if (!wrap) return;
      wrap.innerHTML = `
        <div class="client-update-box">
          <div class="client-update-header">
            <span style="font-family:var(--mono);font-size:10px;letter-spacing:2px;color:var(--blue);text-transform:uppercase">Client Update</span>
            <span style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">v${tag} · ${utils.fmtDate(data.published_at)}</span>
          </div>
          <div class="patch-body" style="border-color:rgba(59,130,246,0.1)">${utils.fmtMd(data.body)}</div>
          ${data.html_url ? `<a href="${data.html_url}" target="_blank" rel="noopener noreferrer" class="patch-link" style="color:var(--blue)">GitHub에서 보기 →</a>` : ''}
        </div>`;
    }
  },

  updateGameInfo(data) {
    if (!data?.body) return;

    const card = utils.$('game-patch-notes-card');
    if (!card) return;

    const tag = data.tag_name ?? '';
    // hidden 속성 제거로 표시 (display:none → hidden 속성 방식)
    card.hidden = false;
    // 카드가 아직 reveal 되지 않았다면 강제 reveal
    if (!card.classList.contains('revealed')) {
      card.classList.add('revealed');
    }

    utils.setText('game-patch-title', data.name || `최신 게임 업데이트 (v${tag})`);
    utils.setText('game-patch-date',  utils.fmtDate(data.published_at));

    const body = utils.$('game-patch-body');
    if (body) body.innerHTML = utils.fmtMd(data.body);

    const lnk = utils.$('game-patch-link');
    if (lnk) {
      if (data.html_url) lnk.href = data.html_url;
      else lnk.hidden = true;
    }
  },

  /** 숫자 카운트업 애니메이션 */
  countUpText(el, online, max, duration = 800) {
    if (!el) return;
    const start = Date.now();
    const tick  = () => {
      const t       = Math.min((Date.now() - start) / duration, 1);
      const eased   = 1 - Math.pow(1 - t, 3);
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

  /** localStorage 접근은 항상 try-catch */
  function saveDowntime() {
    try {
      if (!localStorage.getItem(CONFIG.DOWNTIME_KEY)) {
        localStorage.setItem(CONFIG.DOWNTIME_KEY, String(Date.now()));
      }
    } catch { /* 시크릿 모드 등 무시 */ }
  }

  function clearDowntime() {
    try { localStorage.removeItem(CONFIG.DOWNTIME_KEY); } catch { }
  }

  function getDowntimeLabel() {
    try {
      const since = localStorage.getItem(CONFIG.DOWNTIME_KEY);
      if (!since) return '';
      const mins = Math.floor((Date.now() - Number(since)) / 60_000);
      if (mins < 1)  return '방금 전부터 오프라인';
      if (mins < 60) return `${mins}분 전부터 오프라인`;
      return `${Math.floor(mins / 60)}시간 전부터 오프라인`;
    } catch { return ''; }
  }

  async function fetch() {
    const dot     = utils.$('status-dot');
    const txt     = utils.$('server-status-text');
    const players = utils.$('server-players');

    // skeleton 제거
    [txt, players].forEach(el => el?.classList.remove('skeleton-text'));

    try {
      const res = await window.fetch(`https://api.mcsrvstat.us/3/${CONFIG.SERVER_IP}`);
      if (!res.ok) throw new Error('network');
      const data = await res.json();

      if (data.online) {
        clearDowntime();
        // 기존 다운타임 라벨 제거
        utils.$('downtime-label')?.remove();

        if (dot) {
          dot.style.background  = '#22c55e';
          dot.style.boxShadow   = '0 0 8px #22c55e';
        }
        utils.animateText(txt, '온라인');
        if (players && data.players) {
          ui.countUpText(players, data.players.online, data.players.max);
        }
      } else {
        saveDowntime();

        if (dot) {
          dot.style.background = '#ef4444';
          dot.style.boxShadow  = '0 0 8px #ef4444';
        }
        utils.animateText(txt, '오프라인');
        utils.animateText(players, '— / —');

        const lbl = getDowntimeLabel();
        if (lbl && txt?.parentElement) {
          let dtEl = utils.$('downtime-label');
          if (!dtEl) {
            dtEl = document.createElement('span');
            dtEl.id = 'downtime-label';
            dtEl.className = 'downtime-label';
            txt.parentElement.appendChild(dtEl);
          }
          dtEl.textContent = lbl;
        }
      }
    } catch {
      utils.animateText(txt, '확인 불가');
    }
  }

  function start() {
    fetch();
    intervalId = setInterval(fetch, CONFIG.STATUS_INTERVAL);
    // 페이지 언로드 시 인터벌 정리
    window.addEventListener('beforeunload', () => {
      if (intervalId) clearInterval(intervalId);
    }, { once: true });
    // 탭 숨김 시 일시 중단
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        clearInterval(intervalId);
      } else {
        fetch();
        intervalId = setInterval(fetch, CONFIG.STATUS_INTERVAL);
      }
    });
  }

  return { start };
})();

/* ════════════════════════════════════════════
   SLIDER — 동적 생성 + 키보드 지원
════════════════════════════════════════════ */
const slider = (() => {
  let current    = 0;
  let total      = 0;
  let autoTimer  = null;
  let isInit     = false;

  function build() {
    const wrapper = utils.$('showcase-slider');
    const dotsEl  = utils.$('slider-dots');
    if (!wrapper || !dotsEl) return;

    total = CONFIG.SLIDER_IMAGES;

    // 이미지 동적 생성
    for (let i = 1; i <= total; i++) {
      const img = document.createElement('img');
      img.src   = `image/${i}.png`;
      img.alt   = `스크린샷 ${i}`;
      img.loading = i === 1 ? 'eager' : 'lazy';
      img.onerror = () => {
        img.src = `https://placehold.co/1200x675/04080e/22c55e?text=Showcase+${i}`;
      };
      // 라이트박스 클릭
      img.addEventListener('click', () => lightbox.open(img.src, img.alt));
      img.style.cursor = 'zoom-in';
      wrapper.appendChild(img);
    }

    // 닷 동적 생성
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

    // 버튼
    utils.$('slider-prev')?.addEventListener('click', () => { move(-1); sound.play('click'); });
    utils.$('slider-next')?.addEventListener('click', () => { move(1);  sound.play('click'); });

    // 키보드
    document.addEventListener('keydown', e => {
      if (e.key === 'ArrowLeft')  { move(-1); sound.play('click'); }
      if (e.key === 'ArrowRight') { move(1);  sound.play('click'); }
    });

    isInit = true;
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
    if (wrapper) wrapper.style.transform = `translateX(-${current * 100}%)`;
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
    overlay  = utils.$('lightbox-overlay');
    img      = utils.$('lightbox-img');
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
  }

  return { init, open, close };
})();

/* ════════════════════════════════════════════
   SOUND
════════════════════════════════════════════ */
const sound = (() => {
  const cache = {};
  let canPlay = true;

  function preload(types) {
    types.forEach(type => {
      const audio = new Audio(`${CONFIG.SOUND_PATH}${type}.mp3`);
      audio.preload = 'auto';
      audio.addEventListener('error', () => { canPlay = false; });
      cache[type] = audio;
    });
  }

  function play(type) {
    if (!canPlay) return;
    const s = cache[type];
    if (!s) return;
    try { s.currentTime = 0; s.play().catch(() => {}); } catch { }
  }

  return { preload, play };
})();

/* ════════════════════════════════════════════
   PARTICLES
════════════════════════════════════════════ */
const particles = (() => {
  let canvas, ctx, W, H, pts, rafId;
  const mouse = { x: -9999, y: -9999 };

  function init() {
    canvas    = document.createElement('canvas');
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

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        cancelAnimationFrame(rafId);
      } else {
        draw();
      }
    });
  }

  let resizeTimer;
  function debounceResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resize(); create(); }, 200);
  }

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function create() {
    const count = Math.min(Math.floor((W * H) / 10_000), CONFIG.PARTICLES_MAX);
    pts = Array.from({ length: count }, () => ({
      x:     Math.random() * W,
      y:     Math.random() * H,
      vx:    (Math.random() - 0.5) * 0.3,
      vy:    (Math.random() - 0.5) * 0.3,
      r:     Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      hue:   Math.random() > 0.8 ? 210 : 142,
    }));
  }

  /** 격자 기반 O(n) 이웃 탐색 */
  function buildGrid() {
    const CELL = CONFIG.PARTICLES_CELL;
    const cols  = Math.ceil(W / CELL);
    const grid  = new Map();
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
            const d   = Math.sqrt(ddx * ddx + ddy * ddy);
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

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const R = CONFIG.PARTICLES_MOUSE_R;

    pts.forEach(p => {
      const dx   = p.x - mouse.x;
      const dy   = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < R && dist > 0) {
        const force = (R - dist) / R;
        p.vx += (dx / dist) * force * 0.04;
        p.vy += (dy / dist) * force * 0.04;
      }

      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x  += p.vx;
      p.y  += p.vy;

      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

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

    const tick = () => {
      ax += (tx - ax) * CONFIG.AURORA_LERP;
      ay += (ty - ay) * CONFIG.AURORA_LERP;
      el.style.left = `${ax}px`;
      el.style.top  = `${ay}px`;
      rafId = requestAnimationFrame(tick);
    };
    tick();

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else tick();
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   CARD TILT (단일 구현 — 중복 제거)
════════════════════════════════════════════ */
const cardTilt = (() => {
  /** 카드 하나에 tilt 효과 부착 */
  function attach(card) {
    if (card.dataset.tiltInit) return; // 중복 방지
    card.dataset.tiltInit = '1';

    const glare = document.createElement('div');
    glare.className = 'card-glare';
    glare.setAttribute('aria-hidden', 'true');
    card.appendChild(glare);

    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const dx   = (e.clientX - (rect.left + rect.width  / 2)) / (rect.width  / 2);
      const dy   = (e.clientY - (rect.top  + rect.height / 2)) / (rect.height / 2);

      card.style.transform  = `perspective(900px) rotateX(${-dy}deg) rotateY(${dx}deg) translateZ(6px)`;
      card.style.transition = 'transform 0.1s ease, border-color 0.3s, box-shadow 0.3s';

      const gx = ((e.clientX - rect.left) / rect.width)  * 100;
      const gy = ((e.clientY - rect.top)  / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.10) 0%, transparent 55%)`;
      glare.style.opacity    = '0.5';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), border-color 0.3s, box-shadow 0.3s';
      glare.style.opacity   = '0';
    });
  }

  return { attach };
})();

/* ════════════════════════════════════════════
   SCROLL REVEAL
════════════════════════════════════════════ */
const scrollReveal = (() => {
  function init() {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (!entry.isIntersecting) return;
        setTimeout(() => {
          entry.target.classList.add('revealed');
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
    const bar = document.createElement('div');
    bar.id = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    window.addEventListener('scroll', () => {
      const docH = document.documentElement.scrollHeight - innerHeight;
      bar.style.width = (docH > 0 ? (scrollY / docH) * 100 : 0) + '%';
    }, { passive: true });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   BUTTON FX — shimmer / flash / ripple
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

        const rect   = btn.getBoundingClientRect();
        const size   = Math.max(rect.width, rect.height);
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
  const HOVER_SEL = 'a, button, .btn, .comm-btn, .slider-btn, .dot, .faq-q, .faq-copy-btn, .hdr-link, .dl-btn, [role="button"]';

  function init() {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    const dot  = document.createElement('div'); dot.id  = 'cursor-dot';
    const ring = document.createElement('div'); ring.id = 'cursor-ring';
    dot.setAttribute('aria-hidden', 'true');
    ring.setAttribute('aria-hidden', 'true');
    document.body.append(dot, ring);

    let mx = -200, my = -200, rx = -200, ry = -200;
    let rafId;
    let active = false; // 커서 토글 상태

    document.addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      if (active) dot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
    }, { passive: true });

    const animRing = () => {
      if (active) {
        const dx = mx - rx, dy = my - ry;
        if (Math.abs(dx) > 0.2 || Math.abs(dy) > 0.2) {
          rx += dx * CONFIG.CURSOR_RING_LERP;
          ry += dy * CONFIG.CURSOR_RING_LERP;
          ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
        }
      }
      rafId = requestAnimationFrame(animRing);
    };
    animRing();

    let curState = '';
    const setState = state => {
      if (curState === state) return;
      curState       = state;
      dot.className  = state ? `state-${state}` : '';
      ring.className = state ? `state-${state}` : '';
    };

    const spawnRipple = (x, y) => {
      const el = document.createElement('div');
      el.className = 'cursor-ripple';
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `left:${x}px;top:${y}px;width:60px;height:60px;`;
      document.body.appendChild(el);
      el.addEventListener('animationend', () => el.remove(), { once: true });
    };

    document.addEventListener('mouseover', e => {
      if (e.target.closest(HOVER_SEL)) setState('hover');
      else setState('');
    }, { passive: true });

    document.addEventListener('mousedown', e => {
      setState('click');
      if (active) spawnRipple(e.clientX, e.clientY);
    });

    document.addEventListener('mouseup', () => {
      const hov = document.elementFromPoint(mx, my);
      setState(hov?.closest(HOVER_SEL) ? 'hover' : '');
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity  = '0';
      ring.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
      dot.style.opacity  = active ? '1' : '0';
      ring.style.opacity = active ? '1' : '0';
    });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) cancelAnimationFrame(rafId);
      else animRing();
    });

    // 커서 토글 버튼
    const toggleBtn = utils.$('cursor-toggle');
    toggleBtn?.addEventListener('click', () => {
      active = !active;
      document.documentElement.classList.toggle('use-custom-cursor', active);
      toggleBtn.classList.toggle('active', active);
      toggleBtn.setAttribute('aria-pressed', String(active));
    });
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

    // innerHTML 대신 textContent 방식으로 XSS 위험 제거
    // 단, <br> 태그는 필요하므로 노드 분리 방식 사용
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
        // <br> 등 요소 노드는 통째로 삽입
        el.insertAdjacentHTML('beforeend', node.content);
        nodeIdx++;
        charIdx = 0;
        setTimeout(tick, 5);
      } else {
        // 텍스트는 한 글자씩
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
      icon:        '🗑️',
      title:       '클라이언트 초기화',
      sub:         'WARNING · RESET',
      msg:         '클라이언트 설정과 캐시를 모두 초기화합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?',
      confirmText: '초기화',
      action:      () => { window.location.href = CONFIG.CUSTOM_PROTOCOL + 'reset'; },
    },
    uninstall: {
      icon:        '❌',
      title:       '클라이언트 삭제',
      sub:         'DANGER · UNINSTALL',
      msg:         '클라이언트를 완전히 삭제합니다.\n모든 데이터가 제거되며 되돌릴 수 없습니다.',
      confirmText: '삭제',
      action:      () => { window.location.href = CONFIG.CUSTOM_PROTOCOL + 'uninstall'; },
    },
  };

  let pendingAction  = null;
  let triggerBtn     = null;
  const popupEl      = () => utils.$('matz-popup');
  const overlayEl    = () => utils.$('popup-overlay');

  function reposition(pEl, btn) {
    const rect   = btn.getBoundingClientRect();
    const W      = 300;
    const goUp   = (innerHeight - rect.bottom - 16) < 180;
    let left     = rect.left + rect.width / 2 - W / 2;
    left         = Math.max(8, Math.min(left, innerWidth - W - 8));

    pEl.classList.toggle('popup-up', goUp);
    pEl.style.width = `${W}px`;
    pEl.style.left  = `${left}px`;

    if (goUp) {
      pEl.style.top    = 'auto';
      pEl.style.bottom = `${innerHeight - rect.top + 10}px`;
    } else {
      pEl.style.top    = `${rect.bottom + 10}px`;
      pEl.style.bottom = 'auto';
    }
  }

  function show(btn, type) {
    const cfg = CFG[type];
    if (!cfg) return;
    pendingAction = cfg.action;
    triggerBtn    = btn;

    const pEl  = popupEl();
    const oEl  = overlayEl();
    if (!pEl || !oEl) return;

    utils.setText('popup-icon',    cfg.icon);
    utils.setText('popup-title',   cfg.title);
    utils.setText('popup-sub',     cfg.sub);
    utils.setText('popup-msg',     cfg.msg);
    utils.setText('popup-confirm', cfg.confirmText);

    reposition(pEl, btn);
    oEl.classList.add('active');
    oEl.setAttribute('aria-hidden', 'false');
    pEl.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => requestAnimationFrame(() => pEl.classList.add('show')));
    sound.play('click');

    // 포커스 이동
    setTimeout(() => utils.$('popup-cancel')?.focus(), 100);
  }

  function close() {
    const pEl = popupEl();
    const oEl = overlayEl();
    pEl?.classList.remove('show');
    pEl?.setAttribute('aria-hidden', 'true');
    oEl?.classList.remove('active');
    oEl?.setAttribute('aria-hidden', 'true');
    // 원래 버튼으로 포커스 복귀
    triggerBtn?.focus();
    pendingAction = null;
    triggerBtn    = null;
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

    window.addEventListener('scroll', () => {
      const pEl = popupEl();
      if (pEl?.classList.contains('show') && triggerBtn) reposition(pEl, triggerBtn);
    }, { passive: true });
  }

  return { init, show, close };
})();

/* ════════════════════════════════════════════
   FAQ — 아코디언
════════════════════════════════════════════ */
const faq = (() => {
  function init() {
    document.querySelectorAll('[data-faq]').forEach(btn => {
      btn.addEventListener('click', () => toggle(btn));
    });

    // IP 복사 버튼
    utils.$('copy-ip-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      copyIP(e.currentTarget);
    });
  }

  function toggle(btn) {
    const item   = btn.closest('.faq-item');
    const answer = item?.querySelector('.faq-a');
    if (!item || !answer) return;

    const isOpen = item.classList.contains('faq-open');

    // 다른 열린 항목 닫기
    document.querySelectorAll('.faq-item.faq-open').forEach(i => {
      i.classList.remove('faq-open');
      const a = i.querySelector('.faq-a');
      if (a) { a.hidden = true; }
      i.querySelector('.faq-q')?.setAttribute('aria-expanded', 'false');
    });

    if (!isOpen) {
      item.classList.add('faq-open');
      answer.hidden = false;
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  function copyIP(btn) {
    navigator.clipboard.writeText(CONFIG.SERVER_IP)
      .then(() => {
        const prev = btn.textContent;
        btn.textContent = '완료!';
        toast.show('서버 IP가 클립보드에 복사되었습니다', '📋', 2500);
        setTimeout(() => { btn.textContent = prev; }, 1500);
      })
      .catch(() => {
        toast.show('복사에 실패했습니다. IP: ' + CONFIG.SERVER_IP, '⚠️', 3000);
      });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   LAUNCHER — 버튼 이벤트
════════════════════════════════════════════ */
const launcher = (() => {
  /** 버튼 로딩 상태 (복귀 타이머 반환) */
  function setLoading(btn, msg, duration = 2000) {
    const textEl = btn.querySelector('.btn-text');
    if (!textEl) return;
    const original    = textEl.textContent;
    textEl.textContent = msg;
    btn.disabled      = true;
    return setTimeout(() => {
      textEl.textContent = original;
      btn.disabled       = false;
    }, duration);
  }

  /** 커스텀 프로토콜 호출 + 미지원 환경 안내 */
  function invokeProtocol(path) {
    const url = CONFIG.CUSTOM_PROTOCOL + path;
    window.location.href = url;
    // 2초 후에도 포커스가 유지되면 클라이언트가 없는 것
    setTimeout(() => {
      if (document.hasFocus()) {
        toast.show('전용 클라이언트가 설치되어 있지 않습니다.', '⚠️', 4000);
      }
    }, 2000);
  }

  function init() {
    utils.$('btn-start-game')?.addEventListener('click', e => {
      setLoading(e.currentTarget, '⏳ 실행 준비 중...');
      setTimeout(() => invokeProtocol('start'), 100);
    });

    utils.$('btn-login-info')?.addEventListener('click', e => {
      setLoading(e.currentTarget, '⏳ 여는 중...');
      setTimeout(() => invokeProtocol('login-info'), 100);
    });

    utils.$('btn-replay-folder')?.addEventListener('click', e => {
      setLoading(e.currentTarget, '⏳ 폴더 여는 중...');
      setTimeout(() => invokeProtocol('replay'), 100);
    });

    utils.$('btn-reset')?.addEventListener('click', e => {
      popup.show(e.currentTarget, 'reset');
    });

    utils.$('btn-uninstall')?.addEventListener('click', e => {
      popup.show(e.currentTarget, 'uninstall');
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   DOWNLOAD BUTTON FEEDBACK
════════════════════════════════════════════ */
const download = (() => {
  function init() {
    const btn = utils.$('download-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const href = btn.getAttribute('href');
      if (!href || href === '') {
        toast.show('다운로드 링크를 불러오는 중입니다. 잠시 후 다시 시도해 주세요.', '⏳', 3000);
        return;
      }

      btn.classList.add('dl-done');
      const textEl = btn.querySelector('.dl-text');
      const subEl  = btn.querySelector('.dl-sub');
      const subVer = utils.$('dl-sub-ver')?.textContent ?? '';
      if (textEl) textEl.textContent = '다운로드 시작됨 ✓';
      if (subEl)  subEl.textContent  = '잠시만 기다려주세요';

      toast.show('클라이언트 다운로드가 시작되었습니다', '⬇️', 4000);

      setTimeout(() => {
        btn.classList.remove('dl-done');
        if (textEl) textEl.textContent = 'Windows 클라이언트';
        if (subEl)  subEl.textContent  = subVer;
      }, 5000);
    });
  }

  return { init };
})();

/* ════════════════════════════════════════════
   INIT — 진입점
════════════════════════════════════════════ */
(async () => {
  document.documentElement.classList.add('js-ready');

  // ── 팝업 / FAQ / 런처 ──
  popup.init();
  faq.init();
  launcher.init();
  lightbox.init();

  // ── 시각 효과 (빠른 피드백 우선) ──
  scrollProgress.init();
  scrollReveal.init();
  particles.init();
  aurora.init();
  customCursor.init();
  typewriter.init();

  // ── 버튼 FX (rAF 후) ──
  requestAnimationFrame(() => {
    buttonFX.attach();
    download.init();
  });

  // ── 슬라이더 (DOM 안정화 후) ──
  slider.build();

  // ── 효과음 프리로드 ──
  sound.preload(['hover', 'click']);

  // ── GitHub 릴리스 데이터 ──
  const [clientData, gameData] = await Promise.all([
    api.fetchRelease('client'),
    api.fetchRelease('game'),
  ]);

  if (clientData) {
    ui.updateClientInfo(clientData);
  } else {
    // API 실패 폴백
    utils.setText('client-version-bar', '최신 버전');
    const btn = utils.$('download-btn');
    if (btn) btn.href = CONFIG.FALLBACK.clientUrl;
    toast.show('버전 정보를 불러오지 못했습니다. 링크는 최신 페이지로 연결됩니다.', '⚠️', 4000);
  }

  if (gameData) ui.updateGameInfo(gameData);

  // ── 서버 상태 폴링 ──
  serverStatus.start();
})();
