#!/bin/sh
# Convenience wrapper — delegates to speedtest_install.sh
exec "$(dirname "$0")/speedtest_install.sh" "$@"
