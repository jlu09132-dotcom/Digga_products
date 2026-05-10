#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
#  build.sh  —  Render runs this on every deploy
#  Run once locally before pushing:  chmod +x build.sh
# ─────────────────────────────────────────────────────────────
set -o errexit

echo "==> [1/4] Upgrading pip..."
pip install --upgrade pip

echo "==> [2/4] Installing dependencies..."
pip install -r requirements.txt

echo "==> [3/4] Collecting static files..."
python manage.py collectstatic --no-input

echo "==> [4/4] Running database migrations..."
python manage.py migrate --no-input

echo "==> Build complete."