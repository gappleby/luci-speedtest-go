#!/bin/sh
# On-router installer — run after SCP'ing the repo to the router.
# Usage:  scp -r . root@192.168.1.1:/tmp/luci-speedtest-go
#         ssh root@192.168.1.1 "sh /tmp/luci-speedtest-go/speedtest_install.sh"
# Prefer:  use install.bat from Windows, or build-apk.sh + apk add from Linux/WSL.
# NOTE: OpenWRT 25.x uses apk, not opkg. To remove: apk del luci-app-speedtest

set -e
SRCDIR="$(cd "$(dirname "$0")" && pwd)"

echo "==> Installing luci-app-speedtest ..."

mkdir -p /usr/share/luci/menu.d
cp "$SRCDIR/files/usr/share/luci/menu.d/luci-app-speedtest.json" \
   /usr/share/luci/menu.d/luci-app-speedtest.json
chmod 644 /usr/share/luci/menu.d/luci-app-speedtest.json

mkdir -p /usr/share/rpcd/acl.d
cp "$SRCDIR/files/usr/share/rpcd/acl.d/luci-app-speedtest.json" \
   /usr/share/rpcd/acl.d/luci-app-speedtest.json
chmod 644 /usr/share/rpcd/acl.d/luci-app-speedtest.json

mkdir -p /www/luci-static/resources/view/speedtest
cp "$SRCDIR/files/www/luci-static/resources/view/speedtest/overview.js" \
   /www/luci-static/resources/view/speedtest/overview.js
chmod 644 /www/luci-static/resources/view/speedtest/overview.js

mkdir -p /www/cgi-bin
cp "$SRCDIR/files/www/cgi-bin/speedtest-run" \
   /www/cgi-bin/speedtest-run
chmod 755 /www/cgi-bin/speedtest-run

echo "==> Restarting rpcd ..."
/etc/init.d/rpcd restart 2>/dev/null || true

echo ""
echo "Done! Hard-refresh LuCI (Ctrl+Shift+R) and look for:"
echo "  Status -> Speed Test"
echo ""
echo "If the menu item does not appear, verify:"
echo "  ls -la /usr/bin/speedtest-go   (must be executable)"
