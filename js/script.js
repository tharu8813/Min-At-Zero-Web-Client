// GitHub API 설정 (클라이언트)
const GITHUB_CLIENT_REPO = 'tharu8813/Min-At-Zero-Clinet';
const GITHUB_CLIENT_API_URL = `https://api.github.com/repos/${GITHUB_CLIENT_REPO}/releases/latest`;

// GitHub API 설정 (게임) - 실제 저장소 이름으로 교체하세요 (예: 'tharu8813/Min-At-Zero-Game')
const GITHUB_GAME_REPO = 'tharu8813/Min-At-Zero'; // 게임 저장소 이름으로 변경
const GITHUB_GAME_API_URL = `https://api.github.com/repos/${GITHUB_GAME_REPO}/releases/latest`;

// Notion API 설정은 제거 (GitHub로 대체)

// 릴리즈 정보를 가져오는 함수 (클라이언트)
async function fetchLatestClientRelease() {
    try {
        const response = await fetch(GITHUB_CLIENT_API_URL);
        
        if (!response.ok) {
            throw new Error('클라이언트 릴리즈 정보를 가져올 수 없습니다.');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('GitHub 클라이언트 API 오류:', error);
        return null;
    }
}

// 릴리즈 정보를 가져오는 함수 (게임)
async function fetchLatestGameRelease() {
    try {
        const response = await fetch(GITHUB_GAME_API_URL);
        
        if (!response.ok) {
            throw new Error('게임 릴리즈 정보를 가져올 수 없습니다.');
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('GitHub 게임 API 오류:', error);
        return null;
    }
}

// UI 업데이트 함수 (클라이언트)
function updateClientInfo(releaseData) {
    if (!releaseData) return;
    
    // 클라이언트 버전 정보 업데이트
    const versionElement = document.getElementById('client-version');
    if (versionElement && releaseData.tag_name) {
        versionElement.textContent = `v${releaseData.tag_name}`;
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
    
    // 클라이언트 패치 노트 섹션 추가
    addClientPatchNotes(releaseData);
}

// 클라이언트 패치 노트 섹션 추가 함수
function addClientPatchNotes(releaseData) {
    if (!releaseData.body) return;
    
    // 클라이언트 다운로드 카드 찾기
    const downloadCard = Array.from(document.querySelectorAll('.card')).find(card => 
        card.querySelector('h2')?.textContent.includes('클라이언트 다운로드')
    );
    
    if (!downloadCard) return;
    
    // 기존 패치 노트 제거 (중복 방지)
    const existingPatchNotes = downloadCard.querySelector('#client-patch-notes');
    if (existingPatchNotes) {
        existingPatchNotes.remove();
    }
    
    // 발행일 포맷팅
    const publishDate = new Date(releaseData.published_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // 패치 노트 섹션 생성
    const patchNotesSection = document.createElement('div');
    patchNotesSection.id = 'client-patch-notes';
    patchNotesSection.style.marginTop = '30px';
    patchNotesSection.style.paddingTop = '25px';
    patchNotesSection.style.borderTop = '1px solid rgba(148, 163, 184, 0.2)';
    
    patchNotesSection.innerHTML = `
        <h3 style="font-size: 18px; color: #cbd5e1; margin-bottom: 10px; display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">📋</span> 클라이언트 업데이트 (v${releaseData.tag_name})
        </h3>
        <div style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">
            ${publishDate}
        </div>
        <div class="client-patch-notes-content">
            ${formatPatchNotes(releaseData.body)}
        </div>
        ${releaseData.html_url ? `
            <a href="${releaseData.html_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; color: #3b82f6; text-decoration: none; font-size: 13px; margin-top: 12px; transition: all 0.3s;">
                <span>GitHub에서 자세히 보기</span>
                <span>→</span>
            </a>
        ` : ''}
    `;
    
    // 다운로드 정보 다음에 삽입
    const downloadInfo = document.getElementById('download-info');
    if (downloadInfo) {
        downloadInfo.parentNode.insertBefore(patchNotesSection, downloadInfo.nextSibling);
    }
}

// UI 업데이트 함수 (게임)
function updateGameInfo(releaseData) {
    if (!releaseData) return;
    
    // 게임 버전 정보 업데이트
    const versionElement = document.getElementById('game-version');
    if (versionElement && releaseData.tag_name) {
        versionElement.textContent = `1.20.1 (v${releaseData.tag_name})`;
    }
    
    // 게임 패치 노트 섹션 추가
    addGamePatchNotes(releaseData);
}

// 게임 패치 노트 섹션 추가 함수 (클라이언트와 유사하게 스타일링)
function addGamePatchNotes(releaseData) {
    if (!releaseData.body) return;
    
    const contentGrid = document.querySelector('.content-grid');
    
    // 기존 게임 패치 노트 제거 (중복 방지)
    const existingGamePatchNotes = document.getElementById('game-patch-notes-card');
    if (existingGamePatchNotes) {
        existingGamePatchNotes.remove();
    }
    
    // 발행일 포맷팅
    const publishDate = new Date(releaseData.published_at).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // 게임 패치 노트 카드 생성
    const gamePatchNotesCard = document.createElement('div');
    gamePatchNotesCard.id = 'game-patch-notes-card';
    gamePatchNotesCard.className = 'card';
    gamePatchNotesCard.style.gridColumn = '1 / -1';
    
    gamePatchNotesCard.innerHTML = `
        <h2>🎮 게임 패치 노트</h2>
        <div class="game-patch-notes-list">
            <div class="patch-note-item" style="padding: 20px 0;">
                <h3 style="font-size: 18px; color: #e5e7eb; margin-bottom: 8px;">${releaseData.name || '최신 게임 업데이트 (v' + releaseData.tag_name + ')'}</h3>
                <div style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">${publishDate}</div>
                <div class="patch-notes-content">
                    ${formatPatchNotes(releaseData.body)}
                </div>
                ${releaseData.html_url ? `
                    <a href="${releaseData.html_url}" target="_blank" style="display: inline-flex; align-items: center; gap: 6px; color: #3b82f6; text-decoration: none; font-size: 13px; margin-top: 12px; transition: all 0.3s;">
                        <span>GitHub에서 자세히 보기</span>
                        <span>→</span>
                    </a>
                ` : ''}
            </div>
        </div>
    `;
    
    // 클라이언트 다운로드 카드 바로 위에 삽입 (컨셉 유지)
    const downloadCard = Array.from(document.querySelectorAll('.card')).find(card => 
        card.querySelector('h2')?.textContent.includes('클라이언트 다운로드')
    );
    
    if (downloadCard) {
        contentGrid.insertBefore(gamePatchNotesCard, downloadCard);
    } else {
        contentGrid.appendChild(gamePatchNotesCard);
    }
}

// Markdown 형식의 패치 노트를 HTML로 변환 (공통 함수)
function formatPatchNotes(markdown) {
    if (!markdown) return '';
    
    let html = markdown
        // 헤더 변환
        .replace(/^### (.*$)/gim, '<h4 style="color: #3b82f6; margin: 15px 0 8px 0; font-size: 14px;">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 style="color: #3b82f6; margin: 15px 0 8px 0; font-size: 15px;">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 style="color: #3b82f6; margin: 15px 0 8px 0; font-size: 16px;">$1</h2>')
        // 볼드 변환
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e5e7eb;">$1</strong>')
        // 이탤릭 변환
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 코드 블록 변환
        .replace(/`([^`]+)`/g, '<code style="background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #3b82f6; font-size: 12px;">$1</code>')
        // 리스트 변환
        .replace(/^\* (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; color: #cbd5e1; font-size: 13px;">$1</li>')
        .replace(/^- (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; color: #cbd5e1; font-size: 13px;">$1</li>')
        // 줄바꿈 변환
        .replace(/\n\n/g, '</p><p style="color: #cbd5e1; line-height: 1.5; margin-bottom: 8px; font-size: 13px;">')
        .replace(/\n/g, '<br>');
    
    // 리스트 그룹핑
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/gs, 
        '<ul style="margin: 8px 0; list-style-type: disc;">$1</ul>');
    
    return `<div style="color: #cbd5e1; line-height: 1.5; font-size: 13px;">${html}</div>`;
}

// 로딩 상태 표시
function showLoadingState() {
    const sizeInfo = document.getElementById('download-info');
    
    if (sizeInfo) {
        sizeInfo.innerHTML = '릴리즈 정보를 불러오는 중...';
    }
}

// 에러 상태 표시
function showErrorState() {
    const sizeInfo = document.getElementById('download-info');
    
    if (sizeInfo) {
        sizeInfo.innerHTML = '최신 버전 • Windows 10/11 지원 • 약 4MB';
        sizeInfo.style.color = '#64748b';
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
    
    // GitHub에서 클라이언트 릴리즈 정보 가져오기
    const clientReleaseData = await fetchLatestClientRelease();
    
    if (clientReleaseData) {
        updateClientInfo(clientReleaseData);
        console.log('클라이언트 릴리즈 정보 업데이트 완료:', clientReleaseData.tag_name);
    } else {
        showErrorState();
        console.warn('클라이언트 릴리즈 정보를 가져올 수 없습니다. 기본 값을 사용합니다.');
    }
    
    // GitHub에서 게임 릴리즈 정보 가져오기
    const gameReleaseData = await fetchLatestGameRelease();
    
    if (gameReleaseData) {
        updateGameInfo(gameReleaseData);
        console.log('게임 릴리즈 정보 업데이트 완료:', gameReleaseData.tag_name);
    } else {
        console.warn('게임 릴리즈 정보를 가져올 수 없습니다. 기본 값을 사용합니다.');
    }
});
