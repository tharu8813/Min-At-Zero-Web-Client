// GitHub API 설정
const GITHUB_REPO = 'tharu8813/Min-At-Zero-Clinet';
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;

// Notion API 설정 (사용자가 설정해야 함)
const NOTION_API_KEY = 'YOUR_NOTION_INTEGRATION_TOKEN'; // Notion Integration Token
const NOTION_DATABASE_ID = 'YOUR_DATABASE_ID'; // Notion Database ID

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

// 패치 노트 섹션 추가 함수 (클라이언트 패치노트)
function addPatchNotes(releaseData) {
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

// Markdown 형식의 패치 노트를 HTML로 변환
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

// Notion 데이터베이스에서 패치 노트 가져오기
async function fetchNotionPatchNotes() {
    // CORS 문제로 인해 브라우저에서 직접 호출 불가
    // 백엔드 서버가 필요하거나, Notion API를 프록시하는 서버리스 함수 필요
    // 여기서는 예시 코드만 제공
    
    try {
        // 실제로는 백엔드 API 엔드포인트를 호출해야 함
        // 예: const response = await fetch('/api/notion-patch-notes');
        
        const response = await fetch(`https://api.notion.com/v1/databases/${NOTION_DATABASE_ID}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_API_KEY}`,
                'Notion-Version': '2022-06-28',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sorts: [
                    {
                        property: '작성날짜', // Notion 데이터베이스의 날짜 속성 이름
                        direction: 'descending'
                    }
                ],
                page_size: 5 // 최근 5개만 가져오기
            })
        });
        
        if (!response.ok) {
            throw new Error('Notion API 호출 실패');
        }
        
        const data = await response.json();
        return data.results;
    } catch (error) {
        console.error('Notion API 오류:', error);
        return null;
    }
}

// Notion 패치 노트를 UI에 표시
function displayNotionPatchNotes(notionData) {
    if (!notionData || notionData.length === 0) return;
    
    const contentGrid = document.querySelector('.content-grid');
    
    // 기존 게임 패치 노트 제거
    const existingGamePatchNotes = document.getElementById('game-patch-notes-card');
    if (existingGamePatchNotes) {
        existingGamePatchNotes.remove();
    }
    
    // 게임 패치 노트 카드 생성
    const gamePatchNotesCard = document.createElement('div');
    gamePatchNotesCard.id = 'game-patch-notes-card';
    gamePatchNotesCard.className = 'card';
    gamePatchNotesCard.style.gridColumn = '1 / -1';
    
    let patchNotesHTML = '<h2>🎮 게임 패치 노트</h2>';
    patchNotesHTML += '<div class="game-patch-notes-list">';
    
    notionData.forEach((page, index) => {
        // Notion 속성에서 데이터 추출
        const title = page.properties['제목']?.title?.[0]?.plain_text || '제목 없음';
        const content = page.properties['내용']?.rich_text?.[0]?.plain_text || '';
        const date = page.properties['작성날짜']?.date?.start || '';
        
        const formattedDate = date ? new Date(date).toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        }) : '';
        
        patchNotesHTML += `
            <div class="patch-note-item" style="border-bottom: ${index < notionData.length - 1 ? '1px solid rgba(148, 163, 184, 0.1)' : 'none'}; padding: 20px 0;">
                <h3 style="font-size: 18px; color: #e5e7eb; margin-bottom: 8px;">${title}</h3>
                <div style="color: #94a3b8; font-size: 13px; margin-bottom: 12px;">${formattedDate}</div>
                <div style="color: #cbd5e1; line-height: 1.6; font-size: 14px; white-space: pre-wrap;">${content}</div>
            </div>
        `;
    });
    
    patchNotesHTML += '</div>';
    
    gamePatchNotesCard.innerHTML = patchNotesHTML;
    
    // 클라이언트 다운로드 카드 바로 위에 삽입
    const downloadCard = Array.from(document.querySelectorAll('.card')).find(card => 
        card.querySelector('h2')?.textContent.includes('클라이언트 다운로드')
    );
    
    if (downloadCard) {
        contentGrid.insertBefore(gamePatchNotesCard, downloadCard);
    } else {
        contentGrid.appendChild(gamePatchNotesCard);
    }
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
    
    // GitHub에서 최신 릴리즈 정보 가져오기
    const releaseData = await fetchLatestRelease();
    
    if (releaseData) {
        updateClientInfo(releaseData);
        console.log('릴리즈 정보 업데이트 완료:', releaseData.tag_name);
    } else {
        showErrorState();
        console.warn('릴리즈 정보를 가져올 수 없습니다. 기본 값을 사용합니다.');
    }
    
    // Notion에서 게임 패치 노트 가져오기 (선택적)
    // CORS 문제로 백엔드 API가 필요함
    // const notionData = await fetchNotionPatchNotes();
    // if (notionData) {
    //     displayNotionPatchNotes(notionData);
    //     console.log('Notion 패치 노트 업데이트 완료');
    // }
});
