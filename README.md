# luci-app-speedtest

## WARNING - IN DEVELOPMENT STILL

A LuCI web interface for [speedtest-go](https://github.com/showwin/speedtest-go) on OpenWRT 25.x.

Adds a **Status → Speed Test** page to the OpenWRT web interface. Run a full network speed test (latency, download, upload, packet loss) from the router UI without needing shell access.

> **OpenWRT version:** Targets OpenWRT 25.x, which uses `apk` as its package manager and the JavaScript-based LuCI framework. It will not work on older OpenWRT versions that use `opkg` and Lua-based LuCI without modification.

---

## Features

- One-click speed test triggered from the browser
- Live progress display with phase indicators (Latency → Download → Upload → Packet Loss)
- Metric cards showing results with bufferbloat warning when download latency exceeds 100 ms
- Raw output log streamed in real time from `speedtest-go`
- CGI backend written in POSIX `sh` — no additional runtime dependencies
- LuCI menu entry is automatically hidden if the `speedtest-go` binary is not installed

---

## Prerequisites

### On the router

- OpenWRT 25.x with LuCI installed
- `speedtest-go` binary at `/usr/bin/speedtest-go` and marked executable

`speedtest-go` is not in the OpenWRT package feeds. Download the correct pre-compiled binary for your router's CPU architecture from the [speedtest-go releases page](https://github.com/showwin/speedtest-go/releases), copy it to the router, and make it executable:

```sh
# example for aarch64 — replace the filename with the correct architecture
scp speedtest-go_linux_arm64 root@192.168.1.1:/usr/bin/speedtest-go
ssh root@192.168.1.1 chmod +x /usr/bin/speedtest-go
```

Common OpenWRT CPU architectures and the matching speedtest-go release asset:

| Router CPU      | Architecture  | speedtest-go asset suffix |
|-----------------|---------------|---------------------------|
| MediaTek MT7621 | mips          | `linux_mips`              |
| MediaTek MT7622 | aarch64       | `linux_arm64`             |
| Qualcomm IPQ806x| arm           | `linux_arm`               |
| x86/x86_64      | amd64         | `linux_amd64`             |

---

## Installation

A pre-built `.apk` is attached to every [GitHub Release](../../releases/latest). Download the file and skip to Method 1 step 3 if you don't want to build from source.

Four methods are provided. Choose the one that fits your workflow.

### Method 1 — Build APK on the router, install with `apk` (recommended)

This gives full package management: `apk del luci-app-speedtest` cleanly removes everything.

```sh
# 1. Copy the repo to the router
scp -O -r . root@192.168.1.1:/tmp/luci-speedtest-go

# 2. SSH in and build the package
ssh root@192.168.1.1
sh /tmp/luci-speedtest-go/build-apk.sh

# 3. Install the generated package
apk add --allow-untrusted /tmp/luci-speedtest-go/luci-app-speedtest-1.0.0-r0.all.apk
```

`build-apk.sh` requires only tools present in every busybox build: `sh`, `tar`, `gzip`, `find`, `wc`, `date`. It prints the size of each intermediate stream and runs a gzip integrity check before assembling the final `.apk`, so any build failure will produce a clear error message.

### Method 2 — Direct SCP from Windows (no package build)

Files are copied directly to the router with `scp` and `rpcd` is restarted over SSH. No `.apk` is built, so `apk del` will not know about this install — use `uninstall.sh` (see [Removal](#removal)) instead.

Edit `ROUTER_IP` in `install.bat` if your router's LAN address is not `192.168.1.1`, then run:

```bat
install.bat
```

Requires OpenSSH (available in Windows 10/11) and the router reachable by hostname or IP.

### Method 3 — Shell installer on the router

SCP the repo to the router and run the installer script directly. Like Method 2, this bypasses package management.

```sh
scp -O -r . root@192.168.1.1:/tmp/luci-speedtest-go
ssh root@192.168.1.1 "sh /tmp/luci-speedtest-go/speedtest_install.sh"
```

### Method 4 — OpenWRT buildroot

To include this package in a custom OpenWRT firmware image, place this directory under `package/` in your OpenWRT build tree and run:

```sh
make package/luci-app-speedtest/compile
make package/luci-app-speedtest/install
```

The `Makefile` is a standard OpenWRT package Makefile. The build system generates a `.apk` for OpenWRT 25.x automatically. The `postinst`/`prerm`/`postrm` macros are translated to `.post-install` / `.pre-deinstall` / `.post-deinstall` apk script names by the build system.

---

## After installation

Hard-refresh LuCI in your browser (`Ctrl+Shift+R`) and navigate to **Status → Speed Test**.

If the menu item does not appear:

1. Confirm the binary exists and is executable: `ls -la /usr/bin/speedtest-go`
2. Confirm the menu file was installed: `cat /usr/share/luci/menu.d/luci-app-speedtest.json`
3. Restart rpcd manually: `/etc/init.d/rpcd restart`

---

## Removal

### If installed with `apk` (Method 1)

```sh
apk del luci-app-speedtest
```

This runs `.pre-deinstall` (kills any running speedtest process, removes `/tmp/speedtest.log`) then removes all installed files, then runs `.post-deinstall` (restarts rpcd so the ACL and menu entry are unloaded).

### If installed without `apk` (Methods 2 or 3)

Run this on the router:

```sh
rm -f /usr/share/luci/menu.d/luci-app-speedtest.json
rm -f /usr/share/rpcd/acl.d/luci-app-speedtest.json
rm -f /www/luci-static/resources/view/speedtest/overview.js
rm -f /www/cgi-bin/speedtest-run
rm -f /tmp/speedtest.log /tmp/speedtest.pid
/etc/init.d/rpcd restart
```

---

## How it works

```
Browser (LuCI JS view)
    │
    │  GET /cgi-bin/speedtest-run?action=start
    │  GET /cgi-bin/speedtest-run?action=poll   (every 1.5 s)
    ▼
CGI script (/www/cgi-bin/speedtest-run)
    │  forks speedtest-go to background
    │  writes stdout line-by-line to /tmp/speedtest.log
    │  tracks PID in /tmp/speedtest.pid
    │  poll returns JSON { status, lines[] }
    ▼
speedtest-go (/usr/bin/speedtest-go)
    connects to Ookla speedtest network
```

The JS view polls the CGI every 1.5 seconds and parses each output line with regex to update the metric cards and phase progress bar in real time. ANSI escape codes and non-ASCII spinner characters are stripped by the CGI before returning JSON.

---

## File structure

```
luci-speedtest-go/
│
├── files/                                          # Package content (install paths)
│   ├── usr/share/luci/menu.d/
│   │   └── luci-app-speedtest.json                 # LuCI menu entry (Status > Speed Test)
│   ├── usr/share/rpcd/acl.d/
│   │   └── luci-app-speedtest.json                 # rpcd ACL (file read/write/exec grants)
│   ├── www/luci-static/resources/view/speedtest/
│   │   └── overview.js                             # LuCI JavaScript view
│   └── www/cgi-bin/
│       └── speedtest-run                           # CGI backend (POSIX sh)
│
├── Makefile                                        # OpenWRT buildroot package Makefile
├── build-apk.sh                                    # Standalone APK builder (busybox-compatible)
├── speedtest_install.sh                            # On-router shell installer (no apk)
└── install.bat                                     # Windows direct-SCP installer
```

---

## Troubleshooting

**Speed Test menu item is missing**

The menu entry has a filesystem guard — it will not appear unless `/usr/bin/speedtest-go` exists and is executable. Install the binary first (see [Prerequisites](#prerequisites)).

**"Could not reach CGI backend" error in the UI**

The CGI script is not executable or not in the right location. Verify:
```sh
ls -la /www/cgi-bin/speedtest-run   # should show -rwxr-xr-x
```

**The test starts but no results appear**

`speedtest-go` output format may differ between versions. The JS view parses specific line patterns. Confirm the binary works standalone:
```sh
/usr/bin/speedtest-go
```
If the output lines do not match patterns like `Latency: 12.3ms Jitter: 1.2ms Min: 10.0ms Max: 15.0ms`, open an issue with the output.

**`apk add` returns "unexpected end of file"**

The APK format compatibility with the specific apk-tools version on your router is still being verified. Use Method 2 or 3 (direct install) as a reliable fallback while this is resolved.

**`build-apk.sh` fails with "not found"**

Busybox on some routers omits certain utilities. The script requires only: `sh`, `tar`, `gzip`, `find`, `wc`, `date`, `cat`, `mkdir`, `cp`, `chmod`, `mktemp`. If any of these are missing, use Method 2 or 3 instead.

---

## License

MIT
