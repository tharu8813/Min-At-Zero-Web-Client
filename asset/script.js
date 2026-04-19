// ── REPOS ──
const REPOS = {
  client: 'tharu8813/Min-At-Zero-Clinet',
  game:   'tharu8813/Min-At-Zero'
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
    .replace(/^## (.+)$/gm,  '<h3 style="color:var(--green);font-size:14px;font-weight:600;margin:14px 0 6px">$1</h3>')
    .replace(/^# (.+)$/gm,   '<h2 style="color:var(--green);font-size:15px;font-weight:700;margin:14px 0 6px">$1</h2>')
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
      if (txt) txt.textContent = '온라인';
      if (players && data.players) {
        players.textContent = data.players.online + ' / ' + data.players.max;
      }
    } else {
      if (dot) {
        dot.style.background = '#ef4444';
        dot.style.boxShadow = '0 0 8px #ef4444';
      }
      if (txt) txt.textContent = '오프라인';
      if (players) players.textContent = '— / —';
    }
  } catch (e) {
    if (txt) txt.textContent = '확인 불가';
    console.error('Server status fetch failed:', e);
  }
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
  playSound('click');
}

function startSliderAuto() {
  if (sliderTimer) clearInterval(sliderTimer);
  sliderTimer = setInterval(() => goSlide(currentSlide + 1), 5000);
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
    s.play().catch(() => {});
  } catch {
    // 오디오 파일 없으면 무시
  }
}

// ── 버튼 애니메이션 CSS 주입 ──
(function injectStyles() {
  if (document.getElementById('btn-anim-styles')) return;
  const style = document.createElement('style');
  style.id = 'btn-anim-styles';
  style.textContent = `
    /* shimmer 엘리먼트 */
    .btn-shimmer {
      position: absolute;
      top: 0; left: -80%;
      width: 55%;
      height: 100%;
      background: linear-gradient(
        105deg,
        transparent 15%,
        rgba(255,255,255,0.20) 50%,
        transparent 85%
      );
      pointer-events: none;
      z-index: 10;
    }
    /* 호버 시 shimmer 슬라이드 */
    .btn:hover .btn-shimmer,
    .comm-btn:hover .btn-shimmer,
    .slider-btn:hover .btn-shimmer {
      animation: shimmerSlide 0.5s ease forwards;
    }
    @keyframes shimmerSlide {
      from { left: -80%; }
      to   { left: 130%; }
    }

    /* flash 엘리먼트 */
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

    /* 클릭 시 살짝 눌림 */
    .btn:active,
    .comm-btn:active,
    .slider-btn:active {
      transform: scale(0.96) translateY(1px) !important;
      transition: transform 0.07s ease !important;
    }
  `;
  document.head.appendChild(style);
})();

// shimmer + flash 엘리먼트를 버튼에 주입
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
      // CSS hover가 처리하지만, 재진입 시 animation 재시작 보장
      shimmer.style.animation = 'none';
      void shimmer.offsetWidth;
      shimmer.style.animation = '';
      playSound('hover');
    });

    btn.addEventListener('click', () => {
      flash.classList.remove('active');
      void flash.offsetWidth;
      flash.classList.add('active');
      playSound('click');
    });
  });
}

// ── 런처 버튼 로딩 피드백 헬퍼 ──
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

// ── 런처 버튼 (웹 환경 폴백) ──
// 실행 방식 확정 후 TODO 부분만 교체하세요.
// 예: matz-client:// 프로토콜 / Electron IPC / WebSocket 등

window.startGame = function(btn) {
  setBtnLoading(btn, '⏳ 실행 준비 중...');
  setTimeout(() => {
    window.location.href = "matz-client://start";
  }, 100);
};

window.openLoginInfo = function(btn) {
  setBtnLoading(btn, '⏳ 여는 중...');
  setTimeout(() => {
    window.location.href = "matz-client://login-info";
  }, 100);
};

window.openReplayFolder = function(btn) {
  setBtnLoading(btn, '⏳ 폴더 여는 중...');
  setTimeout(() => {
    window.location.href = "matz-client://replay";
  }, 100);
};

window.reset = function(btn) {
  if (!confirm('클라이언트를 초기화하시겠습니까?')) return;
  setBtnLoading(btn, '⏳ 초기화 중...');
  setTimeout(() => {
    window.location.href = "matz-client://reset";
  }, 100);
};

window.uninstall = function(btn) {
  if (!confirm('클라이언트를 정말 삭제하시겠습니까?')) return;
  setBtnLoading(btn, '⏳ 삭제 중...');
  setTimeout(() => {
    window.location.href = "matz-client://uninstall";
  }, 100);
};

// ── INIT ──
(async () => {
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
  attachButtonEffects();
})();

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
