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

- 브라우저에 포함해도 되는 publishable/anonymous 키만 사용합니다.
- Supabase Row Level Security는 읽기 전용으로 유지합니다.
- 외부 API 실패는 페이지 전체 중단 대신 오류 상태나 기존 캐시로 처리합니다.
- 외부 응답을 `innerHTML`에 넣을 때는 반드시 기존 이스케이프 또는 URL 검사 함수를 거칩니다.

## 알려진 구조적 부채

`controls.html`, `developers.html`, `maps.html`, `ranking.html`, `serverinfo.html`, `wiki.html`에는 페이지 전용 CSS와 JavaScript가 아직 인라인으로 남아 있습니다. 기능 변경이 잦아질 경우 `asset/pages/<page>.css`와 `asset/pages/<page>.js`로 순차 분리하는 것이 다음 리팩터링 우선순위입니다. 한 번에 모두 옮기기보다 페이지별로 분리하고 `npm run check`와 화면 검증을 거치는 편이 안전합니다.
