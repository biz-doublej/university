# GCP Deployment Prep Checklist

이 문서는 Timora 백엔드/프론트엔드를 Google Cloud Platform으로 옮기기 전에 준비해야 할 작업을 빠르게 정리한 것입니다.

## 1. 컨테이너 & 배포 타겟
- **Container Registry**: Docker 이미지를 `Artifact Registry`에 push.
- **Runtime 선택**: Cloud Run(권장) 혹은 GKE. VM을 직접 관리할 경우 `Compute Engine + Managed Instance Group`.
- **CI/CD**: GitHub Actions → Cloud Build로 연동해 자동 배포 파이프라인 구성.

## 2. 데이터베이스 (Cloud SQL – MySQL)
- **엔진 버전**: MySQL 8.x.
- **커넥션 풀러**: Cloud SQL Proxy Sidecar 또는 `Cloud SQL Auth Proxy`.
- **SQLAlchemy URL**: `mysql+pymysql://user:pass@/db?unix_socket=/cloudsql/<INSTANCE-URI>` (Cloud Run 사용 시) 또는 `mysql+pymysql://user:pass@host:3306/db`.
- **마이그레이션**: Alembic 도입 권장. 현재 SQLite용 런타임 마이그레이션 코드는 MySQL에서 동작 보장이 낮으므로 Alembic으로 전환 준비.

## 3. Secret & Config 관리
- **Secret Manager**: `AUTH_SECRET`, `API_KEY_PEPPER`, DB 비밀번호 등을 저장.
- **Runtime Config**: Cloud Run 환경 변수 혹은 Secret Manager 참조.
- **.env 파일**: 로컬 개발 용도로 유지하되 프로덕션용은 사용하지 않음.

## 4. 스토리지 & 정적 자원
- **Cloud Storage**: 향후 업로드 파일/데이터셋 보관용 버킷 마련.
- **백업 전략**: Cloud SQL 자동 백업 + GCS export.

## 5. 네트워킹 & 보안
- **VPC**: Private Service Connect로 Cloud SQL Private IP 연결.
- **방화벽**: Cloud Armor 또는 LB 레벨.
- **도메인/SSL**: Cloud Load Balancer + Managed Certificate → Cloud Run/VM 연결.
- **IAM**: 최소 권한 원칙으로 서비스 계정 분리.

## 6. 로깅 & 모니터링
- **Cloud Logging/Monitoring**: Cloud Run과 Cloud SQL 기본 로그 활성화.
- **에러 추적**: Error Reporting + Stackdriver Trace.
- **알림**: Opsgenie/Slack 연동 고려.

## 7. 기타 준비 사항
- **시간대 설정**: Cloud Run은 UTC로 동작 → 앱 내 TZ(`Asia/Seoul`) 명시.
- **헬스 체크**: `/healthz` 엔드포인트 사용해 LB 체크 구성.
- **Redis/Cache 필요시**: Memorystore (Redis) 검토.
- **메일 전송**: 필요시 SendGrid 같은 외부 서비스 연동.

## 8. 해야 할 선행 작업
1. Alembic 기반 마이그레이션 스켈레톤 생성.
2. Docker 이미지 빌드 & 로컬 테스트 (`docker-compose`/`make docker-run` 등).
3. Cloud SQL용 사용자/권한 설계 (읽기/쓰기 분리 여부 포함).
4. GitHub Actions → Artifact Registry / Cloud Run 배포 워크플로우 초안 작성.
5. Secret Manager에 필요한 키 목록 정리.

이 항목들을 미리 준비하면 GCP 전환 시 시행착오를 크게 줄일 수 있습니다. 자세한 설정이 필요하면 언제든지 요청해주세요.
