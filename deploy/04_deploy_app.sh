#!/usr/bin/env bash
# ===========================================================================
#  [Phase 4] 애플리케이션 배포 (백엔드 + 프론트).
#
#  실행 위치 : 로컬 맥북 (이 스크립트 디렉토리)
#  사전 조건 : aw-portfolio repo (awdesign2017/aw-portfolio) main 브랜치에
#             이번 변경사항이 push 되어 있어야 함.
#             repo 가 private 이면 deploy/README.md 의 "Private repo 인증" 참고.
#  결과물   : /home/awdesign/repo/aw-portfolio 에 clone, 빌드, systemd/pm2 기동
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")"

GIT_REPO="${GIT_REPO:-https://github.com/awdesign2017/aw-portfolio.git}"
GIT_BRANCH="${GIT_BRANCH:-main}"

echo "==> [1/6] systemd unit 전송"
scp ./aw-portfolio-api.service stay-season-fetcher:/tmp/
scp ./backend.env             stay-season-fetcher:/tmp/

echo "==> [2/6] git clone (있으면 pull)"
ssh stay-season-fetcher "
  set -euo pipefail
  cd /home/awdesign/repo
  if [ -d aw-portfolio/.git ]; then
    cd aw-portfolio && git fetch && git checkout $GIT_BRANCH && git pull
  else
    git clone -b $GIT_BRANCH $GIT_REPO aw-portfolio
  fi
"

echo "==> [3/6] 백엔드 빌드 + systemd 등록"
ssh stay-season-fetcher '
  set -euo pipefail
  cd /home/awdesign/repo/aw-portfolio/aw-portfoiio-api
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
'

echo "==> [4/6] 프론트 빌드 + pm2 기동"
ssh stay-season-fetcher '
  set -euo pipefail
  cd /home/awdesign/repo/aw-portfolio/aw-portfoiio-front
  npm ci || npm install

  NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://alwaysdesign-portfolio.com npm run build

  rm -rf /home/awdesign/nextjs-server/current/*
  cp -r .next package.json package-lock.json public node_modules /home/awdesign/nextjs-server/current/

  cd /home/awdesign/nextjs-server/current
  pm2 delete aw-portfolio-front || true
  NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://alwaysdesign-portfolio.com \
    pm2 start npm --name aw-portfolio-front -- start
  pm2 save
  pm2 status
'

echo "==> [5/6] pm2 부팅 시 자동 기동 등록 (최초 1회)"
ssh -t stay-season-fetcher '
  pm2 startup systemd -u awdesign --hp /home/awdesign | tail -1 | sudo bash || true
  pm2 save
'

echo "==> [6/6] nginx 사이트 등록"
scp ./nginx-alwaysdesign-portfolio.conf stay-season-fetcher:/tmp/
ssh stay-season-fetcher '
  sudo install -m 644 /tmp/nginx-alwaysdesign-portfolio.conf \
    /etc/nginx/sites-available/alwaysdesign-portfolio.com
  sudo ln -sf /etc/nginx/sites-available/alwaysdesign-portfolio.com \
              /etc/nginx/sites-enabled/alwaysdesign-portfolio.com
  # default 사이트 제거는 의도적으로 생략 (이 서버에는 다른 사이트가 함께 운영됨)
  sudo nginx -t
  sudo systemctl reload nginx
'

echo
echo "✅ 애플리케이션 기동 완료."
echo "   • 백엔드 헬스체크 :  curl -I http://localhost:8080/   (서버 내부에서)"
echo "   • 프론트 헬스체크 :  curl -I http://localhost:3000/  (서버 내부에서)"
echo "   • 다음 단계: ./05_finalize_ssl_dns.sh"
