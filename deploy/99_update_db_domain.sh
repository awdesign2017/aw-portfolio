#!/usr/bin/env bash
# ===========================================================================
#  DB 안의 파일 URL 을 새 주 도메인(alwaysdesign-portfolio.com) 으로 갱신.
#  현재 DB 에는 portfolio.always-design.co.kr/files/ 형태로 들어있음.
#
#  사용법: ./99_update_db_domain.sh
# ===========================================================================
set -euo pipefail

ssh -t stay-season-fetcher '
  mysql -uadmin -p -h 127.0.0.1 -P 3307 PORTFOLIO <<SQL
UPDATE COMMON_FILE
SET COMMON_FILE_URL = REPLACE(
    COMMON_FILE_URL,
    "https://portfolio.always-design.co.kr/files/",
    "https://alwaysdesign-portfolio.com/files/"
)
WHERE COMMON_FILE_URL LIKE "https://portfolio.always-design.co.kr/%";

UPDATE PORTFOLIO
SET PORTFOLIO_THUMBNAIL = REPLACE(
    PORTFOLIO_THUMBNAIL,
    "https://portfolio.always-design.co.kr/files/",
    "https://alwaysdesign-portfolio.com/files/"
)
WHERE PORTFOLIO_THUMBNAIL LIKE "https://portfolio.always-design.co.kr/%";

UPDATE OPTIONS
SET OPTIONS_THUMBNAIL = REPLACE(
    OPTIONS_THUMBNAIL,
    "https://portfolio.always-design.co.kr/files/",
    "https://alwaysdesign-portfolio.com/files/"
)
WHERE OPTIONS_THUMBNAIL LIKE "https://portfolio.always-design.co.kr/%";

-- 검증
SELECT "COMMON_FILE 옛 도메인 잔존" AS label, COUNT(*) AS cnt
  FROM COMMON_FILE WHERE COMMON_FILE_URL LIKE "%portfolio.always-design.co.kr%"
UNION ALL
SELECT "PORTFOLIO 옛 도메인 잔존", COUNT(*)
  FROM PORTFOLIO WHERE PORTFOLIO_THUMBNAIL LIKE "%portfolio.always-design.co.kr%"
UNION ALL
SELECT "OPTIONS 옛 도메인 잔존", COUNT(*)
  FROM OPTIONS WHERE OPTIONS_THUMBNAIL LIKE "%portfolio.always-design.co.kr%"
UNION ALL
SELECT "COMMON_FILE 새 도메인 적용 행", COUNT(*)
  FROM COMMON_FILE WHERE COMMON_FILE_URL LIKE "%alwaysdesign-portfolio.com%"
UNION ALL
SELECT "PORTFOLIO 새 도메인 적용 행", COUNT(*)
  FROM PORTFOLIO WHERE PORTFOLIO_THUMBNAIL LIKE "%alwaysdesign-portfolio.com%"
UNION ALL
SELECT "OPTIONS 새 도메인 적용 행", COUNT(*)
  FROM OPTIONS WHERE OPTIONS_THUMBNAIL LIKE "%alwaysdesign-portfolio.com%";
SQL
'

echo
echo "✅ DB URL 갱신 완료"
