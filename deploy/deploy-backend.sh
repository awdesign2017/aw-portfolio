#!/usr/bin/env bash
# ===========================================================================
#  백엔드만 재배포 (git pull 기반).
#  - 서버 안에서 수동 실행, 또는 GitHub Actions(deploy.yml) 가 호출.
#  - .git 이 없으면 자동 clone 으로 fallback (rsync 모드 후 회복용).
# ===========================================================================
set -euo pipefail

REPO_DIR=/home/awdesign/repo/aw-portfolio
REPO_URL=https://github.com/awdesign2017/aw-portfolio.git
BRANCH="${BRANCH:-main}"

if [ ! -d "$REPO_DIR/.git" ]; then
  echo "(.git 없음 → clone 으로 복구)"
  rm -rf "$REPO_DIR"
  git clone -b "$BRANCH" "$REPO_URL" "$REPO_DIR"
fi

cd "$REPO_DIR"
git fetch --all --prune
git checkout "$BRANCH"
git reset --hard "origin/$BRANCH"

cd aw-portfoiio-api
chmod +x ./gradlew
./gradlew clean build -x test

cp build/libs/*SNAPSHOT.jar /home/awdesign/spring-server/target/project.jar

sudo /usr/bin/systemctl restart aw-portfolio-api
sleep 3
sudo /usr/bin/systemctl status aw-portfolio-api --no-pager | head -20

echo "✅ 백엔드 재배포 완료. 로그: journalctl -u aw-portfolio-api -f"
