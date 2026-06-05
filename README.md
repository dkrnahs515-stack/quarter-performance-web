# quarter-performance-web
실적 관리[README.md](https://github.com/user-attachments/files/28624405/README.md)

# 분기별 사업 실적 취합 시트 웹페이지

GitHub Pages에 올려 사용할 수 있는 정적 웹페이지입니다. 입력 데이터는 현재 브라우저의 localStorage에 저장되며, JSON 백업/불러오기와 CSV 내보내기를 지원합니다.

## 파일 구성

- `index.html` : 화면 구조
- `styles.css` : 디자인/인쇄 스타일
- `app.js` : 입력 저장, 검증, 요약, 내보내기 기능

## 주요 기능

1. 분기/연도 기준 실적 입력
2. 카테고리 표준 순서 자동 정렬
3. 필수값, 날짜, 분기 범위, 총인원 불일치, 중복 의심 자체 검증
4. 카테고리별 사업 수, 회기, 참여인원, 평균인원, 수입·지출 요약
5. CSV 내보내기, JSON 백업/복구
6. 요약표 인쇄

## GitHub Pages 배포

1. GitHub에서 새 Repository를 생성합니다.
2. `index.html`, `styles.css`, `app.js`를 루트 폴더에 업로드합니다.
3. Repository의 Settings → Pages → Deploy from a branch를 선택합니다.
4. Branch는 `main`, folder는 `/root`로 설정합니다.
5. 배포된 URL로 접속합니다.

## 운영상 주의

GitHub Pages만 사용하면 여러 담당자가 동시에 입력한 데이터가 자동으로 합쳐지지 않습니다. 여러 명이 동시에 입력하고 실시간으로 통합하려면 Firebase Firestore, Supabase, Google Apps Script 같은 저장소를 추가해야 합니다.
