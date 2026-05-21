# aw-portfolio 배포 가이드

기존 AWS(EC2 + RDS + S3) → **자체 호스팅 서버** (`stay-season-fetcher` / 1.226.82.152) 로 이전 완료.
이 디렉토리에는 마이그레이션·운영에 사용하는 모든 스크립트와 설정 파일이 들어있습니다.

> 프로젝트 전반의 컨텍스트는 [`/CLAUDE.md`](../CLAUDE.md), 단계별 시행 기록은
> [`/.claude/DEPLOYMENT.md`](../.claude/DEPLOYMENT.md) 를 참고하세요.

## 현재 운영 상태 (요약)

| 항목 | 값 |
|---|---|
| 서버 | `stay-season-fetcher` (1.226.82.152, Ubuntu 22.04, user=`awdesign`) |
| 주 도메인 | `https://alwaysdesign-portfolio.com` |
| 부 도메인 (redirect) | `www.alwaysdesign-portfolio.com`, `portfolio.always-design.co.kr` |
| 백엔드 | Spring Boot 3.5.8 / Java 17 — systemd `aw-portfolio-api` (:8080) |
| 프론트엔드 | Next.js 14.2.5 — pm2 `aw-portfolio-front` (:3001) |
| DB | MySQL 8 (:3307, 격리 설치) — `PORTFOLIO` 스키마 / `admin@localhost` |
| 파일 저장 | 로컬 디스크 `/home/awdesign/uploads/{portfolio,options,submission}/` |
| nginx | 80/443, vhost `alwaysdesign-portfolio.com` (메인 + redirect server block 2개) |
| SSL | Let's Encrypt, 세 도메인 한 인증서, `certbot.timer` 자동 갱신 |

## 같은 서버에 함께 운영 중인 다른 서비스 (절대 건드리지 말 것)
- pm2 프로세스 `stay-season-fetcher` (:3000)
- nginx 사이트 `fetcher.stay-season.com`
- 카페24 프로덕션 MariaDB SSH 포트포워딩 (:3306)

→ 그래서 우리 MySQL 은 3307, Next.js 는 3001, nginx `default` 는 손대지 않음.

## 디렉토리 / 파일 구조

```
deploy/
├─ README.md                       ← 이 문서
├─ 01_extract_from_old_server.sh   ← 기존 RDS dump + S3 sync
├─ 02_setup_new_server.sh          ← 패키지 / 디렉토리 / MySQL 셋업
├─ 03_restore_to_new_server.sh     ← DB import + 파일 rsync + URL 변환
├─ 04_deploy_app.sh                ← git clone 기반 배포 (push 권한 필요)
├─ 04_deploy_app_local.sh          ← 로컬 rsync 기반 배포 (push 권한 없을 때 ← 현재 사용)
├─ 05_finalize_ssl_dns.sh          ← Let's Encrypt SSL 발급
│
├─ aw-portfolio-api.service        ← systemd unit
├─ backend.env                     ← /etc/aw-portfolio.env 로 install (mode 600)
├─ nginx-alwaysdesign-portfolio.conf  ← nginx vhost (메인 + redirect server block)
│
├─ deploy-backend.sh               ← 서버 내부에서 git pull 후 백엔드만 재배포
├─ deploy-frontend.sh              ← 서버 내부에서 git pull 후 프론트만 재배포
│
├─ 99_fix_mysql.sh                 ← MySQL 3307 격리 (재)설치
├─ 99_diag_mysql.sh                ← MySQL 상태 진단
├─ 99_update_db_domain.sh          ← DB 안 URL 도메인 일괄 변경
└─ 99_apply_nginx.sh               ← nginx conf 만 빠르게 적용 (빌드 없이)
```

## 사전 준비 (로컬 맥북)

```bash
brew install awscli rsync   # awscli 는 S3 백업이 필요할 때만

# ~/.ssh/config 에 두 alias 가 있어야 함
#   Host portfolio-server      → 기존 AWS EC2 (16.184.61.4)  (deprecate 예정)
#   Host stay-season-fetcher   → 새 서버 (1.226.82.152)
ssh stay-season-fetcher 'echo OK'
```

## 첫 배포 (이미 완료된 시퀀스)

```bash
cd deploy
chmod +x *.sh

./01_extract_from_old_server.sh    # 1. 기존 서버에서 데이터 추출
./02_setup_new_server.sh           # 2. 새 서버 패키지/디렉토리 셋업
./99_fix_mysql.sh                  #    (MySQL 설치 실패 시) 3307 격리 재설치
./03_restore_to_new_server.sh      # 3. DB import + 파일 rsync + URL 변환
./04_deploy_app_local.sh           # 4. 코드 rsync + 빌드 + systemd/pm2/nginx
                                   #    (또는 push 권한 있으면 ./04_deploy_app.sh)
# DNS A 레코드 alwaysdesign-portfolio.com / www. / portfolio.always-design.co.kr
# 모두 1.226.82.152 로 변경 + 전파 확인 후
./05_finalize_ssl_dns.sh           # 5. Let's Encrypt SSL 발급
./99_apply_nginx.sh                # 6. (필요 시) nginx 만 갱신
```

## 운영 — 재배포

### 옵션 A. 서버 안에서 git pull 기반 (push 권한 받은 후 권장)
```bash
ssh stay-season-fetcher
bash /home/awdesign/repo/aw-portfolio/deploy/deploy-backend.sh
bash /home/awdesign/repo/aw-portfolio/deploy/deploy-frontend.sh
```

### 옵션 B. 로컬에서 rsync 기반 (현재 사용 중)
```bash
cd /Users/hpark16/study/aw-portfolio/deploy
./04_deploy_app_local.sh
```

스크립트 끝에 `[7/7] /home/awdesign chmod o+x` 까지 포함되어 있어서 권한 회귀도 자동 보정.

### nginx 만 빠르게 적용 (vhost / redirect 수정)
```bash
./99_apply_nginx.sh
```

## 운영 — 로그 / 상태

```bash
# 백엔드
sudo journalctl -u aw-portfolio-api -f
tail -f /home/awdesign/logs/spring.log

# 프론트
pm2 logs aw-portfolio-front
pm2 status

# nginx
sudo tail -f /var/log/nginx/{access,error}.log

# 서비스 제어
sudo systemctl {start|stop|restart|status} aw-portfolio-api
pm2 {restart|stop} aw-portfolio-front
sudo systemctl reload nginx
```

## 검증 명령

```bash
# DNS — 세 줄 모두 1.226.82.152
for d in alwaysdesign-portfolio.com www.alwaysdesign-portfolio.com portfolio.always-design.co.kr; do
  echo "$d -> $(dig +short $d)"
done

# 메인 / 부 도메인 / API / 정적 파일
curl -sI https://alwaysdesign-portfolio.com/                                 # 200
curl -sI https://www.alwaysdesign-portfolio.com/                              # 301 → 메인
curl -sI https://portfolio.always-design.co.kr/                                # 301 → 메인
curl -sI https://alwaysdesign-portfolio.com/api/portfolios/all                 # 200
curl -sI https://alwaysdesign-portfolio.com/files/portfolio/<uuid>.png         # 200
```

## 트러블슈팅

| 증상 | 원인 / 조치 |
|---|---|
| 이미지가 모두 회색 박스 | `/home/awdesign` 권한이 `drwxr-x---` 이면 nginx 가 traverse 불가. `sudo chmod o+x /home/awdesign` |
| `502 Bad Gateway` (백엔드) | `sudo systemctl status aw-portfolio-api` + `journalctl -u aw-portfolio-api -n 100` 으로 부팅 실패 확인. 대부분 DB 연결 또는 env 누락 |
| `502 Bad Gateway` (프론트) | `pm2 logs aw-portfolio-front` 확인. 빌드 실패 또는 `-p 3001` 충돌 |
| `nginx -t` `duplicate upstream` | sites-enabled 에 우리 vhost 가 두 번 등록됨. `04_deploy_app_local.sh` 의 [7] 단계가 옛 파일 자동 제거 |
| MySQL 연결 실패 | `mysql -uadmin -p'***REMOVED***' -h127.0.0.1 -P3307` 로 접속 테스트. `/etc/aw-portfolio.env` 의 `DB_PORT=3307` 확인 |
| 부 도메인 페이지에서 `등록된 타입이 존재하지 않습니다` alert 3번 | 부 도메인이 메인으로 redirect 되지 않은 상태. `./99_apply_nginx.sh` 재실행 |
| Let's Encrypt 발급 실패 | 80 포트 인터넷 접근 가능 여부 + DNS 가 1.226.82.152 가리키는지 확인 |
| 한글 파일명 깨짐 | `SHOW VARIABLES LIKE 'character_set%';` 모두 utf8mb4 여야 함 |

## 보안 / 백업 권장

```bash
# /etc/cron.d/aw-portfolio-backup (예시)
0 3 * * * awdesign mysqldump -uadmin -p'***REMOVED***' -h127.0.0.1 -P3307 PORTFOLIO | gzip > /home/awdesign/backup/portfolio_$(date +\%F).sql.gz && find /home/awdesign/backup -name 'portfolio_*.sql.gz' -mtime +14 -delete
0 4 * * * awdesign rsync -a --delete /home/awdesign/uploads/ /외부백업경로/uploads/
```

- DB 비밀번호 (`1011gkgl!`) 는 평문이 여러 위치에 있음 — 이전 안정화 후 회전 권장.
- `/etc/aw-portfolio.env` 는 mode 600 (root + awdesign 만 읽기).

## Private repo 인증 (필요할 때만)

repo URL: `https://github.com/awdesign2017/aw-portfolio` — 현재 public.
private 으로 전환되면 새 서버에서 인증 필요:

```bash
# 서버에서 deploy key 발급
ssh-keygen -t ed25519 -C "stay-season-fetcher" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub   # → GitHub Settings → Deploy keys 에 등록

# SSH URL 로 04 재실행
GIT_REPO=git@github.com:awdesign2017/aw-portfolio.git ./04_deploy_app.sh
```

## 컷오버 후 정리 체크리스트

- [x] `https://alwaysdesign-portfolio.com/` 정상 응답
- [x] 부 도메인 → 메인 redirect 동작
- [x] 썸네일 이미지 노출 (URL 변환 + nginx /files/ + 권한)
- [ ] 어드민 로그인 (`/admin/login`) 정상 — 테스트 중
- [ ] 신규 파일 업로드 / 다운로드 사이클 검증
- [ ] DB / 업로드 cron 백업 설정
- [ ] 1~2주 안정 확인 후 기존 AWS (EC2/RDS/S3) 종료 + 계정 정리
- [ ] DB 비밀번호 회전
- [ ] git push 권한 받은 뒤 자동화 흐름 (`deploy-backend.sh`) 으로 전환
