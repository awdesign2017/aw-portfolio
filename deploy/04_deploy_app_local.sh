#!/usr/bin/env bash
# ===========================================================================
#  [Phase 4 — local 변형] 로컬 코드를 git 없이 서버로 rsync 한 뒤 빌드/기동.
#
#  주의(이 서버 환경):
#   - 같은 서버에 stay-season-fetcher 가 :3000 (pm2) + nginx 사이트
#     fetcher.stay-season.com 으로 운영 중.
#   - aw-portfolio 는 충돌 회피를 위해 :3001 사용, pm2 이름은 aw-portfolio-front.
#   - nginx default 사이트는 이미 없으므로 제거 단계 미실행.
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_ROOT="$(cd .. && pwd)"

REMOTE_REPO=/home/awdesign/repo/aw-portfolio
PM2_NAME=aw-portfolio-front

echo "==> [1/7] 이전 clone/잔재 청소"
ssh stay-season-fetcher "rm -rf $REMOTE_REPO && mkdir -p $REMOTE_REPO"

echo
echo "==> [2/7] 로컬 코드 → 서버 rsync (git/빌드 산출물 제외)"
rsync -avh --delete \
  --exclude='.git/' \
  --exclude='aw-portfoiio-api/build/' \
  --exclude='aw-portfoiio-api/.gradle/' \
  --exclude='aw-portfoiio-api/src/main/generated/' \
  --exclude='aw-portfoiio-front/.next/' \
  --exclude='aw-portfoiio-front/node_modules/' \
  --exclude='deploy/_migration/' \
  "$PROJECT_ROOT/" "stay-season-fetcher:$REMOTE_REPO/"

echo
echo "==> [3/7] systemd unit + backend.env 전송"
scp ./aw-portfolio-api.service stay-season-fetcher:/tmp/
scp ./backend.env             stay-season-fetcher:/tmp/

echo
echo "==> [4/7] 백엔드 빌드 + systemd 등록 (sudo 비번 입력 필요)"
ssh -t stay-season-fetcher "
  set -euo pipefail
  cd $REMOTE_REPO/aw-portfoiio-api
  chmod +x ./gradlew
  ./gradlew clean build -x test

  cp build/libs/*SNAPSHOT.jar /home/awdesign/spring-server/target/project.jar

  sudo install -m 600 /tmp/backend.env /etc/aw-portfolio.env
  sudo install -m 644 /tmp/aw-portfolio-api.service /etc/systemd/system/aw-portfolio-api.service

  sudo systemctl daemon-reload
  sudo systemctl enable aw-portfolio-api
  sudo systemctl restart aw-portfolio-api
  sleep 3
  sudo systemctl status aw-portfolio-api --no-pager | head -20
"

echo
echo "==> [5/7] 프론트 빌드 + 산출물 복사 + pm2 기동 (이름: $PM2_NAME, 포트: 3001)"
ssh stay-season-fetcher "
  set -euo pipefail
  cd $REMOTE_REPO/aw-portfoiio-front
  npm ci || npm install
  NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://alwaysdesign-portfolio.com npm run build

  rm -rf /home/awdesign/nextjs-server/current/*
  cp -r .next package.json package-lock.json public node_modules \
        /home/awdesign/nextjs-server/current/

  cd /home/awdesign/nextjs-server/current
  # 잘못 떠 있던 next-server / 기존 동일 이름 모두 제거 후 새로 띄움
  pm2 delete next-server         2>/dev/null || true
  pm2 delete $PM2_NAME           2>/dev/null || true

  NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://alwaysdesign-portfolio.com \
    pm2 start npm --name $PM2_NAME -- start
  pm2 save
  pm2 status
"

echo
echo "==> [6/7] pm2 부팅 시 자동 기동 등록 (sudo 비번 입력 필요, 이미 등록돼 있어도 무해)"
ssh -t stay-season-fetcher "
  pm2 startup systemd -u awdesign --hp /home/awdesign | tail -1 | sudo bash || true
  pm2 save
"

echo
echo "==> [7/7] nginx 사이트 갱신 + /files 권한 보정"
scp ./nginx-alwaysdesign-portfolio.conf stay-season-fetcher:/tmp/
ssh -t stay-season-fetcher "
  # 이전 단계에서 만든 portfolio.always-design.co.kr 파일은 정리 (upstream 중복 방지)
  sudo rm -f /etc/nginx/sites-enabled/portfolio.always-design.co.kr
  sudo rm -f /etc/nginx/sites-available/portfolio.always-design.co.kr

  sudo install -m 644 /tmp/nginx-alwaysdesign-portfolio.conf \
    /etc/nginx/sites-available/alwaysdesign-portfolio.com
  sudo ln -sf /etc/nginx/sites-available/alwaysdesign-portfolio.com \
              /etc/nginx/sites-enabled/alwaysdesign-portfolio.com

  # /home/awdesign 디렉토리 traverse 권한 (nginx www-data 가 /files/ 정적 파일 접근)
  sudo chmod o+x /home/awdesign

  sudo nginx -t
  sudo systemctl reload nginx
"

echo
echo "✅ 애플리케이션 기동 완료."
echo "   서버에서 동작 확인:"
echo "     ssh stay-season-fetcher 'curl -I http://localhost:8080/api/portfolios/all'"
echo "     ssh stay-season-fetcher 'curl -I http://localhost:3001/'"
echo "   다음 단계: ./05_finalize_ssl_dns.sh (DNS 전파 확인 후)"
