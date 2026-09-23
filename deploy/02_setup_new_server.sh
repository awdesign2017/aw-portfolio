#!/usr/bin/env bash
# ===========================================================================
#  [Phase 2] 새 서버(stay-season-fetcher / 1.226.82.152) 초기 셋업.
#
#  실행 위치 : 로컬 맥북 (이 스크립트가 있는 디렉토리)
#  동작     : ssh 로 새 서버에 들어가 setup_remote.sh 를 실행한다.
#  결과물   : JDK17, Node20, MySQL8, pm2, nginx, certbot 설치 + 디렉토리 준비
# ===========================================================================
set -euo pipefail
cd "$(dirname "$0")"

REMOTE_SCRIPT="/tmp/setup_remote.sh"

cat > /tmp/_setup_remote_local.sh <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail

echo "==> [1/7] 패키지 인덱스 갱신"
sudo apt-get update -y

echo "==> [2/7] JDK 17 (Corretto) 설치"
if ! command -v java >/dev/null 2>&1 || ! java -version 2>&1 | grep -q '17\.'; then
  sudo apt-get install -y wget gnupg
  wget -qO- https://apt.corretto.aws/corretto.key | sudo gpg --dearmor -o /usr/share/keyrings/corretto.gpg
  echo "deb [signed-by=/usr/share/keyrings/corretto.gpg] https://apt.corretto.aws stable main" \
    | sudo tee /etc/apt/sources.list.d/corretto.list
  sudo apt-get update -y
  sudo apt-get install -y java-17-amazon-corretto-jdk
fi
java -version

echo "==> [3/7] Node 20 + pm2"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | cut -d. -f1)" != "v20" ]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
node -v
sudo npm install -g pm2

echo "==> [4/7] MySQL 8 설치"
if ! command -v mysql >/dev/null 2>&1; then
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y mysql-server
fi
sudo systemctl enable --now mysql

echo "==> [5/7] nginx + certbot 설치"
sudo apt-get install -y nginx certbot python3-certbot-nginx unzip

echo "==> [6/7] 디렉토리 생성"
sudo mkdir -p /home/awdesign/spring-server/target
sudo mkdir -p /home/awdesign/nextjs-server/current
sudo mkdir -p /home/awdesign/uploads/{portfolio,options,submission}
sudo mkdir -p /home/awdesign/logs
sudo mkdir -p /home/awdesign/repo            # git clone 위치
sudo mkdir -p /home/awdesign/migration       # SQL/파일 임시 위치
sudo chown -R awdesign:awdesign /home/awdesign/spring-server /home/awdesign/nextjs-server \
                            /home/awdesign/uploads /home/awdesign/logs \
                            /home/awdesign/repo /home/awdesign/migration

if [ -z "${DB_PASSWORD:-}" ]; then read -rsp "admin DB 비밀번호 입력: " DB_PASSWORD; echo; fi   # 비밀번호는 스크립트·문서에 적지 않는다
echo "==> [7/7] MySQL 사용자 + DB 준비"
sudo mysql --protocol=socket -uroot <<SQL
CREATE DATABASE IF NOT EXISTS PORTFOLIO
  DEFAULT CHARACTER SET utf8mb4
  DEFAULT COLLATE utf8mb4_unicode_ci;

CREATE USER IF NOT EXISTS 'admin'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT ALL PRIVILEGES ON PORTFOLIO.* TO 'admin'@'localhost';
FLUSH PRIVILEGES;
SQL

echo
echo "✅ 새 서버 셋업 완료"
java -version
node -v
mysql --version
nginx -v
REMOTE

chmod +x /tmp/_setup_remote_local.sh
scp /tmp/_setup_remote_local.sh stay-season-fetcher:$REMOTE_SCRIPT
ssh -t stay-season-fetcher "bash $REMOTE_SCRIPT"

echo
echo "✅ Phase 2 완료. 다음 단계: ./03_restore_to_new_server.sh"
