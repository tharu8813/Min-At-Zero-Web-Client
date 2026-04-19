// ── REPOS ──
const REPOS = {
  client: 'tharu8813/Min-At-Zero-Clinet',
  game: 'tharu8813/Min-At-Zero'
};

// ── API ──
async function fetchRelease(type) {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPOS[type]}/releases/latest`);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ── UTIL ──
function fmtDate(d) {
  return new Date(d).toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
}

function fmtMd(md) {
  if (!md) return '';
  return md
    .replace(/^### (.+)$/gm, '<h4 style="color:var(--green);font-size:13px;font-weight:600;margin:14px 0 6px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="color:var(--green);font-size:14px;font-weight:600;margin:14px 0 6px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="color:var(--green);font-size:15px;font-weight:700;margin:14px 0 6px">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:var(--text-primary);font-weight:600">$1</strong>')
    .replace(/`([^`]+)`/g, '<code style="background:rgba(59,130,246,0.12);padding:1px 6px;border-radius:4px;font-family:monospace;color:#60a5fa;font-size:12px">$1</code>')
    .replace(/^[\*\-] (.+)$/gm, '<li style="margin:4px 0 4px 16px;color:var(--text-muted)">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>)+/gs, m => `<ul style="margin:6px 0;list-style:disc">${m}</ul>`)
    .replace(/\n\n/g, '</p><p style="margin:6px 0">')
    .replace(/\n/g, '<br>');
}

// ── UI 업데이트 ──
function updateClientInfo(data) {
  const tag = data.tag_name || '1.0.0';

  const bar = document.getElementById('client-version-bar');
  if (bar) bar.textContent = `v${tag}`;

  const dlVer = document.getElementById('dl-version-text');
  if (dlVer) dlVer.textContent = `v${tag}`;

  const dlSub = document.getElementById('dl-sub-ver');
  if (dlSub) dlSub.textContent = `Client v${tag}`;

  const exe = data.assets?.find(a => a.name.toLowerCase().endsWith('.exe'));
  if (exe) {
    const btn = document.getElementById('download-btn');
    if (btn) btn.href = exe.browser_download_url;

    const sz = document.getElementById('file-size');
    if (sz) sz.textContent = `약 ${(exe.size / 1048576).toFixed(1)}MB`;
  }

  if (data.body) {
    const wrap = document.getElementById('client-patch-notes');
    if (wrap) {
      wrap.innerHTML = `
        <div class="client-update-box">
          <div class="client-update-header">
            <span style="font-family:var(--mono);font-size:10px;font-weight:400;letter-spacing:2px;color:var(--blue);text-transform:uppercase">Client Update</span>
            <span style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">v${tag} · ${fmtDate(data.published_at)}</span>
          </div>
          <div class="patch-body" style="border-color:rgba(59,130,246,0.1)">
            ${fmtMd(data.body)}
          </div>
          ${data.html_url ? `<a href="${data.html_url}" target="_blank" class="patch-link" style="color:var(--blue)">GitHub에서 보기 →</a>` : ''}
        </div>`;
    }
  }
}

function updateGameInfo(data) {
  const tag = data.tag_name || '';

  if (data.body) {
    const card = document.getElementById('game-patch-notes-card');
    if (card) card.style.display = '';

    const title = document.getElementById('game-patch-title');
    if (title) title.textContent = data.name || `최신 게임 업데이트 (v${tag})`;

    const date = document.getElementById('game-patch-date');
    if (date) date.textContent = fmtDate(data.published_at);

    const body = document.getElementById('game-patch-body');
    if (body) body.innerHTML = fmtMd(data.body);

    const lnk = document.getElementById('game-patch-link');
    if (lnk) {
      if (data.html_url) lnk.href = data.html_url;
      else lnk.style.display = 'none';
    }
  }
}

// ── 서버 상태 ──
async function fetchServerStatus() {
  const dot = document.getElementById('status-dot');
  const txt = document.getElementById('server-status-text');
  const players = document.getElementById('server-players');
  const serverIp = 'tharu81.kro.kr';

  try {
    const res = await fetch('https://api.mcsrvstat.us/3/' + serverIp);
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();

    if (data.online) {
      if (dot) {
        dot.style.background = '#22c55e';
        dot.style.boxShadow = '0 0 8px #22c55e';
      }
      if (txt) {
        animateTextChange(txt, '온라인');
      }
      if (players && data.players) {
        animateTextChange(players, data.players.online + ' / ' + data.players.max);
      }
    } else {
      if (dot) {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = '0 0 8px #ef4444';
      }
      if (txt) animateTextChange(txt, '오프라인');
      if (players) animateTextChange(players, '— / —');
    }
  } catch (e) {
    if (txt) animateTextChange(txt, '확인 불가');
    console.error('Server status fetch failed:', e);
  }
}

// 텍스트 바뀔 때 fade 전환
function animateTextChange(el, newText) {
  el.style.transition = 'opacity 0.25s';
  el.style.opacity = '0';
  setTimeout(() => {
    el.textContent = newText;
    el.style.opacity = '1';
  }, 250);
}

// ── SLIDER ──
let currentSlide = 0;
let sliderTimer = null;

function updateDots() {
  document.querySelectorAll('.dot').forEach((d, i) =>
    d.classList.toggle('active', i === currentSlide)
  );
}

function goSlide(n) {
  const wrapper = document.getElementById('showcase-slider');
  if (!wrapper) return;
  const total = wrapper.querySelectorAll('img').length;
  currentSlide = (n + total) % total;
  wrapper.style.transform = `translateX(-${currentSlide * 100}%)`;
  updateDots();
}

function moveSlider(dir) {
  goSlide(currentSlide + dir);
  resetSliderAuto();
  playSound('click');
}

function resetSliderAuto() {
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(() => goSlide(currentSlide + 1), 5000);
}

function startSliderAuto() {
  resetSliderAuto();
}

// ── SOUND ──
const sounds = {};
['hover', 'click'].forEach(type => {
  const audio = new Audio();
  audio.src = `asset/audio/${type}.mp3`;
  audio.preload = 'auto';
  sounds[type] = audio;
});

function playSound(type) {
  const s = sounds[type];
  if (!s) return;
  try {
    s.currentTime = 0;
    s.play().catch(() => { });
  } catch { }
}

// ════════════════════════════════════════
//  PARTICLE BACKGROUND
// ════════════════════════════════════════
function initParticles() {
  const canvas = document.createElement('canvas');
  canvas.id = 'particle-canvas';
  canvas.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 0;
    pointer-events: none;
    opacity: 0.55;
  `;
  document.body.insertBefore(canvas, document.body.firstChild);

  const ctx = canvas.getContext('2d');
  let W, H, particles, mouse = { x: -9999, y: -9999 };

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function createParticles() {
    const count = Math.floor((W * H) / 10000);
    particles = Array.from({ length: count }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      r: Math.random() * 1.5 + 0.4,
      alpha: Math.random() * 0.5 + 0.1,
      // 각 파티클마다 색 변형 살짝
      hue: Math.random() > 0.8 ? 210 : 142
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    particles.forEach(p => {
      // 마우스 반응 — 가까우면 살짝 밀림
      const dx = p.x - mouse.x;
      const dy = p.y - mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const force = (120 - dist) / 120;
        p.vx += (dx / dist) * force * 0.04;
        p.vy += (dy / dist) * force * 0.04;
      }

      // 속도 감쇠
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.x += p.vx;
      p.y += p.vy;

      // 경계 처리
      if (p.x < 0) p.x = W;
      if (p.x > W) p.x = 0;
      if (p.y < 0) p.y = H;
      if (p.y > H) p.y = 0;

      // 파티클 그리기
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.hue === 142
        ? `rgba(34,197,94,${p.alpha})`
        : `rgba(59,130,246,${p.alpha * 0.6})`;
      ctx.fill();
    });

    // 가까운 파티클끼리 선 연결
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < 90) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(34,197,94,${(1 - d / 90) * 0.08})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }

    requestAnimationFrame(draw);
  }

  window.addEventListener('mousemove', e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
  });

  window.addEventListener('resize', () => {
    resize();
    createParticles();
  });

  resize();
  createParticles();
  draw();
}

// ════════════════════════════════════════
//  MOUSE AURORA — 마우스 따라 빛 번짐
// ════════════════════════════════════════
function initMouseAurora() {
  const aurora = document.createElement('div');
  aurora.id = 'mouse-aurora';
  aurora.style.cssText = `
    position: fixed;
    width: 600px;
    height: 600px;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    transform: translate(-50%, -50%);
    background: radial-gradient(circle, rgba(34,197,94,0.07) 0%, rgba(34,197,94,0.03) 40%, transparent 70%);
    transition: opacity 0.4s;
    will-change: transform;
  `;
  document.body.appendChild(aurora);

  let ax = window.innerWidth / 2;
  let ay = window.innerHeight / 2;
  let tx = ax, ty = ay;

  window.addEventListener('mousemove', e => {
    tx = e.clientX;
    ty = e.clientY;
  });

  function tick() {
    // 부드럽게 따라오기 (lerp)
    ax += (tx - ax) * 0.07;
    ay += (ty - ay) * 0.07;
    aurora.style.left = ax + 'px';
    aurora.style.top = ay + 'px';
    requestAnimationFrame(tick);
  }
  tick();
}

// ════════════════════════════════════════
//  CARD 3D TILT — 아이폰 느낌 기울기
// ════════════════════════════════════════
function initCardTilt() {
  const cards = document.querySelectorAll('.card');

  cards.forEach(card => {
    // 빛 반사 레이어 추가
    const glare = document.createElement('div');
    glare.className = 'card-glare';
    glare.style.cssText = `
      position: absolute;
      inset: 0;
      border-radius: inherit;
      pointer-events: none;
      z-index: 2;
      opacity: 0;
      transition: opacity 0.3s;
      background: radial-gradient(circle at 50% 50%, rgba(255,255,255,0.08) 0%, transparent 60%);
    `;
    card.appendChild(glare);

    card.addEventListener('mousemove', e => {
      const rect  = card.getBoundingClientRect();
      const cx    = rect.left + rect.width  / 2;
      const cy    = rect.top  + rect.height / 2;
      const dx    = (e.clientX - cx) / (rect.width  / 2);
      const dy    = (e.clientY - cy) / (rect.height / 2);

      // 최대 기울기 8도
      const rotX  = -dy * 1;
      const rotY  =  dx * 1;

      card.style.transform    = `perspective(900px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(6px)`;
      card.style.transition   = 'transform 0.1s ease, border-color 0.3s, box-shadow 0.3s';
      card.style.willChange   = 'transform';

      // 빛 반사 위치
      const glareX = ((e.clientX - rect.left) / rect.width)  * 100;
      const glareY = ((e.clientY - rect.top)  / rect.height) * 100;
      glare.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.10) 0%, transparent 55%)`;
      glare.style.opacity = '0.5';
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform  = '';
      card.style.transition = 'transform 0.5s cubic-bezier(0.23,1,0.32,1), border-color 0.3s, box-shadow 0.3s';
      glare.style.opacity   = '0';
    });
  });
}

// ════════════════════════════════════════
//  CUSTOM CURSOR
// ════════════════════════════════════════
function initCustomCursor() {
  // 모바일이면 건너뜀
  if (window.matchMedia('(pointer: coarse)').matches) return;

  const style = document.createElement('style');
  style.textContent = `
    * { cursor: none !important; }

    #cursor-dot {
      position: fixed;
      width: 6px;
      height: 6px;
      background: #22c55e;
      border-radius: 50%;
      pointer-events: none;
      z-index: 99999;
      transform: translate(-50%, -50%);
      transition: transform 0.08s, background 0.2s, width 0.2s, height 0.2s;
      box-shadow: 0 0 8px rgba(34,197,94,0.8);
      will-change: left, top;
    }

    #cursor-ring {
      position: fixed;
      width: 32px;
      height: 32px;
      border: 1px solid rgba(34,197,94,0.5);
      border-radius: 50%;
      pointer-events: none;
      z-index: 99998;
      transform: translate(-50%, -50%);
      transition: width 0.25s cubic-bezier(0.23,1,0.32,1),
                  height 0.25s cubic-bezier(0.23,1,0.32,1),
                  border-color 0.25s,
                  opacity 0.25s;
      will-change: left, top;
    }

    #cursor-ring.hover {
      width: 52px;
      height: 52px;
      border-color: rgba(34,197,94,0.8);
      background: rgba(34,197,94,0.04);
    }

    #cursor-ring.click {
      width: 22px;
      height: 22px;
      border-color: rgba(34,197,94,1);
    }
  `;
  document.head.appendChild(style);

  const dot = document.createElement('div'); dot.id = 'cursor-dot';
  const ring = document.createElement('div'); ring.id = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  let mx = -100, my = -100;
  let rx = -100, ry = -100;

  document.addEventListener('mousemove', e => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.left = mx + 'px';
    dot.style.top = my + 'px';
  });

  // ring은 lerp로 부드럽게
  function animRing() {
    rx += (mx - rx) * 0.14;
    ry += (my - ry) * 0.14;
    ring.style.left = rx + 'px';
    ring.style.top = ry + 'px';
    requestAnimationFrame(animRing);
  }
  animRing();

  // 클릭 가능한 요소 위에서 ring 확장
  const hoverEls = 'a, button, .btn, .comm-btn, .slider-btn, .dot, .faq-q, .faq-copy-btn, .hdr-link, .dl-btn';
  document.querySelectorAll(hoverEls).forEach(el => {
    el.addEventListener('mouseenter', () => ring.classList.add('hover'));
    el.addEventListener('mouseleave', () => ring.classList.remove('hover'));
  });

  document.addEventListener('mousedown', () => {
    ring.classList.add('click');
    dot.style.transform = 'translate(-50%,-50%) scale(0.6)';
  });
  document.addEventListener('mouseup', () => {
    ring.classList.remove('click');
    dot.style.transform = 'translate(-50%,-50%) scale(1)';
  });

  document.addEventListener('mouseleave', () => { ring.style.opacity = '0'; dot.style.opacity = '0'; });
  document.addEventListener('mouseenter', () => { ring.style.opacity = '1'; dot.style.opacity = '1'; });
}

// ════════════════════════════════════════
//  SCROLL PROGRESS BAR
// ════════════════════════════════════════
function initScrollProgress() {
  const bar = document.createElement('div');
  bar.id = 'scroll-progress';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    height: 2px;
    width: 0%;
    background: linear-gradient(90deg, #22c55e, #3b82f6);
    z-index: 10000;
    pointer-events: none;
    transition: width 0.1s linear;
    box-shadow: 0 0 8px rgba(34,197,94,0.6);
  `;
  document.body.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docH = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.width = (docH > 0 ? (scrollTop / docH) * 100 : 0) + '%';
  }, { passive: true });
}

// ════════════════════════════════════════
//  SCROLL REVEAL — IntersectionObserver
// ════════════════════════════════════════
function initScrollReveal() {
  const style = document.createElement('style');
  style.textContent = `
    .card {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.55s cubic-bezier(0.23,1,0.32,1),
                  transform 0.55s cubic-bezier(0.23,1,0.32,1),
                  border-color 0.3s,
                  box-shadow 0.3s;
    }
    .card.revealed {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  const observer = new IntersectionObserver(entries => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        setTimeout(() => entry.target.classList.add('revealed'), i * 60);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  document.querySelectorAll('.card').forEach(c => observer.observe(c));
}

// ════════════════════════════════════════
//  BUTTON EFFECTS (shimmer + flash + ripple)
// ════════════════════════════════════════
(function injectStyles() {
  if (document.getElementById('btn-anim-styles')) return;
  const style = document.createElement('style');
  style.id = 'btn-anim-styles';
  style.textContent = `
    .btn-shimmer {
      position: absolute;
      top: 0; left: -80%;
      width: 55%;
      height: 100%;
      background: linear-gradient(105deg, transparent 15%, rgba(255,255,255,0.20) 50%, transparent 85%);
      pointer-events: none;
      z-index: 10;
    }
    .btn:hover .btn-shimmer,
    .comm-btn:hover .btn-shimmer,
    .slider-btn:hover .btn-shimmer {
      animation: shimmerSlide 0.5s ease forwards;
    }
    @keyframes shimmerSlide {
      from { left: -80%; }
      to   { left: 130%; }
    }

    .btn-flash {
      position: absolute;
      inset: 0;
      background: transparent;
      pointer-events: none;
      z-index: 11;
      border-radius: inherit;
    }
    .btn-flash.active {
      animation: flashBurst 0.28s ease-out forwards;
    }
    @keyframes flashBurst {
      0%   { background: rgba(255,255,255,0.32); }
      100% { background: rgba(255,255,255,0); }
    }

    /* 리플 */
    .btn-ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(255,255,255,0.25);
      transform: scale(0);
      animation: rippleAnim 0.5s linear forwards;
      pointer-events: none;
      z-index: 12;
    }
    @keyframes rippleAnim {
      to { transform: scale(4); opacity: 0; }
    }

    .btn:active,
    .comm-btn:active,
    .slider-btn:active {
      transform: scale(0.96) translateY(1px) !important;
      transition: transform 0.07s ease !important;
    }
  `;
  document.head.appendChild(style);
})();

function attachButtonEffects() {
  const targets = document.querySelectorAll('.btn, .comm-btn, .slider-btn');
  targets.forEach(btn => {
    if (btn.querySelector('.btn-shimmer')) return;

    const shimmer = document.createElement('span');
    shimmer.className = 'btn-shimmer';
    btn.appendChild(shimmer);

    const flash = document.createElement('span');
    flash.className = 'btn-flash';
    btn.appendChild(flash);

    btn.addEventListener('mouseenter', () => {
      shimmer.style.animation = 'none';
      void shimmer.offsetWidth;
      shimmer.style.animation = '';
      playSound('hover');
    });

    btn.addEventListener('click', e => {
      // flash
      flash.classList.remove('active');
      void flash.offsetWidth;
      flash.classList.add('active');

      // ripple
      const rect = btn.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      const ripple = document.createElement('span');
      ripple.className = 'btn-ripple';
      ripple.style.width = ripple.style.height = size + 'px';
      ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
      ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
      btn.appendChild(ripple);
      setTimeout(() => ripple.remove(), 600);

      playSound('click');
    });
  });
}

// ── 런처 버튼 로딩 피드백 ──
function setBtnLoading(btn, msg, duration = 2000) {
  const textEl = btn.querySelector('.btn-text');
  if (!textEl) return;
  const original = textEl.textContent;
  textEl.textContent = msg;
  btn.disabled = true;
  btn.style.opacity = '0.65';
  setTimeout(() => {
    textEl.textContent = original;
    btn.disabled = false;
    btn.style.opacity = '';
  }, duration);
}

// ── 런처 버튼 ──
window.startGame = function (btn) {
  setBtnLoading(btn, '⏳ 실행 준비 중...');
  setTimeout(() => { window.location.href = "matz-client://start"; }, 100);
};

window.openLoginInfo = function (btn) {
  setBtnLoading(btn, '⏳ 여는 중...');
  setTimeout(() => { window.location.href = "matz-client://login-info"; }, 100);
};

window.openReplayFolder = function (btn) {
  setBtnLoading(btn, '⏳ 폴더 여는 중...');
  setTimeout(() => { window.location.href = "matz-client://replay"; }, 100);
};

// ── CUSTOM POPUP ENGINE ──
const POPUP_CFG = {
  reset: {
    icon: '🗑️', title: '클라이언트 초기화', sub: 'WARNING · RESET',
    msg: '클라이언트 설정과 캐시를 모두 초기화합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?',
    confirmText: '초기화', action: () => { window.location.href = 'matz-client://reset'; }
  },
  uninstall: {
    icon: '❌', title: '클라이언트 삭제', sub: 'DANGER · UNINSTALL',
    msg: '클라이언트를 완전히 삭제합니다.\n모든 데이터가 제거되며 되돌릴 수 없습니다.',
    confirmText: '삭제', action: () => { window.location.href = 'matz-client://uninstall'; }
  }
};

let _popupAction = null;

// 위치 계산 로직 — 분리된 함수
function repositionPopup(popup, btn) {
  const rect = btn.getBoundingClientRect();
  const popupW = 300;
  const goUp = (window.innerHeight - rect.bottom - 16) < 180;

  let left = rect.left + rect.width / 2 - popupW / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - popupW - 8));

  popup.classList.toggle('popup-up', goUp);
  popup.style.width = popupW + 'px';
  popup.style.left = left + 'px';

  if (goUp) {
    popup.style.top = 'auto';
    popup.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
  } else {
    popup.style.top = (rect.bottom + 10) + 'px';
    popup.style.bottom = 'auto';
  }
}

function showMatzPopup(triggerBtn, type) {
  const cfg = POPUP_CFG[type];
  if (!cfg) return;
  _popupAction = cfg.action;

  window._setPopupTriggerBtn(triggerBtn);

  const popup = document.getElementById('matz-popup');
  const overlay = document.getElementById('popup-overlay');

  document.getElementById('popup-icon').textContent = cfg.icon;
  document.getElementById('popup-title').textContent = cfg.title;
  document.getElementById('popup-sub').textContent = cfg.sub;
  document.getElementById('popup-msg').textContent = cfg.msg;
  document.getElementById('popup-confirm').textContent = cfg.confirmText;

  repositionPopup(popup, triggerBtn);

  overlay.classList.add('active');
  requestAnimationFrame(() => requestAnimationFrame(() => popup.classList.add('show')));
  playSound('click');
}

function closeMatzPopup() {
  document.getElementById('matz-popup').classList.remove('show');
  document.getElementById('popup-overlay').classList.remove('active');
  _popupAction = null;
  window._clearPopupTriggerBtn();
}

// 팝업 초기화 (DOMContentLoaded 이후 한 번만)
function initMatzPopup() {
  document.getElementById('popup-cancel').addEventListener('click', closeMatzPopup);
  document.getElementById('popup-confirm').addEventListener('click', () => {
    closeMatzPopup();
    if (_popupAction) setTimeout(_popupAction, 100);
  });
  document.getElementById('popup-overlay').addEventListener('click', closeMatzPopup);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMatzPopup(); });

  // ── 스크롤 시 팝업 위치 재계산 ──
  let _popupTriggerBtn = null; // 현재 팝업을 연 버튼 참조 저장

  // showMatzPopup 에서 triggerBtn을 저장하도록 수정
  // (아래 showMatzPopup 에서 _popupTriggerBtn = triggerBtn 라인 참고)

  window.addEventListener('scroll', () => {
    const popup = document.getElementById('matz-popup');
    if (!popup.classList.contains('show') || !_popupTriggerBtn) return;
    repositionPopup(popup, _popupTriggerBtn);
  }, { passive: true });

  // 외부에서 접근할 수 있도록 setter 노출
  window._setPopupTriggerBtn = (btn) => { _popupTriggerBtn = btn; };
  window._clearPopupTriggerBtn = () => { _popupTriggerBtn = null; };
}

// ── 런처 버튼 (confirm → showMatzPopup 으로 교체) ──
window.reset = function (btn) {
  showMatzPopup(btn, 'reset');
};

window.uninstall = function (btn) {
  showMatzPopup(btn, 'uninstall');
};

// ── FAQ / IP ──
function faqToggle(btn) {
  const item = btn.closest('.faq-item');
  const wasOpen = item.classList.contains('faq-open');
  document.querySelectorAll('.faq-item.faq-open').forEach(i => i.classList.remove('faq-open'));
  if (!wasOpen) item.classList.add('faq-open');
}

function copyIP(btn) {
  navigator.clipboard.writeText('tharu81.kro.kr').then(() => {
    btn.textContent = '완료!';
    setTimeout(() => btn.textContent = '복사', 1500);
  });
}

// ── INIT ──
(async () => {
  initMatzPopup();

  // 배경 / UX 효과 먼저 초기화 (빠른 시각적 피드백)
  initScrollProgress();
  initScrollReveal();
  initParticles();
  initMouseAurora();
  initCustomCursor();

  // 카드 tilt는 DOM이 안정된 후
  requestAnimationFrame(() => {
    initCardTilt();
    attachButtonEffects();
  });

  // 데이터 fetch
  const [client, game] = await Promise.all([
    fetchRelease('client'),
    fetchRelease('game')
  ]);

  if (client) {
    updateClientInfo(client);
  } else {
    const bar = document.getElementById('client-version-bar');
    if (bar) bar.textContent = '불러오기 실패';
    const dlBtn = document.getElementById('download-btn');
    if (dlBtn && !dlBtn.getAttribute('href')) {
      dlBtn.style.opacity = '0.5';
      dlBtn.style.pointerEvents = 'none';
    }
  }

  if (game) updateGameInfo(game);

  fetchServerStatus();
  setInterval(fetchServerStatus, 60000);

  startSliderAuto();
})();
