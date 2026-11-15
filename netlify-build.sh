#!/bin/sh
# Fetch the Rwamagana Mall server (MIDTERM-PROJECT-bn) so Netlify can run it as a function.
set -e
rm -rf server
git clone --depth 1 --branch "${SERVER_BRANCH:-all-setup-features}" "${SERVER_REPO:-https://github.com/Martha-Iradukunda/MIDTERM-PROJECT-bn.git}" server
cd server
if [ "$(uname -s)" = "Linux" ]; then
  npm ci --omit=dev --no-audit --no-fund
else
  # Building on Windows/Mac for Netlify: install the Linux version of native packages (the function runs on Linux).
  npm ci --omit=dev --no-audit --no-fund --os=linux --cpu=x64 --libc=glibc
fi
echo "Server ready: $(git log -1 --format='%h %s')"
