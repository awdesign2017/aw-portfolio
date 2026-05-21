#!/usr/bin/env bash
# ===========================================================================
#  [Phase 5] SSL 발급 + 점검.
#
#  사전 조건:
#    - DNS A 레코드 portfolio.always-design.co.kr 이 1.226.82.152 로 변경되고
#      전파가 끝난 상태(dig +short portfolio.always-design.co.kr == 1.226.82.152).
#    - 80 포트가 인터넷에서 접근 가능해야 함.
#
#  실행 위치 : 로컬 맥북
#  결과물   : Let's Encrypt 인증서 발급, nginx 자동 갱신 설정
# ===========================================================================
set -euo pipefail

read -p "DNS 가 새 서버(1.226.82.152) 로 이미 전파되었습니까? [y/N] " ans
case "$ans" in
  y|Y) ;;
  *)
    echo "❌ DNS 전파 후 다시 실행하세요."
    echo "   확인 명령: dig +short portfolio.always-design.co.kr"
    exit 1
    ;;
esac

ssh -t stay-season-fetcher '
  sudo certbot --nginx \
    -d alwaysdesign-portfolio.com -d www.alwaysdesign-portfolio.com -d portfolio.always-design.co.kr --expand \
    \
    --redirect --agree-tos --no-eff-email -m tom@bisonai.com
  sudo systemctl reload nginx
  sudo systemctl list-timers | grep certbot || true
'

echo
echo "✅ SSL 발급 완료. 다음으로 브라우저에서 확인하세요:"
echo "   https://portfolio.always-design.co.kr/"
echo "   https://portfolio.always-design.co.kr/api/portfolios/all"
