#!/usr/bin/env bash
# ===========================================================================
#  서버에 SSH 접속한 후 백엔드만 재배포할 때 사용.
#  (GitHub Actions 가 없으므로 git pull 기반)
#
#  서버 안에서:
#     bash /home/awdesign/repo/aw-portfolio/deploy/deploy-backend.sh
# ===========================================================================
set -euo pipefail

cd /home/awdesign/repo/aw-portfolio
git fetch
git pull

cd aw-portfoiio-api
chmod +x ./gradlew
./gradlew clean build -x test

cp build/libs/*SNAPSHOT.jar /home/awdesign/spring-server/target/project.jar

sudo systemctl restart aw-portfolio-api
sleep 3
sudo systemctl status aw-portfolio-api --no-pager | head -20

echo "✅ 백엔드 재배포 완료. 로그: journalctl -u aw-portfolio-api -f"
