#!/bin/sh
# Build a standalone .apk for luci-app-speedtest (OpenWRT 25.x / apk)
# Requires only: sh, tar, gzip, find, wc, date — all standard busybox.
#
# Usage:  sh build-apk.sh
# Output: luci-app-speedtest-1.0.0-r0.all.apk

set -e

PKG_NAME="${PKG_NAME:-luci-app-speedtest}"
PKG_VER="${PKG_VER:-1.0.0-r0}"
PKG_ARCH="${PKG_ARCH:-all}"
PKG_FILE="${PKG_NAME}-${PKG_VER}.${PKG_ARCH}.apk"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
FILES_DIR="$SCRIPT_DIR/files"

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

echo "==> Building $PKG_FILE ..."

# ── Stage data files ──────────────────────────────────────────────────────────
DATA="$WORK/data"

mkdir -p "$DATA/usr/share/luci/menu.d"
cp "$FILES_DIR/usr/share/luci/menu.d/luci-app-speedtest.json" \
    "$DATA/usr/share/luci/menu.d/luci-app-speedtest.json"
chmod 644 "$DATA/usr/share/luci/menu.d/luci-app-speedtest.json"

mkdir -p "$DATA/usr/share/rpcd/acl.d"
cp "$FILES_DIR/usr/share/rpcd/acl.d/luci-app-speedtest.json" \
    "$DATA/usr/share/rpcd/acl.d/luci-app-speedtest.json"
chmod 644 "$DATA/usr/share/rpcd/acl.d/luci-app-speedtest.json"

mkdir -p "$DATA/www/luci-static/resources/view/speedtest"
cp "$FILES_DIR/www/luci-static/resources/view/speedtest/overview.js" \
    "$DATA/www/luci-static/resources/view/speedtest/overview.js"
chmod 644 "$DATA/www/luci-static/resources/view/speedtest/overview.js"

mkdir -p "$DATA/www/cgi-bin"
cp "$FILES_DIR/www/cgi-bin/speedtest-run" \
    "$DATA/www/cgi-bin/speedtest-run"
chmod 755 "$DATA/www/cgi-bin/speedtest-run"

SIZE=$(find "$DATA" -type f -exec wc -c {} \; | awk '{s += $1} END {print s+0}')
echo "    staged ${SIZE} bytes of package data"

# ── Control files (own directory so tar . picks up only what we want) ─────────
CTRL="$WORK/ctrl"
mkdir -p "$CTRL"

cat > "$CTRL/.PKGINFO" << EOF
pkgname = $PKG_NAME
pkgver = $PKG_VER
arch = $PKG_ARCH
size = $SIZE
pkgdesc = LuCI web interface for speedtest-go. Adds Status > Speed Test to OpenWrt.
url = https://github.com/showwin/speedtest-go
builddate = $(date +%s)
packager = Glen Appleby <gappleby@gappleby.com>
license = MIT
depend = luci-base
EOF

cat > "$CTRL/.post-install" << 'EOF'
#!/bin/sh
/etc/init.d/rpcd restart 2>/dev/null || true
if [ ! -x /usr/bin/speedtest-go ]; then
	echo ""
	echo "WARNING: /usr/bin/speedtest-go not found or not executable."
	echo "The Speed Test page will not appear in LuCI until the binary is installed."
	echo ""
	echo "Download the correct binary for your router architecture from:"
	echo "  https://github.com/showwin/speedtest-go/releases"
	echo "Then run:  chmod +x /usr/bin/speedtest-go"
	echo ""
fi
EOF
chmod 755 "$CTRL/.post-install"

cat > "$CTRL/.pre-deinstall" << 'EOF'
#!/bin/sh
if [ -f /tmp/speedtest.pid ]; then
	kill "$(cat /tmp/speedtest.pid)" 2>/dev/null || true
	rm -f /tmp/speedtest.pid
fi
rm -f /tmp/speedtest.log
EOF
chmod 755 "$CTRL/.pre-deinstall"

cat > "$CTRL/.post-deinstall" << 'EOF'
#!/bin/sh
/etc/init.d/rpcd restart 2>/dev/null || true
EOF
chmod 755 "$CTRL/.post-deinstall"

# ── Control stream: pipe through gzip (avoids busybox tar -C + dotfile quirks)
# .PKGINFO must be the first entry in the tar
( cd "$CTRL" && tar -cf - .PKGINFO .post-install .pre-deinstall .post-deinstall ) \
    | gzip -9 > "$WORK/control.tar.gz"

# ── Data stream ───────────────────────────────────────────────────────────────
( cd "$DATA" && tar -cf - . ) | gzip -9 > "$WORK/data.tar.gz"

# ── Integrity check before assembly ──────────────────────────────────────────
gzip -t "$WORK/control.tar.gz" || { echo "ERROR: control.tar.gz failed integrity check"; exit 1; }
gzip -t "$WORK/data.tar.gz"    || { echo "ERROR: data.tar.gz failed integrity check"; exit 1; }

CTRL_SZ=$(wc -c < "$WORK/control.tar.gz")
DATA_SZ=$(wc -c < "$WORK/data.tar.gz")
echo "    control.tar.gz: ${CTRL_SZ} bytes"
echo "    data.tar.gz:    ${DATA_SZ} bytes"

[ "$CTRL_SZ" -gt 50 ] || { echo "ERROR: control stream suspiciously small"; exit 1; }
[ "$DATA_SZ" -gt 50 ] || { echo "ERROR: data stream suspiciously small"; exit 1; }

# ── Assemble: APK = control stream || data stream ─────────────────────────────
cat "$WORK/control.tar.gz" "$WORK/data.tar.gz" > "$SCRIPT_DIR/$PKG_FILE"

APK_SZ=$(wc -c < "$SCRIPT_DIR/$PKG_FILE")
echo ""
echo "==> Built: $PKG_FILE (${APK_SZ} bytes)"
echo ""
echo "Install:"
echo "  apk add --allow-untrusted $SCRIPT_DIR/$PKG_FILE"
echo ""
echo "Remove:"
echo "  apk del $PKG_NAME"
