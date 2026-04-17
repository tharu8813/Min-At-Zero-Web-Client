const REPOS = { client: 'tharu8813/Min-At-Zero-Clinet', game: 'tharu8813/Min-At-Zero' };

async function fetchRelease(type) {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPOS[type]}/releases/latest`);
    if (!r.ok) return null;
    return await r.json();
  } catch { return null; }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric' });
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

function updateClientInfo(data) {
  const ver = document.getElementById('client-version');
  if (ver && data.tag_name) {
    ver.innerHTML = `<span class="badge badge-green"><span class="pulse"></span> v${data.tag_name}</span>`;
  }
  const exe = data.assets?.find(a => a.name.toLowerCase().endsWith('.exe'));
  if (exe) {
    const btn = document.getElementById('download-btn');
    if (btn) btn.href = exe.browser_download_url;
    const sz = document.getElementById('file-size');
    if (sz) sz.textContent = `약 ${(exe.size/1048576).toFixed(1)}MB`;
    const di = document.getElementById('download-info');
    if (di) {
      di.querySelector('span:first-child').textContent = `최신 버전: v${data.tag_name}`;
    }
  }
  if (data.body) {
    const wrap = document.getElementById('client-patch-notes');
    if (wrap) {
      wrap.innerHTML = `
        <div style="margin-top:28px;padding-top:24px;border-top:1px solid var(--border)">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:12px">
            <span style="font-size:12px;font-weight:700;letter-spacing:2px;color:var(--blue);text-transform:uppercase">Client Update</span>
            <span style="font-size:12px;color:var(--text-dim)">v${data.tag_name} · ${fmtDate(data.published_at)}</span>
          </div>
          <div class="patch-box" style="border-color:rgba(59,130,246,0.1)">${fmtMd(data.body)}</div>
          ${data.html_url ? `<a href="${data.html_url}" target="_blank" style="display:inline-flex;align-items:center;gap:6px;color:var(--blue);font-size:12px;text-decoration:none;margin-top:10px">GitHub에서 보기 →</a>` : ''}
        </div>`;
    }
  }
}

function updateGameInfo(data) {
  const ver = document.getElementById('game-version');
  if (ver && data.tag_name) ver.textContent = `1.20.1 (v${data.tag_name})`;
  if (data.body) {
    const card = document.getElementById('game-patch-notes-card');
    card.style.display = '';
    document.getElementById('game-patch-title').textContent = data.name || `최신 게임 업데이트 (v${data.tag_name})`;
    document.getElementById('game-patch-date').textContent = fmtDate(data.published_at);
    document.getElementById('game-patch-body').innerHTML = fmtMd(data.body);
    const lnk = document.getElementById('game-patch-link');
    if (data.html_url) lnk.href = data.html_url; else lnk.style.display = 'none';
    const trailer = document.querySelector('.card.span-full');
    trailer?.after(card);
  }
}

function handleAction(url, btn, msg) {
  if (msg && !confirm(msg)) return;
  btn.disabled = true; btn.style.opacity = '0.5';
  setTimeout(() => { window.location.href = url; btn.disabled = false; btn.style.opacity = ''; }, 300);
}
function startGame(b) { handleAction('matz-client://start', b); }
function openLoginInfo(b) { handleAction('matz-client://login-info', b); }
function reset(b) { handleAction('matz-client://reset', b, '클라이언트를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.'); }
function uninstall(b) { handleAction('matz-client://uninstall', b, '클라이언트를 삭제하시겠습니까?\n모든 데이터가 영구적으로 삭제됩니다.'); }

(async () => {
  const [client, game] = await Promise.all([fetchRelease('client'), fetchRelease('game')]);
  if (client) updateClientInfo(client);
  else { const v = document.getElementById('client-version'); if(v) v.innerHTML = '<span style="color:var(--text-dim);font-size:12px">불러오기 실패</span>'; }
  if (game) updateGameInfo(game);
})();
