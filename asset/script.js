// GitHub API 설정
const GITHUB_REPOS = {
    client: 'tharu8813/Min-At-Zero-Clinet',
    game: 'tharu8813/Min-At-Zero'
};

const GITHUB_API_BASE = 'https://api.github.com/repos';

// GitHub 릴리즈 정보 가져오기 (통합 함수)
async function fetchLatestRelease(repoType) {
    try {
        const repo = GITHUB_REPOS[repoType];
        const response = await fetch(`${GITHUB_API_BASE}/${repo}/releases/latest`);
        
        if (!response.ok) {
            throw new Error(`${repoType} 릴리즈 정보를 가져올 수 없습니다.`);
        }
        
        return await response.json();
    } catch (error) {
        console.error(`GitHub ${repoType} API 오류:`, error);
        return null;
    }
}

// 클라이언트 정보 업데이트
function updateClientInfo(releaseData) {
    if (!releaseData) return;
    
    // 클라이언트 버전 업데이트
    const versionElement = document.getElementById('client-version');
    if (versionElement && releaseData.tag_name) {
        versionElement.textContent = `v${releaseData.tag_name}`;
    }
    
    // 다운로드 링크 업데이트
    updateDownloadLink(releaseData);
    
    // 클라이언트 패치 노트 추가
    addClientPatchNotes(releaseData);
}

// 다운로드 링크 업데이트
function updateDownloadLink(releaseData) {
    const downloadBtn = document.getElementById('download-btn');
    const sizeInfo = document.getElementById('download-info');
    
    if (!downloadBtn || !releaseData.assets?.length) return;
    
    // .exe 파일 찾기
    const exeAsset = releaseData.assets.find(asset => 
        asset.name.toLowerCase().endsWith('.exe')
    );
    
    if (exeAsset) {
        downloadBtn.href = exeAsset.browser_download_url;
        
        // 파일 크기 표시 (MB로 변환)
        const fileSizeMB = (exeAsset.size / (1024 * 1024)).toFixed(1);
        if (sizeInfo) {
            sizeInfo.innerHTML = `최신 버전: v${releaseData.tag_name} • Windows 10/11 지원 • 약 ${fileSizeMB}MB`;
        }
    }
}

// 클라이언트 패치 노트 추가
function addClientPatchNotes(releaseData) {
    if (!releaseData.body) return;
    
    const downloadCard = findCardByTitle('클라이언트 다운로드');
    if (!downloadCard) return;
    
    // 기존 패치 노트 제거
    const existingPatchNotes = downloadCard.querySelector('#client-patch-notes');
    if (existingPatchNotes) {
        existingPatchNotes.remove();
    }
    
    const publishDate = formatDate(releaseData.published_at);
    
    const patchNotesSection = document.createElement('div');
    patchNotesSection.id = 'client-patch-notes';
    patchNotesSection.style.cssText = 'margin-top: 30px; padding-top: 25px; border-top: 1px solid rgba(148, 163, 184, 0.2);';
    
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
    
    const downloadInfo = document.getElementById('download-info');
    if (downloadInfo) {
        downloadInfo.parentNode.insertBefore(patchNotesSection, downloadInfo.nextSibling);
    }
}

// 게임 정보 업데이트
function updateGameInfo(releaseData) {
    if (!releaseData) return;
    
    // 게임 버전 업데이트
    const versionElement = document.getElementById('game-version');
    if (versionElement && releaseData.tag_name) {
        versionElement.textContent = `1.20.1 (v${releaseData.tag_name})`;
    }
    
    // 게임 패치 노트 추가
    addGamePatchNotes(releaseData);
}

// 게임 패치 노트 추가 (공식 트레일러 바로 아래)
function addGamePatchNotes(releaseData) {
    if (!releaseData.body) return;
    
    const contentGrid = document.querySelector('.content-grid');
    if (!contentGrid) return;
    
    // 기존 게임 패치 노트 제거
    const existingGamePatchNotes = document.getElementById('game-patch-notes-card');
    if (existingGamePatchNotes) {
        existingGamePatchNotes.remove();
    }
    
    const publishDate = formatDate(releaseData.published_at);
    
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
    
    // 공식 트레일러 카드 찾기
    const trailerCard = findCardByTitle('공식 트레일러');
    
    if (trailerCard && trailerCard.nextSibling) {
        // 공식 트레일러 바로 다음에 삽입
        contentGrid.insertBefore(gamePatchNotesCard, trailerCard.nextSibling);
    } else {
        // 트레일러를 찾지 못한 경우 첫 번째 카드 앞에 삽입
        const firstCard = contentGrid.querySelector('.card:not(#game-patch-notes-card)');
        if (firstCard) {
            contentGrid.insertBefore(gamePatchNotesCard, firstCard);
        } else {
            contentGrid.appendChild(gamePatchNotesCard);
        }
    }
}

// Markdown을 HTML로 변환
function formatPatchNotes(markdown) {
    if (!markdown) return '';
    
    let html = markdown
        // 헤더 변환
        .replace(/^### (.*$)/gim, '<h4 style="color: #3b82f6; margin: 15px 0 8px 0; font-size: 14px;">$1</h4>')
        .replace(/^## (.*$)/gim, '<h3 style="color: #3b82f6; margin: 15px 0 8px 0; font-size: 15px;">$1</h3>')
        .replace(/^# (.*$)/gim, '<h2 style="color: #3b82f6; margin: 15px 0 8px 0; font-size: 16px;">$1</h2>')
        // 볼드/이탤릭 변환
        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: #e5e7eb;">$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // 코드 블록 변환
        .replace(/`([^`]+)`/g, '<code style="background: rgba(59, 130, 246, 0.1); padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #3b82f6; font-size: 12px;">$1</code>')
        // 리스트 변환
        .replace(/^[\*\-] (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 6px; color: #cbd5e1; font-size: 13px;">$1</li>')
        // 줄바꿈 변환
        .replace(/\n\n/g, '</p><p style="color: #cbd5e1; line-height: 1.5; margin-bottom: 8px; font-size: 13px;">')
        .replace(/\n/g, '<br>');
    
    // 리스트 그룹핑
    html = html.replace(/(<li[^>]*>.*?<\/li>(?:\s*<li[^>]*>.*?<\/li>)*)/gs, 
        '<ul style="margin: 8px 0; list-style-type: disc;">$1</ul>');
    
    return `<div style="color: #cbd5e1; line-height: 1.5; font-size: 13px;">${html}</div>`;
}

// 유틸리티 함수들
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function findCardByTitle(titleText) {
    return Array.from(document.querySelectorAll('.card')).find(card => 
        card.querySelector('h2')?.textContent.includes(titleText)
    );
}

function showLoadingState() {
    const sizeInfo = document.getElementById('download-info');
    if (sizeInfo) {
        sizeInfo.innerHTML = '릴리즈 정보를 불러오는 중...';
    }
}

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
    handleClientAction("matz-client://start", button);
}

function openLoginInfo(button) {
    handleClientAction("matz-client://login-info", button);
}

function reset(button) {
    handleClientAction("matz-client://reset", button, '클라이언트를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.');
}

// 페이지 로드 시 실행
window.addEventListener('load', async () => {
    console.log('Min. At. Zero Launcher loaded');
    
    showLoadingState();
    
    // 클라이언트 릴리즈 정보 가져오기
    const clientReleaseData = await fetchLatestRelease('client');
    
    if (clientReleaseData) {
        updateClientInfo(clientReleaseData);
        console.log('클라이언트 릴리즈 정보 업데이트 완료:', clientReleaseData.tag_name);
    } else {
        showErrorState();
        console.warn('클라이언트 릴리즈 정보를 가져올 수 없습니다. 기본 값을 사용합니다.');
    }
    
    // 게임 릴리즈 정보 가져오기
    const gameReleaseData = await fetchLatestRelease('game');
    
    if (gameReleaseData) {
        updateGameInfo(gameReleaseData);
        console.log('게임 릴리즈 정보 업데이트 완료:', gameReleaseData.tag_name);
    } else {
        console.warn('게임 릴리즈 정보를 가져올 수 없습니다. 기본 값을 사용합니다.');
    }
});
