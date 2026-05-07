#!/bin/sh
# OpenWRT 25.x uses apk, not opkg. IPK packages are no longer supported.
# Use build-apk.sh instead.
echo "ERROR: OpenWRT 25.x uses apk, not opkg. Run build-apk.sh instead." >&2
exit 1
