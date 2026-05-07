#!/bin/sh
set -e

PKG_NAME="${PKG_NAME:-luci-app-speedtest}"
PKG_VER="${PKG_VER:-1.0.0-r0}"
PKG_ARCH="${PKG_ARCH:-all}"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FILES_DIR="$SCRIPT_DIR/files"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

DATA="$WORK/root"

mkdir -p "$DATA"

#
# Copy files exactly as you already do
#

mkdir -p "$DATA/usr/share/luci/menu.d"
cp "$FILES_DIR/usr/share/luci/menu.d/luci-app-speedtest.json" \
   "$DATA/usr/share/luci/menu.d/"

mkdir -p "$DATA/usr/share/rpcd/acl.d"
cp "$FILES_DIR/usr/share/rpcd/acl.d/luci-app-speedtest.json" \
   "$DATA/usr/share/rpcd/acl.d/"

mkdir -p "$DATA/www/luci-static/resources/view/speedtest"
cp "$FILES_DIR/www/luci-static/resources/view/speedtest/overview.js" \
   "$DATA/www/luci-static/resources/view/speedtest/"

mkdir -p "$DATA/www/cgi-bin"
cp "$FILES_DIR/www/cgi-bin/speedtest-run" \
   "$DATA/www/cgi-bin/"

chmod 755 "$DATA/www/cgi-bin/speedtest-run"

apk mkpkg \
  --info "name:$PKG_NAME" \
  --info "version:$PKG_VER" \
  --info "arch:$PKG_ARCH" \
  --info "license:MIT" \
  --info "depend:luci-base" \
  --info "description:LuCI speedtest GUI" \
  --files "$DATA" \
  --output "$SCRIPT_DIR/${PKG_NAME}-${PKG_VER}.${PKG_ARCH}.apk"
