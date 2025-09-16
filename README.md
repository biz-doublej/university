# 📘 설계서 v1 — "Timora AI" (실습실·강의실 자동배정 & 공실활용 플랫폼)

**작성자:** Gabriel (Full‑Stack)
**작성일:** 2025‑09‑15 (Asia/Seoul)
**버전:** v1.0

> "시간을 밝히는 AI, 캠퍼스를 효율적으로" — Timora AI
>
> 단일 AI 제품으로 다기관 판매/도입을 전제로 한 **멀티테넌트** 아키텍처, **제약기반 자동배정(OR‑Tools)**, **실시간 공실 분석 & 활용률 시각화**, **공실 기반 외부 대여 연동**, **설명가능 Co‑pilot**을 포함한 상용 설계서입니다.

---

## Timora의 핵심 목표 (우선 적용)

1. 실습실 및 실습센터 시간표 자동 배정 시스템 구축
2. 실시간 공실 분석 체계 및 활용률 시각화
3. 공실 기반 외부 대여 관리시스템 연동

---

## 1) 제품 비전 & USP

* **비전:** 대학교·연구소·기업 러닝센터의 공간/시간 운영을 "AI 우선"으로 전환하여 **배정 품질↑, 공실률↓, 운영비↓**.
* **핵심 가치(USP)**

  1. **도메인 제약 DSL**로 학과/기관별 규칙을 **코드 없이** 구성
  2. **설명가능 스케줄링**: 왜 이 방/시간인지 근거를 자연어+메트릭으로 제공(Co‑pilot)
  3. **즉시 수익화**: 공실을 외부 대여 가능 시간으로 자동 발행(구글/아웃룩 캘린더)
  4. **멀티테넌트/SaaS·온프레 동시 지원**으로 빠른 B2B 확장

---

## 2) 주요 사용자 & 대표 시나리오

* **교무·학사팀**: 학기 시작 전 대량 배정 실행 → 예외 수동 고정(잠금) → 재최적화
* **학과 조교**: 장비 점검으로 특정 실습실 블랙아웃 등록 → 영향 구간 자동 재배정
* **외부 대여 담당**: 공실 캘린더 공개·신청 승인 → 과금/정산(확장 옵션)
* **교수/강사**: 불가 시간/선호 패턴 제출 → 충돌 무위반 보장

---

## 3) 제품 범위 (Scope) / 비범위 (Non‑Goals)

* **Scope**: 자동배정, 공실 분석, 외부 대여 캘린더 발행, Co‑pilot, 멀티테넌트 관리, API/웹
* **Non‑Goals**: 결제 게이트웨이/스마트락 직접 제작(→ 커넥터로 연동), 종합 학사정보시스템 대체

---

## 4) 전체 아키텍처(개요)

```
[Sources] 학사DB/CSV/장비DB/캘린더 → [ETL] → [Core DB(PostgreSQL)]
                                         │
         [Optimizer Service (Python+OR‑Tools CP‑SAT)]
                     │        │
      [Policy/DSL 엔진]   [Explain/Co‑pilot(LLM)]
                     │        │
              [API Gateway (FastAPI)]
                     │
    [Admin Web(Next.js)]  [Public View(SSR 캐시)]  [Integrations]
                                              ↳ Google/Outlook Cal, SSO, Webhooks
```

* 메시징/비동기: **Redis/RQ**(MVP) → Kafka(스케일 업).
* 캐시/검색: Redis / OpenSearch(선택).
* 배포: Docker, Helm, k8s or 단일 VM(파일럿).

---

## 5) 단일 AI 코어 구성

### 5.1 Scheduler AI (제약기반 최적화)

* **Solver**: Google **OR‑Tools CP‑SAT**.
* **목표함수(가중합 최소화)**: 공실률, 강의실 이동, 비선호 시간 배치, 요일 편중, 장비 과부하.
* **하드 제약**: 중복배정 금지, 정원/설비 충족, 강사/코호트 중복 금지, 불가시간 차단.
* **워밍업 휴리스틱**: 큰 과목/제약 우선 그리디 → CP‑SAT warm start.

### 5.2 Policy/Constraint DSL

* 테넌트별 규칙을 선언형으로 정의:

```yaml
hard:
  - instructor_unavailable: true
  - capacity_ok: true
  - lab_required_matches: true
soft:
  vacancy_weight: 1.0
  move_weight: 0.8
  early_morning_penalty: 0.3
  lunch_block_protect: 0.5
exceptions:
  - { course: "NUR201", allow_overcap: 2 }   # 최대 2명 초과 허용(승인 필요)
```

* UI에서 YAML/폼 편집 → 정책 버전 관리, 롤백.

### 5.3 Explainability & Co‑pilot

* **LLM 어댑터**가 최적화 로그/제약 위반 후보/대안 솔루션을 요약.
* 예: "간호실습실 R401이 선택된 이유?" → 용량/장비/거리/충돌점수 근거를 자연어 설명.
* 자연어로 정책 변경: "점심 12:00‑13:00 가중치 올려" → DSL 수정 → 재최적화.

### 5.4 Forecasting (옵션)

* **수요 예측**: 과목별 수강 인원·실습실 점유율 ARIMA/XGBoost/Prophet로 추정 → 사전 정원/실 배정 가중치에 반영.

---

## 6) 데이터 모델(테넌트 인지)

* **tenants**(id, name, timezone, locale, plan, enabled)
* **users**(id, email, role, tenant\_id, sso\_subject)
* **rooms**(id, tenant\_id, name, type, capacity, features JSON, building, floor)
* **courses/sections**(…, tenant\_id, hours\_per\_week, cohort, needs\_lab, expected\_enrollment)
* **timeslots**(id, tenant\_id, day, start, end, granularity)
* **assignments**(…, status\[auto/locked/edited], reason, version)
* **policies**(tenant\_id, version, yaml, created\_by)
* **blackouts**, **calendars**, **audit\_logs**
* 파티셔닝: **tenant\_id 기준**. 대형 고객은 **전용 DB** 옵션.

---

## 7) 핵심 API (요약)

* `POST /v1/import/sections` CSV 업로드 → 검증 리포트
* `POST /v1/optimize` {policy\_version, week, solver?, slot\_group?, forbid\_checks?} → job\_id
* `GET /v1/optimize/{job_id}` → {status, score, explain}
* `GET /v1/timetable/rooms?week=YYYY-WW`
* `PATCH /v1/assignments/{id}` {room\_id,timeslot\_id,status}
* `GET /v1/vacancy/heatmap?week=YYYY-WW&building=`
  * 실시간 공실 비율 히트맵(요일/시간대별) — 테넌트/건물 필터 지원
* `GET /v1/vacancy/available?day=Mon&start=09:00&end=10:00&building=`
  * 외부 대여 연동용: 특정 구간에 이용 가능한 강의실 목록 반환
* `POST /v1/calendar/publish?room_id=` → {sharing\_url}
* Webhooks: `assignment.updated`, `calendar.published`

---

## 8) UX 핵심 화면

1. **배정 실행 패널**: 정책 선택, 가중치 슬라이더, ETA/진행률, 충돌 0 보장 배지
2. **캘린더 보드**: 드래그&드롭, 잠금, 충돌/경고 오버레이
3. **공실 대시보드**: 요일×시간 히트맵, 가동률, 건물/학과 필터
4. **Co‑pilot**: 질의→설명/정책 수정→재실행, 변경내역 요약

---

## 9) 보안 · 컴플라이언스

* **인증**: OIDC/OAuth2(학교 SSO), MFA 옵션.
* **권한(RBAC)**: Admin/Dept/Instructor/Viewer/External.
* **감사**: CRUD/정책변경/배정결과 스냅샷 저장.
* **개인정보**: 최소 수집 원칙, 과목/교수 식별자 비식별 공개 설정.
* **규정 고려**: 대한민국 **PIPA**, (교육기관 대상) 내부 규정/ISMS 대응, 데이터 처리 위탁 문서화.
* **멀티테넌트 격리**: 행단위 보안 + 커넥션 레벨 스키마 분리(플랜별).

---

## 10) 운영 비기능 요구사항

* **성능**: 300섹션/30실습실/주차 배정 → 2분 내 최초해, 20초 내 증분 재배정. 조회 P95 < 300ms.
* **가용성**: 99.9% (SaaS), RTO 4h/RPO 1h.
* **관측성**: 구조화 로그, 트레이싱(OTel), 메트릭(배정 점수, 공실률, 실패율).
* **국제화**: ko/ja/en, Asia/Seoul 기본.

---

## 11) 배포 모드 & 멀티테넌시

* **SaaS(기본)**: 단일 클러스터 다테넌트, S3/GCS 백업, Cloud KMS.
* **온프레/프라이빗**: 헬름 차트 제공, 에어갭 모드(LLM 어댑터 비활성 시 로컬 NLU fallback).
* **하이브리드**: 스케줄러 코어 온프레 + 캘린더 퍼블리싱 SaaS.

---

## 12) 통합 커넥터

* **캘린더**: Google Calendar, Microsoft 365/Outlook.
* **SSO**: Google Workspace, Azure AD, Keycloak.
* **학사/자산**: CSV(MVP) → REST/ODBC 어댑터.
* **IoT(옵션)**: 점유 센서/비콘 → 실시간 공실 검증.

---

## 13) 품질 측정 & 점수화

* **Feasibility**: 하드 제약 위반 0.
* **Efficiency**: (총 공실블록/총 블록)↓.
* **Stability**: 재배정 시 변경 최소화 점수.
* **Fairness**: 강사/코호트 시간대 편중 지표 편차↓.
* **Explaina-bility**: 질문‑응답 정확도/해결율.

---

## 14) 기술 스택

* **Backend**: Python 3.11, FastAPI, OR‑Tools, pydantic, SQLAlchemy 2.x
* **DB**: PostgreSQL 15(+ Timescale 옵션), Redis 7
* **Web**: Next.js 14, Tailwind, shadcn/ui, TanStack Query
* **MLOps(옵션)**: MLflow, DVC, Feast(특성 저장소)
* **DevOps**: Docker, Helm, ArgoCD/GitHub Actions, OpenTelemetry, Grafana/Loki/Tempo

---

## 15) 라이선싱 & 패키징(초안)

* **에디션**: Essentials(자동배정/대시보드), Pro(캘린더 발행/Co‑pilot), Enterprise(온프레/전용 DB/ISMS 지원)
* **가격**: 섹션/실습실 수 기준 티어 + 사용자 좌석 추가. 온프레는 연 구독 + 설치 비용.
* **백라벨**: 로고/도메인/테마 커스터마이징, "Powered by Timora AI" 옵션.

---

## Web Frontend (MVP)

- Stack: Next.js 14 + TypeScript, Tailwind CSS
- 위치: `web/`
- API Base: 기본 `http://localhost:8000` (`NEXT_PUBLIC_API_BASE`로 재정의 가능)
- 테넌트 헤더: 기본 `demo` (`NEXT_PUBLIC_TENANT_ID`로 재정의 가능)

### 실행 방법

1) 의존성 설치

```
cd web
npm install
```

2) 개발 서버 실행

```
npm run dev
```

3) 접속: http://localhost:3000

### 포함된 화면

- Home: 백엔드 `/healthz` 연동 상태 표시, Import 링크
- Import: `POST /v1/import/sections`에 CSV 업로드(필수 컬럼: `code,name,hours_per_week,expected_enrollment`)
- Dataset: 레포 루트 `data/` 내 첫 번째 XLSX/CSV를 파싱하여 표로 표시
- Scheduler: 데이터셋→DB Import, Solver 선택(greedy/PuLP/OR‑Tools 가용성 표시), 최적화 실행·결과 확인

### 환경 변수

- `NEXT_PUBLIC_API_BASE` (예: `http://localhost:8000`)
- `NEXT_PUBLIC_TENANT_ID` (기본 `demo`)

### API Key 발급/사용 (Timora AI)

- Admin 토큰 설정: 서버 환경변수 `ADMIN_TOKEN="<임의의 강한 토큰>"`
- 테넌트 생성:
  - `POST /v1/admin/tenants` (헤더 `X-Admin-Token`) → `{ id, name }`
- 프로젝트 생성:
  - `POST /v1/admin/projects` (헤더 `X-Admin-Token`) → `{ id, tenant_id }`
- API 키 발급:
  - `POST /v1/admin/projects/{project_id}/keys` (헤더 `X-Admin-Token`) → `{ api_key: "timora_<prefix>.<secret>" }`
  - 키는 발급 시 1회만 평문 노출됩니다. 서버에는 해시로 저장됩니다.
- API 호출 시 인증 헤더(둘 중 하나):
  - `X-API-Key: timora_<prefix>.<secret>`
  - `Authorization: Bearer timora_<prefix>.<secret>`
- 키에 연결된 테넌트가 자동으로 선택됩니다. `X-Tenant-ID`는 옵션(오버라이드 목적)입니다.

### 사용자 가입/로그인 기반 발급 (요금제 없음)

- 회원가입: `POST /v1/auth/signup` { email, password, tenant_name }
  - 신규 테넌트 생성 + 사용자(Admin) 생성 + 세션 토큰 반환
- 로그인: `POST /v1/auth/login` { email, password } → 세션 토큰 반환
- 내 정보: `GET /v1/auth/me` Authorization: Bearer tma.<payload>.<sig>
- 개발자 엔드포인트(사용자 테넌트 한정):
  - `POST /v1/dev/projects` { name } → 프로젝트 생성
  - `GET /v1/dev/projects` → 내 테넌트 프로젝트 목록
  - `POST /v1/dev/projects/{id}/keys` { name? } → API 키 발급(1회 노출)
  - `GET /v1/dev/projects/{id}/keys` → 키 목록
- 토큰 형식: 세션 토큰은 HMAC 서명된 tma.<payload>.<sig> (JWT 아님)
- 환경변수: `AUTH_SECRET`(세션 토큰 서명), `API_KEY_PEPPER`(API 키 해시)

### 데이터 파일 배치

- 경로: 레포 루트의 `data/` 폴더 (예: `data/kbu.xlsx`)
- 형식: `.xlsx`/`.xls`/`.csv` 중 하나. 여러 파일이 있을 경우 사전순 첫 파일을 사용.
- 페이지: `http://localhost:3000/dataset`
 - 스케줄러: `http://localhost:3000/scheduler`



## 16) 출시 로드맵 (MVP→GA)

* **M0–M1**: MVP(파일 업로드, 배정, 공실 히트맵, GCal 발행)
* **M2**: Co‑pilot, 정책 DSL UI, 멀티테넌트 관리
* **M3**: Outlook, 온프레 차트, 예측 모듈(옵션)
* **GA**: 보안 심사(ISMS 가이드), 레퍼런스 2기관 확보

---

## 17) 리스크 & 완화

* **입력 데이터 결측/오류** → 강건한 ETL/검증 리포트, 자동 정규화.
* **대규모 조합폭증** → 슬롯 그루핑, Warm start, 시간 제한 내 최적성 Gap 공개.
* **조직 변화 저항** → Co‑pilot 설명/시뮬레이션으로 투명성 확보.
* **캘린더 권한 이슈** → 최소권한 OAuth 범위, 토큰 로테이션.

---

## 18) 샘플 I/O

**sections.csv**

```
section_id,course_code,course_name,instructor,cohort,hours_per_week,needs_lab,expected_enrollment
SEC101,NUR201,기본간호실습,김가영,2‑A,4,true,28
```

**rooms.csv**

```
room_id,name,type,capacity,features
R401,간호실습실,lab,32,"[\"bed\",\"sink\"]"
```

**정책 YAML**: 위 5.2 예시 참조.

---

## 19) 오픈 이슈(결정 필요)

* 타임슬롯 **표준 길이**(50/90/110분 혼재 지원 범위), 요일 모델 통일
* 공실 공개시 **비식별 수준**(과목/강사명 마스킹 규칙)
* 파일럿 학과/건물 범위, KPI 기준선(현재 공실률/가동률)
* Co‑pilot LLM **호스팅 방식**(SaaS vs 온프레 라우팅)

---

## 20) 다음 액션

* 샘플 데이터 3종 수령 → 스키마 고정
* 정책 DSL v0 정의(하드/소프트/예외 프리셋)
* 최적화 엔진 PoC(실제 데이터 1주분) → 점수/설명 리포트
* 파일럿 기관 선정 및 일정 킥오프
