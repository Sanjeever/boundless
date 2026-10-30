---
title: A Hands-On Study of NeoKylin 7.6
date: 2026-08-07
tags:
  - Linux
  - NeoKylin
  - Sysadmin
  - GRUB
  - VMware
description: Starting from a locked, offline NeoKylin 7.6 VM, here is how I recovered access via GRUB and NetworkManager and dissected its RHEL 7.6 base and Spacewalk-based NKUC client.
outline: deep
aside: true
---

# A Hands-On Study of NeoKylin 7.6

<!-- DESC SEP -->

Starting from a locked, offline NeoKylin 7.6 VM, here is how I recovered access via GRUB and NetworkManager and dissected its RHEL 7.6 base and Spacewalk-based NKUC client.

<!-- DESC SEP -->

I was handed an ISO named `zbql7.6_v5u9.iso`. After installing it in VMware and booting to the desktop login screen, I ran into two immediate roadblocks: an ordinary user account existed, but I knew neither its password nor `root`’s, and the network icon in the corner read `NetworkManager needs to be running`.

A locked machine with no network sat in front of me—heureusement, I still had the VMware console.

## Recovering Passwords Through GRUB

I rebooted the VM, hit `e` at the GRUB menu, and appended the following to the kernel line starting with `linux` (or `linux16`):

```text
init=/bin/bash console=tty0
```

Pressing `Ctrl+x` dropped straight into a root shell prompt: `bash-4.2#`.

Running `passwd root` right away failed with:

```text
passwd: Authentication token manipulation error
```

When booting with `init=/bin/bash`, the root filesystem comes up read-only. Remounting `/` read-write fixed that:

```bash
mount -n -o remount,rw /
mount | grep ' on / '
# /dev/mapper/nlas-root on / type xfs (rw,relatime,attr2,inode64,noquota)
```

That line also gave away the storage layout: XFS on an LVM logical volume named `nlas-root`. Once `/` was writable, `passwd` updated both `root` and the regular user without complaint.

Before rebooting, I created `/.autorelabel` so SELinux would fix the security contexts on `/etc/shadow` at next boot:

```bash
touch /.autorelabel
sync
/sbin/reboot -f
```

## Bringing Up VMware NAT Networking

Logging into the desktop worked now, but the machine was still offline. Checking `NetworkManager` showed why:

```bash
systemctl status NetworkManager --no-pager -l
# inactive (dead)
```

The service was disabled. Starting it and connecting `ens33` brought the interface up immediately:

```bash
systemctl enable --now NetworkManager
nmcli device connect ens33
```

DHCP handed out a `192.168.182.x/24` address, and pings to the gateway, public IPs, and domain names all went through. Inspecting the connection profile revealed one more catch:

```bash
nmcli -f NAME,UUID,DEVICE,AUTOCONNECT connection show
```

`AUTOCONNECT` was set to `no`, meaning the interface would stay down on the next reboot. Flipping it to `yes` made the fix stick:

```bash
nmcli connection modify ens33 connection.autoconnect yes
```

| Symptom | Cause | Fix |
| --- | --- | --- |
| `passwd` fails with `Authentication token manipulation error` | `/` is mounted read-only under `init=/bin/bash` | Run `mount -n -o remount,rw /` before `passwd` |
| No network after login | `NetworkManager` service is stopped | `systemctl enable --now NetworkManager` and `nmcli device connect ens33` |
| Network drops after reboot | `AUTOCONNECT=no` on `ens33` | `nmcli connection modify ens33 connection.autoconnect yes` |

## Looking Under the Hood over SSH

With SSH working, I logged in from my terminal to see how the distribution was put together.

### Release Identity and Kernel

Reading `/etc/*release`:

```text
NeoKylin Linux Advanced Server release V7Update6 (Chromium)
NAME="NeoKylin Linux Advanced Server"
VERSION="V7Update6 (Chromium)"
ID="neokylin"
ID_LIKE="fedora"
VARIANT="Server"
VERSION_ID="V7Update6"
PRETTY_NAME="NeoKylin Linux Advanced Server V7Update6 (Chromium)"
Red Hat Enterprise Linux Server release 7.6 (Maipo)
```

Alongside its official product name (NeoKylin Linux Advanced Server V7Update6, codenamed Chromium), it preserves the `Red Hat Enterprise Linux Server release 7.6 (Maipo)` compatibility line.

Checking the running kernel:

```bash
uname -r
# 3.10.0-957.el7.x86_64

rpm -qi kernel-$(uname -r)
```

```text
Name        : kernel
Version     : 3.10.0
Release     : 957.el7
Source RPM  : kernel-3.10.0-957.el7.src.rpm
Build Host  : kojibuilder-ve
Packager    : NeoKylin Linux
Vendor      : CS2C
```

`3.10.0-957.el7` matches [RHEL 7.6’s initial release kernel](https://access.redhat.com/articles/red-hat-enterprise-linux-release-dates). Running `rpm -q --changelog kernel-$(uname -r)` shows a single `Modify for: neokylin-rpm-config` entry at the very top, followed by Red Hat’s standard patch history.

### Base Rebuilds and Custom Packages

Most core packages (`kernel`, `glibc`, `bash`, `systemd`, `yum`, `GNOME`, `OpenSSH`) carry `Vendor: CS2C` and `Packager: NeoKylin Linux`.

Filtering for packages unique to NeoKylin narrows the list down to:

```bash
rpm -qa | grep -Ei '^(neokylin|nkuc|yum-nkuc|license-client|System_)' | sort
```

```text
license-client-libs
neokylin-logos
neokylin-lsb-core
neokylin-lsb-submod-security
neokylin-menus
neokylin-release-server
nkuc-cert
nkuc-check
nkuc-client-tools
nkucsd
nkuc-setup
nkuc-setup-gnome
System_Administration-Adv
System_Installation-Adv
yum-nkuc-plugin
```

`neokylin-release-server` supplies `/etc/os-release`, RPM macros, GPG keys, and default repo files. The more intriguing group is the `nkuc*` suite.

## Unpacking the NKUC Client

Inspecting `nkucsd` gives away its lineage immediately:

```text
Summary     : Spacewalk query daemon
URL         : https://fedorahosted.org/spacewalk
Vendor      : CS2C
Packager    : NeoKylin Linux
```

NKUC is a repackaged Spacewalk / RHN management client. Tracing its files reveals a clean three-step chain:

1. **`nkucsd`**: A small C daemon that wakes up every 240 minutes (`INTERVAL=240` in `/etc/sysconfig/rhn/nkucsd`) and invokes `/usr/sbin/nkuc_check`.
2. **`nkuc_check`**: A Python script that reads `serverURL` and `systemIdPath` from `/etc/sysconfig/rhn/up2date` and polls the Spacewalk server over XML-RPC.
3. **Whitelisted actions**: Incoming method names are validated by `/usr/share/rhn/up2date_client/getMethod.py` and restricted to Python modules under `/usr/share/rhn/actions` that explicitly export functions via `__rhnexport__`.

Those exported functions cover:

- `packages.*` / `errata.update`: installing, updating, removing, and rolling back RPM packages via the YUM API, plus uploading package inventories;
- `hardware.refresh_list`: uploading hardware profiles;
- `reboot.reboot`: scheduling `/sbin/shutdown -r +3`;
- `rhnsd.configure` / `up2date_config.*` / `systemid.disable`: updating client settings or disabling registration.

On this particular VM, `/etc/sysconfig/rhn/systemid` does not exist and `serverURL` is still set to the placeholder `https://enter.your.server.url.here/XMLRPC`. The sole YUM repo entry (`file:///mnt`) is disabled as well, leaving `nkucsd` spinning quietly in the background with nowhere to phone home.

## Takeaway

Stripped to its essentials, this NeoKylin 7.6 image is a 2018–2019 Enterprise Linux 7.6 system (`3.10.0-957.el7` kernel, XFS on LVM, systemd, SELinux) topped with NeoKylin branding and a Spacewalk-based management agent. For legacy compatibility testing, treating it as an offline RHEL 7.6 box gets you almost all the way there.
