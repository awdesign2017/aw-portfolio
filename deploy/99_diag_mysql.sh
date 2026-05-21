#!/usr/bin/env bash
# MySQL 3307 격리 설치 진단 스크립트
set +e

echo "=== /usr/sbin/policy-rc.d 잔존 여부 ==="
ls -l /usr/sbin/policy-rc.d 2>/dev/null && cat /usr/sbin/policy-rc.d || echo "  (없음 - 정상)"

echo
echo "=== /etc/mysql/ 디렉토리 구조 ==="
find /etc/mysql -maxdepth 2 -type f 2>/dev/null | sort

echo
echo "=== /etc/mysql/my.cnf (실체) ==="
readlink -f /etc/mysql/my.cnf
cat "$(readlink -f /etc/mysql/my.cnf)" 2>/dev/null

echo
echo "=== /etc/mysql/conf.d/zz-aw-portfolio.cnf ==="
cat /etc/mysql/conf.d/zz-aw-portfolio.cnf 2>/dev/null || echo "  (없음!)"

echo
echo "=== /etc/mysql/mysql.conf.d/mysqld.cnf 의 port 관련 라인 ==="
grep -n -E "^[^#]*port|^[^#]*bind-address" /etc/mysql/mysql.conf.d/mysqld.cnf 2>/dev/null

echo
echo "=== mysql.service 상태 ==="
systemctl status mysql --no-pager 2>&1 | head -20

echo
echo "=== /var/log/mysql/error.log (최근 60줄) ==="
tail -60 /var/log/mysql/error.log 2>/dev/null || echo "  (로그 없음)"

echo
echo "=== 3306/3307 점유 상황 ==="
ss -tnlp 2>/dev/null | grep -E ":3306|:3307|mysqld" || echo "  (mysql 관련 LISTEN 없음)"
