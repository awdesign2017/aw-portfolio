# 배포 히스토리 (AWS → 자체호스팅)

> 이 문서는 2026-04-28 ~ 2026-04-29 양일에 걸쳐 진행된 마이그레이션의
> 실제 시행 과정 / 시행착오 / 최종 해결책을 기록합니다.
> 향후 동일 환경에서 재작업하거나, 문제 발생 시 참고용.

## 단계별 진행

### Phase 1 — 기존 서버에서 데이터 추출
- **스크립트**: `deploy/01_extract_from_old_server.sh`
- 기존 EC2 (`portfolio-server`, 16.184.61.4) 에 `mysql-client` 가 없어서 스크립트 안에 자동 설치 단계 추가.
- RDS 덤프 → 로컬 `_migration/portfolio_<date>.sql`
- S3 sync → 로컬 `_migration/uploads/` (총 236 파일)

### Phase 2 — 새 서버 셋업
- **스크립트**: `deploy/02_setup_new_server.sh`
- JDK 17 (Corretto), Node 20, pm2, nginx, certbot 설치 OK
- MySQL 8 설치는 **port 3306 충돌**로 post-install 실패 → 별도 fix 스크립트로 분리 처리

### Phase 2.5 — MySQL 3307 격리 설치 ⚠️
- **스크립트**: `deploy/99_fix_mysql.sh`
- **원인**: 같은 서버에 카페24 프로덕션 MariaDB SSH 포트포워딩(`ssh -L 3306:...`)이 이미 3306 점유 중
- **해결책**:
  1. 깨진 mysql-server 패키지 완전 purge
  2. `mysql-common` 만 먼저 설치 (`/etc/mysql/conf.d/` 디렉토리 생성)
  3. **`/etc/mysql/conf.d/zz-aw-portfolio.cnf` 에 `port=3307` 사전 배치** (`zz-` prefix로 우선순위)
  4. `mysql-server` 설치 → post-install 의 첫 mysqld 기동부터 3307 로 바인드
  5. 잔재 정리: 옛 `/usr/sbin/policy-rc.d`, mysql 런타임 디렉토리 권한, AppArmor reload
  6. `PORTFOLIO` DB + `admin@localhost` 사용자 생성

### Phase 3 — 데이터 복원
- **스크립트**: `deploy/03_restore_to_new_server.sh`
- DB 덤프 import (3307 포트)
- 파일 rsync (1.1GB)
- S3 URL → 로컬 URL 일괄 변환 (`COMMON_FILE`, `PORTFOLIO`, `OPTIONS` 세 테이블)
- 결과: 224 + 22 + 32 행 변환

### Phase 4 — 애플리케이션 배포 ⚠️
- **스크립트**: `deploy/04_deploy_app_local.sh` (git push 권한 없어서 로컬 rsync 모드 사용)
- **함정 1**: 사용자 환경이 `ubuntu` 가 아니라 `awdesign` → 모든 `/home/ubuntu/` 경로를 `/home/awdesign/` 로 일괄 sed 치환
- **함정 2**: 같은 서버에 `stay-season-fetcher` pm2 가 :3000 점유 → 우리 Next.js 는 :3001 로 (`package.json` 의 `"start"` 수정)
- **함정 3**: pm2 이름 `next-server` 가 errored 상태로 잔재 → 우리는 `aw-portfolio-front` 로 분리
- **함정 4**: nginx default 사이트가 이미 없음 + 다른 사이트 운영 중 → `rm -f sites-enabled/default` 단계 제거
- backend.env 작성 → `/etc/aw-portfolio.env` 로 install (mode 600)
- systemd unit 등록 → `aw-portfolio-api.service` (User=awdesign)

### Phase 5 — SSL 발급 ⚠️
- **스크립트**: `deploy/05_finalize_ssl_dns.sh`
- **첫 시도 실패**: 옛 nginx 사이트 `alwaysdesign-portfolio.com` 가 sites-enabled 에 남아있어 `nextjs_upstream` 중복 정의 → `nginx -t` 실패 → certbot 도 fail
- **해결**: 옛 사이트 제거 후 재발급
- 세 도메인 (`alwaysdesign-portfolio.com`, `www.`, `portfolio.always-design.co.kr`) 한 인증서로 발급 (`--expand`)

### Phase 6 — 도메인 통합 + redirect ⚠️
- **상황**: 도메인을 처음에 `portfolio.always-design.co.kr` 로 잡고 가다가, 운영 측이 `alwaysdesign-portfolio.com` 을 주 도메인으로 정함.
- **변경**: 코드/설정/DB 모두 `alwaysdesign-portfolio.com` 으로 재통일
- **부 도메인 처리**: `www.` 와 `portfolio.always-design.co.kr` 로 들어와도 같은 콘텐츠 보이게 했더니 cross-origin 으로 JWT 쿠키 못 따라가서 alert 3번 표시 (`등록된 타입이 존재하지 않습니다`)
- **해결**: 부 도메인은 메인으로 **301 redirect** (스크립트: `99_apply_nginx.sh`, nginx conf 에 server block 2개로 분리)

### Phase 7 — 이미지 안 보임 문제 ⚠️
- **증상**: 페이지는 떴는데 썸네일이 모두 회색 박스
- **원인**: `/home/awdesign` 디렉토리 권한이 `drwxr-x---` 라 nginx (`www-data`) 가 디렉토리 traverse 불가 → `/files/*` 403
- **해결**: `sudo chmod o+x /home/awdesign` 한 줄. (04_local 스크립트 [7] 단계에도 포함되도록 추가)

## 자주 쓰는 추가 fix 스크립트

| 파일 | 용도 |
|---|---|
| `deploy/99_fix_mysql.sh` | MySQL 3307 격리 (재)설치 |
| `deploy/99_diag_mysql.sh` | MySQL 설치 상태 진단 |
| `deploy/99_update_db_domain.sh` | DB 안 URL 도메인 일괄 변경 |
| `deploy/99_apply_nginx.sh` | nginx 만 빠르게 적용 (빌드 없이) |

## 검증 명령 모음

```bash
# DNS
for d in alwaysdesign-portfolio.com www.alwaysdesign-portfolio.com portfolio.always-design.co.kr; do
  echo "$d -> $(dig +short $d)"
done

# 도메인별 HTTP 응답
curl -sI https://alwaysdesign-portfolio.com/ | head -3        # 200
curl -sI https://www.alwaysdesign-portfolio.com/ | head -3     # 301 → 메인
curl -sI https://portfolio.always-design.co.kr/ | head -3      # 301 → 메인

# 이미지
curl -sI https://alwaysdesign-portfolio.com/files/portfolio/<uuid>.png | head -3   # 200

# 백엔드
curl -sI https://alwaysdesign-portfolio.com/api/portfolios/all | head -3

# 서버 내부
ssh stay-season-fetcher 'sudo systemctl status aw-portfolio-api --no-pager | head -10'
ssh stay-season-fetcher 'pm2 status'
ssh stay-season-fetcher 'sudo ss -tnlp | grep -E ":3001|:3307|:8080"'

# DB
ssh -t stay-season-fetcher "mysql -uadmin -p -h127.0.0.1 -P3307 PORTFOLIO -e 'SHOW TABLES;'"
```

## 미해결 / 남은 작업

- [ ] 어드민 로그인 / 새 파일 업로드 / 한글 파일명 다운로드 — 사용자 측 기능 테스트 진행 중
- [ ] DB / 업로드 백업 cron 설정
- [ ] git push 권한 받은 뒤 GitHub Actions 또는 `deploy-backend.sh` 기반 자동화로 전환
- [ ] 1~2주 안정 확인 후 AWS 계정 (EC2/RDS/S3) 정리
- [ ] backend.env / DB 비밀번호 회전 (현재 `1011gkgl!` 평문, 다수 위치에 노출됨)
