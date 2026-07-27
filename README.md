# 터잡앙 — 공급자용 MVP

> “빈집을 살펴보고, 제주에 터잡앙” — AI 기반 청년농 맞춤 빈집 분석·비교 서비스 (공급자용)

소유자·공인중개사·지자체가 제주 농촌 빈집을 표준화된 형식으로 등록하고, AI 사진 사전분석 결과를 사람이 검토한 뒤
수요자에게 공개하는 공급자 사이드 MVP입니다. **모든 데모 데이터는 시연용 가상 정보이며 실제 거래·중개 서비스가 아닙니다.**

## 실행 방법

```bash
npm install
npm run dev        # 개발 서버 (http://localhost:5173)
npm test           # vitest 단위 테스트
npm run lint       # eslint
npm run build      # 타입체크 + 프로덕션 빌드
```

## 기술 스택

React 19 · TypeScript · Vite · Tailwind CSS 4 · React Router 7 · lucide-react · Vitest

## 주요 화면

| 경로 | 내용 |
|---|---|
| `/supplier` | 공급자 유형 선택 (소유자 / 공인중개사 / 지자체·기관) |
| `/supplier/dashboard` | 상태별 현황, 최근 등록·방문 신청, 보완 필요 매물 |
| `/supplier/listings` | 매물 목록 — 필터·검색·공개 전환·보관·복제·JSON 내보내기 |
| `/supplier/listings/new` | 6단계 등록 폼 (동의 → 기본 → 거래 → 영농 → 생활 → 사진), 자동 저장 |
| `/supplier/listings/:id/analysis` | AI 사전분석(Mock) 실행 · 결과 검토·수정 · 예상 수리비 · 현장 확인 항목 |
| `/supplier/listings/:id/preview` | 수요자 화면 미리보기 + 공개 전 체크리스트 + 공개 |
| `/supplier/visits` , `/supplier/visits/:id` | 방문 신청 목록·상세 — 확정·대체 일정·거절(사유)·완료 |
| `/consumer` | 수요자 화면(간이) — 공개 매물만 표시, JSON 가져오기 |

## 구조

- `src/types` — 공유 타입 (`HouseListing`, `PublicListing`, `VisitRequest` 등)
- `src/data` — 상수·라벨·수리 단가표·데모 데이터
- `src/providers/photo-analysis` — `PhotoAnalysisProvider` 인터페이스 + Mock/Api Provider, 응답 스키마 검증
- `src/services` — 사진 완성도·검증 / 수리비 계산 / 공개 조건 / 민감정보 제거·검사
- `src/repositories` — localStorage 접근 (`teojabang:*:v1` 키), 감사기록·이벤트 로그
- `src/pages`, `src/components` — 화면
- `src/tests` — 서비스·저장소 단위 테스트 44개

## 데이터·연동 원칙

- 백엔드 없이 localStorage로 동작. 사진은 원본 대신 축소본만 저장(용량 초과 시 안내).
- 공개된 매물만 수요자 화면에 노출되며, 소유자 연락처·동의 증빙·상세주소 등 민감정보는
  `src/services/privacy.ts`에서 제거·검사 후 내보내집니다.
- AI 분석은 외부 API 미연결 시 Mock Provider가 '데모 분석' 결과를 반환하며, 실제 하자를 단정하는
  표현을 사용하지 않습니다. 실제 API 연결 시 서버 프록시를 경유해야 합니다(API 키를 브라우저에 두지 않음).
