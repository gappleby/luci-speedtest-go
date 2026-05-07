@echo off
REM Direct SCP deploy to router (no IPK build required)
REM Edit ROUTER_IP if your LAN address differs.

set ROUTER_IP=192.168.1.1

scp -O files\usr\share\luci\menu.d\luci-app-speedtest.json   root@%ROUTER_IP%:/usr/share/luci/menu.d/luci-app-speedtest.json
scp -O files\usr\share\rpcd\acl.d\luci-app-speedtest.json    root@%ROUTER_IP%:/usr/share/rpcd/acl.d/luci-app-speedtest.json
scp -O files\www\luci-static\resources\view\speedtest\overview.js  root@%ROUTER_IP%:/www/luci-static/resources/view/speedtest/overview.js
scp -O files\www\cgi-bin\speedtest-run                        root@%ROUTER_IP%:/www/cgi-bin/speedtest-run

echo.
echo Restarting rpcd on router...
ssh root@%ROUTER_IP% "chmod +x /www/cgi-bin/speedtest-run && /etc/init.d/rpcd restart"

echo.
echo Done. Hard-refresh LuCI (Ctrl+Shift+R) and look for Status ^> Speed Test
echo.
echo NOTE: To remove, run on the router:
echo   apk del luci-app-speedtest
