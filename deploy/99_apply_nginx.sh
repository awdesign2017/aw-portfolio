#!/usr/bin/env bash
# ===========================================================================
#  nginx 사이트 conf 만 빠르게 갱신 (백엔드/프론트 재빌드 없이).
#  부 도메인을 메인 도메인으로 redirect 하도록 변경한 conf 를 반영한다.
#
#  사용법: ./99_apply_nginx.sh
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")"

scp ./nginx-alwaysdesign-portfolio.conf stay-season-fetcher:/tmp/

ssh -t stay-season-fetcher '
  set -e
  sudo install -m 644 /tmp/nginx-alwaysdesign-portfolio.conf \
    /etc/nginx/sites-available/alwaysdesign-portfolio.com

  # certbot 이 두 server block 모두에 SSL 자동 적용
  sudo certbot --nginx --reinstall \
    -d alwaysdesign-portfolio.com \
    -d www.alwaysdesign-portfolio.com \
    -d portfolio.always-design.co.kr \
    --redirect --agree-tos --no-eff-email -m tom@bisonai.com

  sudo nginx -t
  sudo systemctl reload nginx
'

echo
echo "✅ nginx 갱신 완료. 검증:"
echo "   curl -I https://portfolio.always-design.co.kr/   # → 301 → alwaysdesign-portfolio.com"
echo "   curl -I https://www.alwaysdesign-portfolio.com/  # → 301"
echo "   curl -I https://alwaysdesign-portfolio.com/       # → 200"
