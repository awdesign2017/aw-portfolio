#!/usr/bin/env bash
# ===========================================================================
#  프론트엔드만 재배포 (git pull 기반).
#  - 서버 안에서 수동 실행, 또는 GitHub Actions(deploy.yml) 가 호출.
#  - .git 이 없으면 자동 clone 으로 fallback (rsync 모드 후 회복용).
# ===========================================================================
set -euo pipefail

REPO_DIR=/home/awdesign/repo/aw-portfolio
REPO_URL=https://github.com/awdesign2017/aw-portfolio.git
BRANCH="${BRANCH:-main}"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "(.git 없음 → clone 으로 복구)"
  rm -rf "$REPO_DIR"
  git clone -b "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

cd aw-portfoiio-front
npm ci || npm install
NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://alwaysdesign-portfolio.com \
  npm run build

# 산출물 동기화
rsync -a --delete \
  .next package.json package-lock.json public node_modules \
  /home/awdesign/nextjs-server/current/

cd /home/awdesign/nextjs-server/current
NODE_ENV=production NEXT_PUBLIC_API_BASE_URL=https://alwaysdesign-portfolio.com \
  pm2 restart aw-portfolio-front --update-env || \
  pm2 start npm --name aw-portfolio-front -- start
pm2 save

echo "✅ 프론트엔드 재배포 완료."
pm2 status
