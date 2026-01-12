// GitHub API 설정
const GITHUB_REPO = 'tharu8813/Min-At-Zero-Clinet';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// 릴리즈 정보를 가져오는 함수
async function fetchLatestRelease() {
    try {
        const response = await fetch(GITHUB_API_URL);
        
        if (!response.ok) {
            throw new Error('릴리즈 정보를 가져올 수 없습니다.');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('GitHub API 오류:', error);
        return null;
    }
}

// UI 업데이트 함수
function updateClientInfo(releaseData) {
    if (!releaseData) return;
    
    // 버전 정보 업데이트
    const versionElement = document.getElementById('client-version');
    if (versionElement && releaseData.tag_name) {
        versionElement.textContent = `1.20.1 (v${releaseData.tag_name})`;
    }
    
    // 다운로드 링크 업데이트
    const downloadBtn = document.getElementById('download-btn');
    if (downloadBtn && releaseData.assets && releaseData.assets.length > 0) {
        // .exe 파일 찾기
        const exeAsset = releaseData.assets.find(asset => 
            asset.name.toLowerCase().endsWith('.exe')
        );
        
        if (exeAsset) {
            downloadBtn.href = exeAsset.browser_download_url;
            
            // 파일 크기 표시 (MB로 변환)
            const fileSizeMB = (exeAsset.size / (1024 * 1024)).toFixed(1);
            const sizeInfo = document.getElementById('download-info');
            if (sizeInfo) {
                sizeInfo.innerHTML = `최신 버전: v${releaseData.tag_name} • Windows 10/11 지원 • 약 ${fileSizeMB}MB`;
            }
        }
    }
    
    // 패치 노트 섹션 추가
    addPatchNotes(releaseData);
}

// 패치 노트 섹션 추가 함수
function addPatchNotes(releaseData) {
    if (!releaseData.body) return;
    
    const contentGrid = document.querySelector('.content-grid');
    
    // 기존 패치 노트 제거 (중복 방지)
    const existingPatchNotes = document.getElementById('patch-notes-card');
    if (existingPatchNotes) {
        existingPatchNotes.remove();
    }
    
    // 패치 노트 카드 생성
    const patchNotesCard = document.createElement('div');
    patchNotesCard.id = 'patch-notes-card';
    patchNotesCard.className = 'card';
    patchNotesCard.style.gridColumn = '1 / -1';
    
    // 발행일 포맷팅
    const publishDate = new Date(releaseData.published_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    patchNotesCard.innerHTML = `
        <h2>📝 최신 업데이트 (v${releaseData.tag_name})</h2>
        <div style="color: #94a3b8; font-size: 14px; margin-bottom: 15px;">
            발행일: ${publishDate}
        </div>
        <div class="patch-notes-content">
            ${formatPatchNotes(releaseData.body)}
        </div>
        ${releaseData.html_url ? `
            <a href="${releaseData.html_url}" target="_blank" class="notion-link" style="margin-top: 20px;">
                🔗 GitHub에서 전체 릴리즈 노트 보기 →
            </a>
        ` : ''}
    `;
    
    // 클라이언트 다운로드 카드 바로 위에 삽입
    const downloadCard = document.querySelector('.card[style*="grid-column: 1 / -1"]:last-child');
    if (downloadCard) {
        contentGrid.insertBefore(patchNotesCard, downloadCard);
    } else {
        contentGrid.appendChild(patchNotesCard);
    }
}

// Markdown 형식의 패치 노트를 HTML로 변환
function formatPatchNotes(markdown) {
    if (!markdown) return '';
    
    let html = markdown
        // 헤더 변환
        .replace(/^### (.*$)/gim, '<h4 style="color: #22c55e; margin: 20px 0 10px 0; font-size: 16px;">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 style="color: #22c55e; margin: 20px 0 10px 0; font-size: 18px;">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 style="color: #22c55e; margin: 20px 0 10px 0; font-size: 20px;">$1</h2>')
        // 볼드 변환
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e5e7eb;">$1</strong>')
        // 이탤릭 변환
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 코드 블록 변환
        .replace(/`([^`]+)`/g, '<code style="background: rgba(34, 197, 94, 0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #22c55e;">$1</code>')
        // 리스트 변환
        .replace(/^\* (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 8px; color: #cbd5e1;">$1</li>')
        .replace(/^- (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 8px; color: #cbd5e1;">$1</li>')
        // 줄바꿈 변환
        .replace(/\n\n/g, '</p><p style="color: #cbd5e1; line-height: 1.6; margin-bottom: 10px;">')
        .replace(/\n/g, '<br>');
    
    // 리스트 그룹핑
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/gs, 
        '<ul style="margin: 10px 0; list-style-type: disc;">$1</ul>');
    
    return `<div style="color: #cbd5e1; line-height: 1.6;">${html}</div>`;
}

// 로딩 상태 표시
function showLoadingState() {
    const downloadBtn = document.getElementById('download-btn');
    const sizeInfo = document.getElementById('download-info');
    
    if (downloadBtn) {
        downloadBtn.style.opacity = '0.6';
        downloadBtn.style.pointerEvents = 'none';
    }
    
    if (sizeInfo) {
        sizeInfo.innerHTML = '릴리즈 정보를 불러오는 중...';
    }
}

// 에러 상태 표시
function showErrorState() {
    const downloadBtn = document.getElementById('download-btn');
    const sizeInfo = document.getElementById('download-info');
    
    if (downloadBtn) {
        downloadBtn.style.opacity = '1';
        downloadBtn.style.pointerEvents = 'auto';
    }
    
    if (sizeInfo) {
        sizeInfo.innerHTML = '⚠️ 릴리즈 정보를 불러올 수 없습니다. 기본 다운로드 링크를 사용하세요.';
        sizeInfo.style.color = '#f59e0b';
    }
}

// 클라이언트 액션 핸들러
function handleClientAction(url, button, confirmMessage = null) {
    if (confirmMessage && !confirm(confirmMessage)) {
        return;
    }

    button.classList.add('loading');

    setTimeout(() => {
        window.location.href = url;
        button.classList.remove('loading');
    }, 300);
}

function startGame(button) {
    handleClientAction("matz-clinet://start", button);
}

function openLoginInfo(button) {
    handleClientAction("matz-clinet://login-info", button);
}

function reset(button) {
    handleClientAction("matz-clinet://reset", button, '클라이언트를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.');
}

// 페이지 로드 시 실행
window.addEventListener('load', async () => {
    console.log('Min. At. Zero Launcher loaded');
    
    // 로딩 상태 표시
    showLoadingState();
    
    // GitHub에서 최신 릴리즈 정보 가져오기
    const releaseData = await fetchLatestRelease();
    
    if (releaseData) {
        updateClientInfo(releaseData);
        console.log('릴리즈 정보 업데이트 완료:', releaseData.tag_name);
    } else {
        showErrorState();
        console.warn('릴리즈 정보를 가져올 수 없습니다. 기본 값을 사용합니다.');
    }
});
