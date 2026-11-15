#!/bin/sh
# Fetch the Rwamagana Mall server (MIDTERM-PROJECT-bn) so Netlify can run it as a function.
set -e
rm -rf server
git clone --depth 1 --branch "${SERVER_BRANCH:-all-setup-features}" "${SERVER_REPO:-https://github.com/Martha-Iradukunda/MIDTERM-PROJECT-bn.git}" server
cd server
npm ci --omit=dev --no-audit --no-fund
echo "Server ready: $(git log -1 --format='%h %s')"
