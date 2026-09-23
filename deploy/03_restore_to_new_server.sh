#!/usr/bin/env bash
# ===========================================================================
#  [Phase 3] 새 서버로 DB 덤프 + 업로드 파일 복원.
#
#  실행 위치 : 로컬 맥북 (Phase 1 결과물이 ./_migration 에 있어야 함)
#  결과물   : 새 서버에 PORTFOLIO DB 적재, /home/awdesign/uploads/ 채워짐,
#            S3 URL → 로컬 URL 일괄 갱신.
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")"
WORK="./_migration"

DUMP=$(ls -1t "$WORK"/portfolio_*.sql 2>/dev/null | head -1 || true)
if [ -z "$DUMP" ]; then
  echo "❌ DB 덤프 파일을 찾을 수 없습니다. 먼저 ./01_extract_from_old_server.sh 를 실행하세요."
  exit 1
fi

echo "==> [1/3] DB 덤프 전송 + 임포트 ($DUMP)"
scp "$DUMP" stay-season-fetcher:/home/awdesign/migration/portfolio.sql
ssh -t stay-season-fetcher '
  set -euo pipefail
  mysql -uadmin -p -h 127.0.0.1 -P 3307 PORTFOLIO < /home/awdesign/migration/portfolio.sql
  echo "    임포트 완료. 테이블 수: $(mysql -uadmin -p -h 127.0.0.1 -P 3307 -N -e "SHOW TABLES" PORTFOLIO | wc -l)"
'

echo "==> [2/3] 업로드 파일 전송 (rsync)"
rsync -avh --progress "$WORK/uploads/" stay-season-fetcher:/home/awdesign/uploads/

echo "==> [3/3] DB의 S3 URL → 로컬 URL 일괄 변경"
ssh -t stay-season-fetcher '
  mysql -uadmin -p -h 127.0.0.1 -P 3307 PORTFOLIO <<SQL
-- 기존: https://portfolio-always-files.s3.ap-northeast-2.amazonaws.com/<folder>/<uuid>.<ext>
-- 신규: https://portfolio.always-design.co.kr/files/<folder>/<uuid>.<ext>
UPDATE COMMON_FILE
SET COMMON_FILE_URL = REPLACE(
    COMMON_FILE_URL,
    "https://portfolio-always-files.s3.ap-northeast-2.amazonaws.com/",
    "https://portfolio.always-design.co.kr/files/"
)
WHERE COMMON_FILE_URL LIKE "https://portfolio-always-files.s3.%";

UPDATE PORTFOLIO
SET PORTFOLIO_THUMBNAIL = REPLACE(
    PORTFOLIO_THUMBNAIL,
    "https://portfolio-always-files.s3.ap-northeast-2.amazonaws.com/",
    "https://portfolio.always-design.co.kr/files/"
)
WHERE PORTFOLIO_THUMBNAIL LIKE "https://portfolio-always-files.s3.%";

UPDATE OPTIONS
SET OPTIONS_THUMBNAIL = REPLACE(
    OPTIONS_THUMBNAIL,
    "https://portfolio-always-files.s3.ap-northeast-2.amazonaws.com/",
    "https://portfolio.always-design.co.kr/files/"
)
WHERE OPTIONS_THUMBNAIL LIKE "https://portfolio-always-files.s3.%";

-- 확인용
SELECT "COMMON_FILE 변환 후 총 행 수" AS label, COUNT(*) AS cnt FROM COMMON_FILE
UNION ALL
SELECT "PORTFOLIO 썸네일 보유 행", COUNT(*) FROM PORTFOLIO WHERE PORTFOLIO_THUMBNAIL IS NOT NULL AND PORTFOLIO_THUMBNAIL <> ""
UNION ALL
SELECT "OPTIONS 썸네일 보유 행", COUNT(*) FROM OPTIONS WHERE OPTIONS_THUMBNAIL IS NOT NULL AND OPTIONS_THUMBNAIL <> "";
SQL
'

echo
echo "✅ Phase 3 완료. 다음 단계: ./04_deploy_app.sh"
