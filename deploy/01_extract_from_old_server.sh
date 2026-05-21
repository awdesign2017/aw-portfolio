#!/usr/bin/env bash
# ===========================================================================
#  [Phase 1] 기존 서버(portfolio-server)에서 DB와 S3 데이터를 추출한다.
#
#  실행 위치 : 로컬 맥북 (이 스크립트가 있는 디렉토리)
#  사전 조건 : ~/.ssh/config 에 'portfolio-server' 가 설정되어 있어야 함
#
#  결과물:
#    ./_migration/portfolio_<DATE>.sql          (RDS 덤프)
#    ./_migration/uploads/{portfolio,options,submission}/...  (S3 객체)
# ===========================================================================
set -euo pipefail

cd "$(dirname "$0")"
WORK="./_migration"
mkdir -p "$WORK"

DATE=$(date +%F)
DUMP_FILE="$WORK/portfolio_${DATE}.sql"

# ── 시크릿은 환경변수로 주입 (커밋 금지) ─────────────────────────────
#  실행 전에 다음을 export 하세요:
#    export RDS_PASS='...'
#    export AWS_ACCESS_KEY_ID='AKIA...'
#    export AWS_SECRET_ACCESS_KEY='...'
#  (값은 xlsx 의 백엔드 환경변수 시트 또는 1Password 등에서 가져올 것)
RDS_HOST="portfoliodb.cry8qywuea1j.ap-northeast-2.rds.amazonaws.com"
RDS_PORT="3306"
RDS_USER="admin"
RDS_PASS="${RDS_PASS:?RDS_PASS 환경변수를 먼저 export 하세요}"
RDS_DB="PORTFOLIO"

S3_BUCKET="portfolio-always-files"
S3_REGION="ap-northeast-2"
AWS_AK="${AWS_ACCESS_KEY_ID:?AWS_ACCESS_KEY_ID 환경변수를 먼저 export 하세요}"
AWS_SK="${AWS_SECRET_ACCESS_KEY:?AWS_SECRET_ACCESS_KEY 환경변수를 먼저 export 하세요}"

echo "==> [1/2] RDS mysqldump (기존 서버 경유)"
# RDS는 외부 차단인 경우가 많으므로 기존 EC2를 점프호스트로 사용한다.
# mysql-client 가 없으면 자동 설치한 뒤 덤프한다.
ssh portfolio-server "
  set -euo pipefail
  if ! command -v mysqldump >/dev/null 2>&1; then
    echo '    mysql-client 설치 중...' >&2
    sudo DEBIAN_FRONTEND=noninteractive apt-get update -y >/dev/null 2>&1
    sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-client >/dev/null 2>&1
  fi
  mysqldump \
    -h $RDS_HOST -P $RDS_PORT \
    -u $RDS_USER -p'$RDS_PASS' \
    --single-transaction --routines --triggers --set-gtid-purged=OFF \
    --default-character-set=utf8mb4 \
    $RDS_DB
" > "$DUMP_FILE"

# 덤프가 실제로 생성됐는지 검증 (실패 시 빈 파일이 남는 것을 방지)
if [ ! -s "$DUMP_FILE" ] || ! grep -q '^-- MySQL dump' "$DUMP_FILE" 2>/dev/null; then
  echo "❌ mysqldump 실패: 빈 파일 또는 헤더 누락"
  echo "   파일 크기: $(wc -c < "$DUMP_FILE") bytes"
  echo "   상위 10줄:"
  head -10 "$DUMP_FILE" || true
  exit 1
fi

echo "    덤프 완료 → $DUMP_FILE ($(du -h "$DUMP_FILE" | cut -f1))"

echo "==> [2/2] S3 → 로컬 디렉토리 동기화"
mkdir -p "$WORK/uploads"
AWS_ACCESS_KEY_ID="$AWS_AK" \
AWS_SECRET_ACCESS_KEY="$AWS_SK" \
AWS_DEFAULT_REGION="$S3_REGION" \
  aws s3 sync "s3://$S3_BUCKET/" "$WORK/uploads/"

echo
echo "✅ 추출 완료. 다음 단계: ./02_setup_new_server.sh"
echo "   업로드 파일 수: $(find "$WORK/uploads" -type f | wc -l)"
