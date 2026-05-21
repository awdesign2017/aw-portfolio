#!/usr/bin/env bash
# ===========================================================================
#  서버에 SSH 접속한 후 프론트엔드만 재배포할 때 사용.
#
#  서버 안에서:
#     bash /home/awdesign/repo/aw-portfolio/deploy/deploy-frontend.sh
# ===========================================================================
set -euo pipefail

cd /home/awdesign/repo/aw-portfolio
git fetch
git pull

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
