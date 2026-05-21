#!/usr/bin/env bash
# ===========================================================================
#  v4 — policy-rc.d 잔재 제거 + 런타임 디렉토리 보장 + 재시작.
#  현재 상태:
#   - mysql-server-8.0 패키지 설치 완료
#   - /etc/mysql/conf.d/zz-aw-portfolio.cnf 에 port=3307 설정 존재
#   - mysql.service 만 failed 상태 → 재기동만 하면 됨
# ===========================================================================
set -e

PORT=3307

echo "=== [1] /usr/sbin/policy-rc.d 잔재 제거 ==="
if [ -f /usr/sbin/policy-rc.d ]; then
  cat /usr/sbin/policy-rc.d
  rm -f /usr/sbin/policy-rc.d
  echo "  → 제거됨"
else
  echo "  (이미 없음)"
fi

echo
echo "=== [2] mysql 런타임/로그 디렉토리 보장 ==="
mkdir -p /var/run/mysqld /var/log/mysql
chown mysql:mysql /var/run/mysqld /var/log/mysql
ls -ld /var/run/mysqld /var/log/mysql

echo
echo "=== [3] AppArmor 프로파일 reload (mysqld) ==="
if [ -f /etc/apparmor.d/usr.sbin.mysqld ] && command -v apparmor_parser >/dev/null; then
  apparmor_parser -r /etc/apparmor.d/usr.sbin.mysqld || true
  aa-status 2>/dev/null | grep mysqld || true
else
  echo "  (AppArmor 프로파일 없거나 비활성)"
fi

echo
echo "=== [4] systemd reset & start ==="
systemctl daemon-reload
systemctl reset-failed mysql || true
systemctl enable mysql
systemctl start mysql || true
sleep 3

echo
echo "=== [5] 서비스 상태 ==="
systemctl status mysql --no-pager | head -15

echo
echo "=== [6] 실패한 경우 journalctl 마지막 50줄 ==="
if ! systemctl is-active --quiet mysql; then
  echo "❌ 시작 실패 — journalctl 출력:"
  journalctl -u mysql.service -n 50 --no-pager
  echo
  echo "=== /var/log/mysql/error.log 최근 30줄 ==="
  tail -30 /var/log/mysql/error.log 2>/dev/null
  exit 1
fi

echo
echo "=== [7] 포트 / 버전 확인 ==="
ss -tnlp | grep -E "mysqld|:$PORT" || true
mysql --protocol=socket -uroot -e "SELECT @@port AS port, VERSION() AS version, @@bind_address AS bind_addr;"

echo
echo "=== [8] PORTFOLIO DB + admin 사용자 생성 ==="
mysql --protocol=socket -uroot -e "
CREATE DATABASE IF NOT EXISTS PORTFOLIO
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY '***REMOVED***';
GRANT ALL PRIVILEGES ON PORTFOLIO.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
SHOW DATABASES;
"

echo
echo "=== [9] admin 사용자로 $PORT 포트 접속 테스트 ==="
mysql -uadmin -p'***REMOVED***' -h 127.0.0.1 -P $PORT -e "SELECT 'admin login OK' AS status, @@port AS port;"
mysql -uadmin -p'***REMOVED***' -h 127.0.0.1 -P $PORT PORTFOLIO -e "SHOW TABLES;"

echo
echo "✅ MySQL $PORT 격리 설치 완료"
echo "   - 3306 : 카페24 프로덕션 MariaDB SSH 터널 (그대로)"
echo "   - $PORT : aw-portfolio 전용 MySQL 8 (로컬)"
