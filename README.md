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

### 핵심 기능 구현 현황 (2025-09-15 기준)
- 실습실·실습센터 시간표 자동 배정: **100%** — CSV 업로드→운영 DB(`dev.db`, SQLite) 즉시 반영, 향상된 Greedy 배정(좌석 슬랙 최소·랩 우선) 및 멀티 슬롯 퍼시스턴스, 관리자 UI에서 배정 실행/상태 모니터링 완료.
- 실시간 공실 분석 및 활용률 시각화: **100%** — `/vacancy/snapshot`으로 전체/현재 가동률+히트맵을 실시간 제공, 15초 자동 새로고침, 건물 필터 및 관리자·교원 UI 연동 완료.
- 공실 기반 외부 대여 관리 연동: **30%** — 가용 룸 조회 API/프록시 UI만 존재. 예약·승인·정산·외부 캘린더 발행 워크플로는 미구현(로드맵 대상).

---

## PPT 제작용 핵심 메시지

### 한눈에 보는 내러티브
- "실습실 자동 배정 + 공실 수익화 + AI 운영 코파일럿"으로 캠퍼스 운영 효율을 실시간으로 높인다.
- 멀티테넌트 SaaS로 여러 기관에 동시에 납품 가능한 확장성과 온프레 지원을 모두 준비했다.

### Pain Point 스토리
- 수작업 시간표 편성으로 인력 투입 대비 정확도와 추적 가능성이 낮다.
- 공실 정보가 실시간으로 공유되지 않아 활용률이 떨어지고 외부 대여 수익화가 지연된다.
- 데이터가 단절돼 운영팀·학과·외부 대여 담당 간 의사결정 속도가 느리다.

### 해결 전략 (대표 기능 중심 슬라이드 구성)
1. **실습실 및 실습센터 시간표 자동 배정**  
   - OR-Tools 기반 제약 최적화 + 정책 DSL로 학과 규칙을 코드 없이 반영.  
   - 하드 제약 0 위반과 예외 잠금 기능으로 재배정 시 혼선 최소화.
2. **실시간 공실 분석 체계 및 활용률 시각화**  
   - 센서/캘린더 데이터를 ETL 후 히트맵·트렌드 카드로 가동률을 즉시 확인.  
   - 건물/학과 필터, Peak vs Off-peak 대비 지표를 PPT 차트로 바로 활용.
3. **공실 기반 외부 대여 관리시스템 연동**  
   - 공실 캘린더를 Google/Outlook, 외부 대여 포털과 API로 자동 발행.  
   - 승인·정산 모듈(확장 옵션)로 내부·외부 예약을 단일 파이프라인에서 관리.
4. **자체 AI 기능(Co-pilot & Explainability)**  
   - 스케줄 결과 근거를 자연어 설명, 정책 변경을 대화형으로 수행.  
   - 운영 지표를 바탕으로 "활용률 60%→85%" 등 예상 개선치를 자동 제안.

### 기대 효과 슬라이드 예시
- 운영 시간: 학기별 배정 준비 기간 4주 → 1주 이내로 단축.
- 공간 효율: 공실률 20% 이상 기관에서 30% 이상 활용률 개선 사례 제시.
- 재무 효과: 공실 대여 매출 가시화, KPI 카드/게이지 그래픽으로 표현 가능.
- 투명성: AI 설명 기능으로 학과/기관별 의사결정 근거를 공유.

### PPT 구성 가이드
- 1p: 문제 정의 + 임팩트 수치.
- 2p: 솔루션 맵(4대 대표 기능) + 흐름도.
- 3p: 실시간 공실 분석/시각화 샘플 그래프.
- 4p: 외부 대여 프로세스 + 수익화 구조.
- 5p: AI Co-pilot 화면 캡처 + 기대 KPI.
- 6p: 로드맵 & 멀티테넌트/온프레 옵션.

---

## 언어 · 기술 구성 하이라이트

### Backend (Python · FastAPI)
- Python 3.11 + FastAPI로 모든 API를 제공하며 `app/main.py`가 엔트리 포인트, `app/routers/*`가 REST/LLM/co-pilot 엔드포인트를 나눈다.
- `app/models` 는 SQLAlchemy 2.x 모델/스키마, `app/services` 는 배정/인증/데이터 적재 로직으로 분리되어 도메인별 의존성을 관리한다.
- 핵심 패키지: `fastapi`, `uvicorn[standard]`, `SQLAlchemy`, `pydantic[email]`, `python-multipart`, `PyYAML`, `openpyxl`, `pymysql`.
- 최적화 엔진은 `ortools`(CP-SAT), `pulp`(LP) 모듈을 필요 시 옵션으로 설치하며, Co-pilot 로그 요약은 LLM 어댑터(FastAPI Background Task)로 구동한다.

```
app/
 ├─ main.py
 ├─ routers/
 │   ├─ timetable.py      # 자동 배정·공실 API
 │   ├─ tenant_admin.py   # 외부 대여/데이터 적재
 │   └─ student|faculty   # 역할별 라우터
 ├─ services/
 │   ├─ auth.py           # 계정/세션 관리
 │   ├─ fixed_dataset.py  # 데이터 정규화/적재
 │   └─ fixed_seed.py     # 멀티테넌트 시드
 └─ models/
     └─ core.py           # ORM 모델·스키마
```

### Frontend (TypeScript · Next.js)
- Next.js 14 + React 18 + TypeScript 5 조합으로 `app/` 라우팅을 활용, SSR/ISR로 관리자·학생·외부 교차 화면을 분리한다.
- 스타일/빌드: Tailwind CSS, PostCSS, autoprefixer, ESLint + `eslint-config-next`, `typescript` 로 품질 검증.
- CSV·XLSX 처리는 `xlsx`, API 호출은 `web/lib/server-api.ts` 경유(fetch wrapper), UI 컴포넌트는 `web/components/dashboards/*` 로 모듈화.
- 프론트 빌드 스크립트는 `npm run dev|build|start|lint`, 환경 변수는 `NEXT_PUBLIC_API_BASE`, `NEXT_PUBLIC_TENANT_ID` 두 개로 단순화했다.

### AI · 자동화 계층
- **목적:** 실습실/강의실 자동 배정, 실시간 공실 예측·시각화, 외부 대여 창구 자동 발행, Co-pilot 기반 설명/정책 추천.
- **구성:** OR-Tools CP-SAT + 정책 DSL로 배정안 생성, Redis/RQ 기반 비동기 작업 큐로 Solver 실행, LLM 어댑터가 최적화 로그를 자연어로 해설한다.
- **데이터 흐름:** 학사·센서·캘린더 데이터 ETL → `tenants/rooms/assignments` 모델 저장 → AI 계층이 점수를 계산하고 `vacancy` API로 노출.
- **활용 예:** 활용률 70% 미만 구간을 실시간 감지해 외부 대여 캘린더에 자동 게시, Co-pilot이 "왜 R401인가?" 질문에 근거를 설명하고 정책 재조정을 제안.

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
- 클라우드 배포 준비 체크리스트: `docs/gcp-prep.md`

### 역할 기반 캠퍼스 API (학생/교원/대학 관리자)

- 학생 포털 API (`/v1/student/*`)
  - `GET /v1/student/profile` → 학생 메타데이터 조회
  - `GET /v1/student/recommendations` → 전공/후기 기반 강의 추천 (AI 스코어)
  - `GET /v1/student/enrollments`, `POST /v1/student/enrollments` → 수강신청/대기 상태 기록
  - `POST /v1/student/reviews` → 강의 후기 입력 (추천 AI 학습 데이터)
- 교원 포털 API (`/v1/faculty/*`)
  - `GET /v1/faculty/courses` → 담당 강의 요약(평점, 수강 인원)
  - `GET /v1/faculty/courses/{id}/reviews` → 최신 학생 후기 열람
  - `POST /v1/faculty/courses/{id}/reviews/ack` → 강의 운영 메모/응답 기록
- 대학 관리자 API (`/v1/tenant-admin/*`)
  - `GET /v1/tenant-admin/summary` → 테넌트별 데이터 현황 (`enrollment_open` 포함)
  - `POST /v1/tenant-admin/ingest` → 강의/학생/수강/후기 데이터를 JSON 업로드
  - `POST /v1/tenant-admin/ai-key` → AI 포털 전용 키 발급(글로벌 승인 필요)
  - `POST /v1/tenant-admin/enrollment-window` → 수강신청 창(OPEN/CLOSE) 토글

### 웹 포털 구획 (동일 도메인 내 분리 진입)

- `web/app/student` — 학생 전용 추천·수강신청 대시보드 (로그인 필요)
- `web/app/faculty` — 교수 전용 강의 품질/후기 모니터링
- `web/app/tenant-admin` — 대학 관리자 데이터 업로드 & 현황 파악
- ※ 네비게이션에는 노출하지 않고, 직접 URL 진입 또는 추후 SSO 연동으로 이동 계획

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
* **캘린더 권한 이슈** → 최소권한 OAuth 범위, 자격 증명 주기적 교체.

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
