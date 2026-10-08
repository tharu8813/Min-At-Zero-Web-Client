# 유지보수 가이드

## 변경 원칙

1. 공통 색상과 표면 스타일은 `asset/theme.css`에서 수정합니다.
2. 공통 레이아웃과 컴포넌트는 `asset/style.css`에서 수정합니다.
3. 헤더와 푸터는 각 페이지에 복사하지 않고 `asset/header.html`, `asset/footer.html`만 수정합니다.
4. 서버 주소, 저장소, Supabase와 효과 토글은 `asset/script.js` 상단의 `CONFIG`에서 관리합니다.
5. 페이지 데이터는 가능한 한 각 JSON 파일에서 관리하고 HTML에 중복 입력하지 않습니다.

## 작업 순서

```powershell
npm run check
npm run dev
```

변경 후에는 최소한 홈, 랭킹, 위키를 데스크톱과 768px 이하 화면에서 확인합니다. 브라우저 콘솔에 새 오류가 없어야 합니다.

## PWA 캐시

정적 파일을 추가하거나 이름을 바꾸면 `sw.js`의 `STATIC_ASSETS`에도 반영합니다. 배포 시 기존 사용자가 새 파일을 확실히 받도록 `CACHE_NAME` 버전을 올립니다.

## 외부 API

클라이언트 동작은 [클라이언트 소스 저장소](https://github.com/tharu8813/Min.-At.-Zero-Client-Storage)를 기준으로 확인합니다. 설치 파일과 자동 업데이트는 별도 [Min-At-Zero-Clinet 릴리스](https://github.com/tharu8813/Min-At-Zero-Clinet/releases)에서 제공됩니다. 저장소 이름의 `Clinet` 철자는 실제 주소이므로 `Client`로 바꾸면 다운로드가 끊깁니다.

`Program.cs`의 `matz-client://` 명령은 `start`, `login-info`, `replay`, `reset`, `uninstall`입니다. `setup.iss`는 관리자 권한으로 프로토콜을 등록하며 바탕화면 바로가기는 선택 사항입니다. `reset`은 앱 데이터의 `game` 폴더 전체를 삭제하므로 설정뿐 아니라 `replay_recordings`도 삭제됩니다. 설치·초기화 안내를 바꿀 때 이 동작을 함께 확인하세요.

- 브라우저에 포함해도 되는 publishable/anonymous 키만 사용합니다.
- Supabase Row Level Security는 읽기 전용으로 유지합니다.
- 외부 API 실패는 페이지 전체 중단 대신 오류 상태나 기존 캐시로 처리합니다.
- 외부 응답을 `innerHTML`에 넣을 때는 반드시 기존 이스케이프 또는 URL 검사 함수를 거칩니다.

## 알려진 구조적 부채

공통 모션과 홈 배치는 `asset/theme.css`에서 관리합니다. 페이지 이동은 브라우저의 View Transition을 지원할 때만 짧게 전환하며, 링크를 JavaScript 타이머로 지연시키지 않습니다. 모션 감소 설정에서는 자동 슬라이드와 숫자 애니메이션을 멈춥니다. FAQ 높이는 실제 콘텐츠 크기에 맞추므로 고정 최대 높이를 다시 추가하지 마세요. `npm run check`는 빠른 연속 클릭과 늦게 도착한 위키·랭킹 응답도 검사합니다.

`controls.html`, `developers.html`, `maps.html`, `ranking.html`, `serverinfo.html`, `wiki.html`에는 페이지 전용 CSS와 JavaScript가 아직 인라인으로 남아 있습니다. 기능 변경이 잦아질 경우 `asset/pages/<page>.css`와 `asset/pages/<page>.js`로 순차 분리하는 것이 다음 리팩터링 우선순위입니다. 한 번에 모두 옮기기보다 페이지별로 분리하고 `npm run check`와 화면 검증을 거치는 편이 안전합니다.
