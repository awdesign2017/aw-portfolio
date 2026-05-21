# aw-portfolio — Claude 컨텍스트

> 이 파일은 새 Claude 세션이 프로젝트 현황을 빠르게 파악할 수 있도록 작성된 인수인계서입니다.
> 상세 배포 절차는 [`deploy/README.md`](deploy/README.md), 변경 이력은 [`.claude/DEPLOYMENT.md`](.claude/DEPLOYMENT.md) 참고.

## 1. 프로젝트 개요

모노레포 풀스택 포트폴리오 / 지원서 시스템.

| 파트 | 위치 | 스택 |
|---|---|---|
| 백엔드 | `aw-portfoiio-api/` | Spring Boot 3.5.8, Java 17 (Corretto), JPA + QueryDSL, MySQL, Spring Security OAuth2 Resource Server (JWT), Apache POI |
| 프론트엔드 | `aw-portfoiio-front/` | Next.js 14.2.5, React 18, TypeScript, Recoil, react-hook-form + zod, Tailwind |
| 배포 스크립트 | `deploy/` | bash + ssh/rsync 기반 단계별 스크립트 |

**라우팅 규약 (변하지 않는 약속)**
- 백엔드 컨트롤러는 전부 `@RequestMapping("/api")` prefix
- 인증 엔드포인트: `/api/user-login`, `/api/admin-login`, `/api/refresh` (POST)
- 프론트는 axios `baseURL = process.env.NEXT_PUBLIC_API_BASE_URL`

## 2. 현재 인프라 (운영 중)

```
        ┌─────────────────────────────────────────────────────────────┐
        │  서버: stay-season-fetcher  ( 1.226.82.152 / Ubuntu 22.04 ) │
        │  로그인 유저: awdesign                                       │
        └─────────────────────────────────────────────────────────────┘
              │
              ├── nginx (80/443)
              │     ├── alwaysdesign-portfolio.com           ← 주 도메인
              │     ├── www.alwaysdesign-portfolio.com       ─┐
              │     └── portfolio.always-design.co.kr        ─┴── 301 → 주 도메인
              │
              ├── Spring Boot   :8080  (systemd: aw-portfolio-api)
              ├── Next.js       :3001  (pm2: aw-portfolio-front)
              ├── MySQL 8       :3307  (PORTFOLIO DB, admin@localhost)
              │
              └── 같이 운영 중인 다른 서비스 (건드리지 말 것)
                   ├── stay-season-fetcher pm2  :3000
                   ├── 카페24 MariaDB SSH 터널  :3306
                   └── nginx 사이트 fetcher.stay-season.com
```

**왜 이렇게 됐는지 — 주요 충돌 회피 결정**
- 3306 은 카페24 프로덕션 MariaDB SSH 포트포워딩이 점유 중 → 우리 MySQL 은 **3307** 로 격리 설치
- 3000 은 stay-season-fetcher pm2 가 점유 중 → 우리 Next.js 는 **3001**
- nginx 에는 다른 사이트가 함께 운영 중이라 `sites-enabled/default` 등을 **삭제하지 않음** (server_name 분리만)
- 부 도메인은 메인으로 **301 redirect** (cross-origin 인증 쿠키 손실 방지)

## 3. 파일/디렉토리 약속

| 경로 | 용도 |
|---|---|
| `/home/awdesign/repo/aw-portfolio/` | git checkout / 로컬 rsync 대상 |
| `/home/awdesign/spring-server/target/project.jar` | systemd 가 실행하는 jar |
| `/home/awdesign/nextjs-server/current/` | pm2 가 실행하는 .next + node_modules |
| `/home/awdesign/uploads/{portfolio,options,submission}/` | 업로드 파일 (S3 대체) |
| `/home/awdesign/logs/` | Spring 로그 |
| `/etc/aw-portfolio.env` | systemd EnvironmentFile (DB / 파일 경로) |
| `/etc/systemd/system/aw-portfolio-api.service` | systemd unit |
| `/etc/nginx/sites-available/alwaysdesign-portfolio.com` | nginx vhost |

**중요**: `/home/awdesign` 디렉토리는 `chmod o+x` 가 되어있어야 nginx(`www-data`) 가 `/files/*` 정적 파일을 서빙할 수 있음. 이 권한이 사라지면 이미지가 안 보임.

## 4. 환경변수 (`/etc/aw-portfolio.env`)

```
DB_URL=127.0.0.1
DB_PORT=3307
DB_USERNAME=admin
DB_PASSWORD=***REMOVED***
FILE_STORAGE_LOCATION=/home/awdesign/uploads
FILE_STORAGE_BASE_URL=https://alwaysdesign-portfolio.com/files
```

`application-real.yml` 의 `${FILE_STORAGE_*:default}` 형태로 주입.

## 5. 마이그레이션 히스토리 (중요)

원래 AWS (EC2 + RDS + S3) 에서 운영되던 사이트를 자체 호스팅으로 이전했습니다.

| 항목 | 기존 (deprecated) | 현재 |
|---|---|---|
| 호스팅 | AWS EC2 `portfolio-server` (16.184.61.4) | stay-season-fetcher (1.226.82.152) |
| DB | AWS RDS MySQL | 같은 서버 MySQL 8 :3307 |
| 파일 | S3 `portfolio-always-files` | 로컬 `/home/awdesign/uploads/` |
| 백엔드 실행 | `nohup java -jar &` | systemd (`aw-portfolio-api.service`) |
| 배포 자동화 | GitHub Actions | `./deploy/04_deploy_app_local.sh` (rsync) 또는 서버 `git pull` |

### S3 → 로컬 디스크 전환 시 적용한 코드 변경

`utils/S3FileUtils.java` — **클래스명과 public 메서드 시그니처는 유지**하고 내부 구현만 로컬 IO 로 교체했습니다 (호출자 7개 파일 변경 0건):
- `storeFile/storeFiles` → `Files.copy` 로 디스크에 저장
- `deleteFile` → `Files.deleteIfExists`
- `createPresignedUrl(key)` → `https://alwaysdesign-portfolio.com/files/{key}` 정적 URL 반환
- `getFileNameFromUrl` → 새 URL `/files/` prefix + 옛 S3 URL 둘 다 파싱 가능

기타:
- `excel/controller/ExcelController.java` — `S3Client` 의존성 제거, 로컬 파일 스트리밍
- `config/S3Config.java` — 빈 클래스로 비움
- `build.gradle` — `spring-cloud-aws-starter-s3` 제거
- `application.yml`, `application-real.yml` — AWS 섹션 제거, `file.storage.*` 추가
- `aw-portfoiio-front/package.json` — `"start": "next start -p 3001 -H 127.0.0.1"` (3000→3001)

### 데이터 마이그레이션

DB 의 파일 URL 컬럼은 다음 세 곳:
- `COMMON_FILE.COMMON_FILE_URL`
- `PORTFOLIO.PORTFOLIO_THUMBNAIL`
- `OPTIONS.OPTIONS_THUMBNAIL`

`SUBMISSION.SUBMISSION_JSON` 은 API 응답 시 동적 주입이라 마이그레이션 불필요.

URL 변환 흐름:
```
S3 (https://portfolio-always-files.s3.ap-northeast-2.amazonaws.com/...)
 → 1차: https://alwaysdesign-portfolio.com/files/... (deploy/03_restore_to_new_server.sh)
 → (한때 portfolio.always-design.co.kr 로 잠시 바꿨다가 다시 alwaysdesign-portfolio.com 로 복귀)
```

## 6. 배포 / 운영 명령

### 첫 배포 (이미 완료됨)
1. `./01_extract_from_old_server.sh` — 기존 서버에서 RDS dump + S3 sync
2. `./02_setup_new_server.sh` — 패키지 / 디렉토리 / MySQL 사용자 셋업
3. `./99_fix_mysql.sh` — (필요 시) MySQL 3307 격리 재설치
4. `./03_restore_to_new_server.sh` — DB import + 파일 rsync + URL 변환
5. `./04_deploy_app_local.sh` — 로컬 코드 rsync + 빌드 + systemd/pm2/nginx
6. `./05_finalize_ssl_dns.sh` — Let's Encrypt 발급 (세 도메인 한 인증서)
7. `./99_apply_nginx.sh` — (필요 시) nginx 만 빠르게 갱신

### 재배포 (운영 시)

**git push 권한 있을 때** — 서버 내부에서:
```bash
ssh stay-season-fetcher
bash /home/awdesign/repo/aw-portfolio/deploy/deploy-backend.sh
bash /home/awdesign/repo/aw-portfolio/deploy/deploy-frontend.sh
```

**git push 권한 없을 때** — 로컬 맥에서:
```bash
cd /Users/hpark16/study/aw-portfolio/deploy
./04_deploy_app_local.sh
```

### 로그 / 상태
```bash
sudo journalctl -u aw-portfolio-api -f       # 백엔드
tail -f /home/awdesign/logs/spring.log         # 백엔드 logback
pm2 logs aw-portfolio-front                    # 프론트
sudo tail -f /var/log/nginx/{access,error}.log
sudo systemctl status aw-portfolio-api
pm2 status
```

## 7. 알아두어야 할 함정

1. **이미지가 안 보이면** → `/home/awdesign` 의 `o+x` 권한 확인. `sudo chmod o+x /home/awdesign` 한 방으로 복구.
2. **MySQL 3306 충돌** → 우리 MySQL 은 **3307**. 3306 은 카페24 SSH 터널 (절대 죽이지 말 것).
3. **next-server 라는 pm2 이름은 쓰지 말 것** — 옛날에 errored 상태로 남았던 잔재. 우리 건 `aw-portfolio-front`.
4. **nginx default 사이트를 지우지 말 것** — `fetcher.stay-season.com` 등 다른 사이트도 같은 서버 운영 중.
5. **부 도메인 (www, portfolio.always-design.co.kr) 으로 접속하면 메인으로 redirect** — 직접 서비스하면 cross-origin 인증 쿠키 손실로 alert 3번 (`등록된 타입이 존재하지 않습니다`).
6. **AWS 자격 증명**: backend.env 의 `AWS_*` 변수는 더이상 사용 안 함. AWS 계정도 곧 삭제 예정 (현재는 deprecate).

## 8. 도메인 / SSL

- 메인: `alwaysdesign-portfolio.com`
- 부: `www.alwaysdesign-portfolio.com`, `portfolio.always-design.co.kr` → 301 redirect
- Let's Encrypt 인증서 1개에 세 도메인 모두 포함 (`/etc/letsencrypt/live/portfolio.always-design.co.kr/`)
- 갱신: `certbot.timer` 가 자동 처리

## 9. 백업 권장 (아직 미설정)

```bash
# /etc/cron.d/aw-portfolio-backup
0 3 * * * awdesign mysqldump -uadmin -p'***REMOVED***' -h127.0.0.1 -P3307 PORTFOLIO | gzip > /home/awdesign/backup/portfolio_$(date +\%F).sql.gz
0 4 * * * awdesign rsync -a --delete /home/awdesign/uploads/ /외부백업경로/uploads/
```

## 10. SSH 별칭 (사용자 맥북 `~/.ssh/config`)
- `portfolio-server` → 기존 AWS EC2 (deprecate 예정)
- `stay-season-fetcher` → 새 서버 1.226.82.152 (운영 중)
