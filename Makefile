# OpenWRT 25.x buildroot package Makefile (generates .apk via apk package manager)
# Place this directory under package/ in your OpenWRT tree, then:
#   make package/luci-app-speedtest/compile
#   make package/luci-app-speedtest/install
# The build system translates postinst/prerm/postrm into apk script names automatically.

include $(TOPDIR)/rules.mk

PKG_NAME:=luci-app-speedtest
PKG_VERSION:=1.0.0
PKG_RELEASE:=1

PKG_MAINTAINER:=Glen Appleby <gappleby@gappleby.com>
PKG_LICENSE:=MIT

include $(INCLUDE_DIR)/package.mk

define Package/luci-app-speedtest
  SECTION:=luci
  CATEGORY:=LuCI
  SUBMENU:=3. Applications
  TITLE:=LuCI Speed Test (speedtest-go)
  DEPENDS:=+luci-base
  PKGARCH:=all
endef

define Package/luci-app-speedtest/description
  LuCI web interface for the speedtest-go network speed test utility.
  Adds a Status > Speed Test page to the OpenWrt web interface.
  Requires speedtest-go binary installed at /usr/bin/speedtest-go.
endef

define Build/Prepare
endef

define Build/Configure
endef

define Build/Compile
endef

define Package/luci-app-speedtest/install
	$(INSTALL_DIR) $(1)/usr/share/luci/menu.d
	$(INSTALL_DATA) ./files/usr/share/luci/menu.d/luci-app-speedtest.json \
		$(1)/usr/share/luci/menu.d/luci-app-speedtest.json

	$(INSTALL_DIR) $(1)/usr/share/rpcd/acl.d
	$(INSTALL_DATA) ./files/usr/share/rpcd/acl.d/luci-app-speedtest.json \
		$(1)/usr/share/rpcd/acl.d/luci-app-speedtest.json

	$(INSTALL_DIR) $(1)/www/luci-static/resources/view/speedtest
	$(INSTALL_DATA) ./files/www/luci-static/resources/view/speedtest/overview.js \
		$(1)/www/luci-static/resources/view/speedtest/overview.js

	$(INSTALL_DIR) $(1)/www/cgi-bin
	$(INSTALL_BIN) ./files/www/cgi-bin/speedtest-run \
		$(1)/www/cgi-bin/speedtest-run
endef

define Package/luci-app-speedtest/postinst
#!/bin/sh
[ -z "$${IPKG_INSTROOT}" ] || exit 0
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
exit 0
endef

define Package/luci-app-speedtest/prerm
#!/bin/sh
[ -z "$${IPKG_INSTROOT}" ] || exit 0
if [ -f /tmp/speedtest.pid ]; then
	kill "$$(cat /tmp/speedtest.pid)" 2>/dev/null || true
	rm -f /tmp/speedtest.pid
fi
rm -f /tmp/speedtest.log
exit 0
endef

define Package/luci-app-speedtest/postrm
#!/bin/sh
[ -z "$${IPKG_INSTROOT}" ] || exit 0
/etc/init.d/rpcd restart 2>/dev/null || true
exit 0
endef

$(eval $(call BuildPackage,luci-app-speedtest))
