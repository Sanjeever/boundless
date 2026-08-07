---
title: A hands-on study of NeoKylin 7.6
date: 2026-08-07
tags:
  - Linux
  - NeoKylin
  - Sysadmin
  - GRUB
  - VMware
description: I got an image named zbql7.6_v5u9.iso, installed it in VMware, and found I knew no password and the system had no network. I reset the password through GRUB, restored networking, then used SSH to dissect how NeoKylin 7.6 relates to RHEL 7.6 and how its NKUC/Spacewalk centralized management works.
outline: deep
aside: true
---

# A hands-on study of NeoKylin 7.6

<!-- DESC SEP -->

I got an image named `zbql7.6_v5u9.iso` and, after installing it in VMware, found I knew no password and the system had no network. A "locked" virtual machine sat in front of me, with the console in hand but no way to log in.

<!-- DESC SEP -->

I got a system image named `zbql7.6_v5u9.iso` and installed it in VMware. I knew neither the pre-provisioned user's password nor root's, and after logging in there was no network. This post records how I restored access through GRUB, got networking back, and then worked through SSH to unpack the distribution's identity, its RPM build differences, and the NKUC/Spacewalk centralized-management mechanism. I'll keep the technical judgments measured and distinguish clearly between what I actually observed and what I inferred from it.

## Two problems after getting the image

This isn't an official release, just an installation medium I got, named `zbql7.6_v5u9.iso`. After installing with the default VMware NAT network, the system came with a pre-provisioned ordinary user. The issue was that I knew neither that user's password nor root's, so I couldn't log in.

Worse, the login screen let me switch to the user, but no combination got me in. And the system had no network at all, with the desktop network icon reporting `NetworkManager needs to be running`. No password and no network meant a "locked" machine.

The saving grace was that this is a VM, so I have console access. That gave me a standard way to recover, by modifying the kernel boot parameters through GRUB to reach a single-user-style environment. That requires the VM console or a physical console, and it is not a remote intrusion path.

## Restoring access through GRUB

Reboot, select the boot entry in the GRUB menu, press `e` to edit, and append to the kernel parameter line (the one starting with `linux` or `linux16`).

```text
init=/bin/bash console=tty0
```

Press `Ctrl+x` to boot, and you land in a bash environment that drops straight into a root shell.

```text
bash-4.2#
```

My first attempt to reset the passwords.

```bash
passwd root
passwd <普通用户名>
```

Both commands failed the same way.

```text
passwd: Authentication token manipulation error
```

That error means `passwd` couldn't write the change into `/etc/shadow`. After some investigation the root cause was clear. When you boot with `init=/bin/bash`, the root filesystem is mounted read-only by default, so `passwd` can't write the password database. The fix is to remount it read-write.

```bash
mount -n -o remount,rw /
```

Confirm the mount state, with the key line from `mount | grep ' on / '`.

```bash
mount | grep ' on / '
```

```text
/dev/mapper/nlas-root on / type xfs (rw,relatime,attr2,inode64,noquota)
```

Note the `rw` is now in effect, and it also shows the root filesystem is XFS on a logical volume named `nlas-root`. With the mount writable, reset the passwords for `root` and `普通用户`.

```bash
passwd root
passwd <普通用户名>
```

If it warns about a weak password, that's only a warning, not a failure. The real success marker is `passwd: all authentication tokens updated successfully.`

After changing the passwords, I did three things before rebooting.

```bash
touch /.autorelabel
sync
/sbin/reboot -f
```

`touch /.autorelabel` makes SELinux re-check file labels at next boot, because I modified files in a single-user environment where labels may be incomplete, and skipping this could leave some services unable to start after reboot. `sync` flushes the cached changes to disk. After the reboot, both root and the ordinary user can log in with the new passwords.

The password-change chain in one diagram.

```text
passwd command ✅
  → PAM password handling ✅
    → write to /etc/shadow
      → fails when root fs is read-only ❌
      → succeeds after remount rw ✅
```

## Restoring VMware NAT networking

I could log in now, but there was still no network. The desktop network icon reported `NetworkManager needs to be running`.

The system initially saw only the loopback interface, not a working VMware NIC. Start by checking the NetworkManager service.

```bash
systemctl status NetworkManager --no-pager -l
```

It was inactive.

```text
inactive (dead)
```

Start it and enable it at boot.

```bash
systemctl enable --now NetworkManager
```

Check devices, and the system now recognizes NIC `ens33`, just not connected.

```bash
nmcli device status
```

Bring up the NIC.

```bash
nmcli device connect ens33
```

Check the address, and the NIC got `192.168.182.x/24` via DHCP.

```bash
ip -4 addr show ens33
```

Check routing, and the default gateway is `192.168.182.2`.

```bash
ip route
```

Then three connectivity tests.

```bash
ping -c 4 192.168.182.2
ping -c 4 223.5.5.5
ping -c 4 www.baidu.com
```

All three succeeded, confirming respectively that the VM reaches the VMware NAT gateway, public IPs are reachable, and DNS resolution works. The network came up layer by layer.

```text
VMware NAT ✅
  → virtual NIC ens33 ✅
    → NetworkManager ✅
      → DHCP address ✅
        → default route ✅
          → public access ✅
            → DNS resolution ✅
```

There was still a catch. If I'd only connected manually, the network might not survive a reboot. Check the connection's auto-connect flag.

```bash
nmcli -f NAME,UUID,DEVICE,AUTOCONNECT connection show
```

It showed `AUTOCONNECT=no`, meaning networking worked this boot only because I connected by hand, and it could drop again after a restart. Set it to auto-connect.

```bash
nmcli connection modify ens33 connection.autoconnect yes
```

Verify the change.

```bash
nmcli -f NAME,DEVICE,AUTOCONNECT connection show
```

```text
ens33  ens33  yes
```

Networking now restores on its own after a reboot. With access and the network working, I logged in over SSH to study the system.

Here are the faults so far, summarized.

| Fault | Cause | Fix |
| --- | --- | --- |
| `passwd` reports `Authentication token manipulation error` | root filesystem mounted read-only under `init=/bin/bash` | remount `rw` with `mount -n -o remount,rw /`, then set the passwords |
| No network | NetworkManager service is stopped | `systemctl enable --now NetworkManager`, then connect `ens33` manually |
| Network may not survive a reboot | `AUTOCONNECT=no` | `nmcli connection modify ens33 connection.autoconnect yes` |

## Dissecting the system over SSH

With the network and passwords in hand, I logged in over SSH and unpacked the system from several angles, including distribution identity, kernel, RPM builds, customization packages, and virtual hardware.

### Distribution identity

Start with how the system declares itself.

```bash
cat /etc/*release
```

Here's the key output.

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

This confirms that the product name is NeoKylin Linux Advanced Server, version V7Update6, codename Chromium, and that the system keeps the RHEL 7.6 compatibility identifier. More precisely, judging from these identifiers, it appears highly based on or compatible with RHEL 7.6, inheriting the Enterprise Linux 7 stack represented by RPM, YUM, systemd, and SELinux.

### Kernel

Check the running kernel.

```bash
uname -a
```

```text
Linux localhost.localdomain 3.10.0-957.el7.x86_64 #1 SMP Fri Jan 11 17:34:50 CST 2019 x86_64 x86_64 x86_64 GNU/Linux
```

Then the kernel package info.

```bash
rpm -qi kernel-$(uname -r)
```

Here are the key fields.

```text
Name        : kernel
Version     : 3.10.0
Release     : 957.el7
Source RPM  : kernel-3.10.0-957.el7.src.rpm
Build Host  : kojibuilder-ve
Packager    : NeoKylin Linux
Vendor      : CS2C
```

The kernel version and Source RPM match RHEL 7.6's `3.10.0-957.el7`. Look at the top of the kernel changelog.

```bash
rpm -q --changelog kernel-$(uname -r) | head -n 50
```

At the top is NeoKylin's own build entry.

```text
Modify for: neokylin-rpm-config
```

Below it, the bulk of the records are Red Hat's kernel patch history, including CVE fixes and hardware-support updates. That indicates the patch history is mostly inherited from Red Hat, and NeoKylin did its own build, signing, and release. I should be careful. This changelog alone can't prove that all source differences are limited to this one entry, since it records build-level activity, not every source-level change.

### The RPM rebuild

Query which packages carry NeoKylin's build identity.

```bash
rpm -qa --qf '%{NAME}\t%{VENDOR}\t%{PACKAGER}\n' |
grep -Ei 'NeoKylin|CS2C' |
sort
```

A large set of base packages carry `Vendor: CS2C` and `Packager: NeoKylin Linux`.

```text
Vendor   : CS2C
Packager : NeoKylin Linux
```

Including kernel, glibc, bash, systemd, yum, rpm, GNOME, NetworkManager, SELinux, OpenSSH, libvirt, Xorg, and open-vm-tools. That indicates NeoKylin builds, signs, and ships a broad set of Enterprise Linux packages uniformly.

But here's the distinction. The `Vendor` and `Packager` fields only prove the package was built or repackaged by NeoKylin, and they can't, on their own, prove how much of the source actually changed.

```text
Vendor/Packager fields
  → prove NeoKylin built or packaged it ✅
    → can't alone prove how much source changed ❌
```

### NeoKylin's own customization packages

Filter out the packages that are clearly NeoKylin-specific.

```bash
rpm -qa |
grep -Ei '^(neokylin|nkuc|yum-nkuc|license-client|System_)' |
sort
```

Here are the key packages.

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

These make up NeoKylin's branding, release identity, licensing, and centralized-ops customization layer on top of base Enterprise Linux. The files shipped by `neokylin-release-server` show where the "distribution identity" concretely lives.

```text
/etc/os-release
/etc/redhat-release
/etc/neokylin-release
/etc/system-release
/etc/system-release-cpe
/etc/rpm/macros.dist
/etc/yum.repos.d/ns7-adv.repo
/etc/pki/rpm-gpg/RPM-GPG-KEY-neokylin-release
/usr/bin/nkvers
/usr/lib/systemd/system-preset/85-display-manager.preset
/usr/lib/systemd/system-preset/90-default.preset
/usr/share/neokylin-release/EULA
```

It handles the distribution name and version identifier, the RHEL compatibility identifier, RPM dist macros, the RPM GPG public key, default YUM repository config, systemd service presets, and the license agreement plus a version query tool.

### Storage and VMware virtual hardware

Here's the storage layout.

```bash
lsblk -f
```

```text
sda
├─sda1        xfs          /boot
└─sda2        LVM2_member
  ├─nlas-root xfs          /
  └─nlas-swap swap         [SWAP]
```

The system uses XFS, with root and swap managed by LVM and `/boot` as a separate XFS partition, which also matches the `nlas-root` logical volume name from earlier. `lspci` shows standard VMware virtual hardware (a SVGA II GPU, an LSI 53c1030 SCSI controller, and PCI/IDE bridges, among others), and the system ships `open-vm-tools` plus VMware's Xorg drivers, indicating it's adapted for VMware virtualization.

## NKUC, Spacewalk, and centralized management

The most interesting of the customization packages are the ones starting with `nkuc`. They form NeoKylin's centralized-ops client, essentially a repackaging of the Spacewalk/RHN system. I traced the line from "daemon → check script → whitelisted actions → actual execution."

### nkucsd (the scheduling daemon)

```bash
rpm -qi nkucsd
```

Here's the key output.

```text
Summary     : Spacewalk query daemon
URL         : https://fedorahosted.org/spacewalk
Vendor      : CS2C
Packager    : NeoKylin Linux
```

The `Summary` literally reads "Spacewalk query daemon," and `nkucsd` is essentially NeoKylin's repackaging of the Spacewalk/RHN query daemon. Which files does it ship?

```bash
rpm -ql nkucsd
```

Here are the key files.

```text
/etc/rc.d/init.d/nkucsd
/etc/sysconfig/rhn
/etc/sysconfig/rhn/nkucsd
/usr/sbin/nkucsd
```

It uses the traditional SysV init script, hosted by systemd's compatibility mechanism.

```text
/etc/rc.d/init.d/nkucsd
  → systemd-sysv-generator
    → nkucsd.service
```

Here's the check interval.

```bash
cat /etc/sysconfig/rhn/nkucsd
```

```text
INTERVAL=240
```

That's every 240 minutes, or every 4 hours. Next, the non-comment, non-empty lines of the update-client config.

```bash
grep -Ev '^[[:space:]]*(#|$)' /etc/sysconfig/rhn/up2date
```

Here's the key config.

```text
systemIdPath=/etc/sysconfig/rhn/systemid
serverURL=https://enter.your.server.url.here/XMLRPC
sslCACert=/usr/share/nkuc/NKUC-CA-CERT
noReboot=0
stagingContent=1
stagingContentWindow=24
```

Check whether the system has registered.

```bash
ls -l /etc/sysconfig/rhn/systemid
```

```text
No such file or directory
```

`systemid` doesn't exist, so this system never completed NKUC/Spacewalk registration. Even though the service is running.

```bash
systemctl status nkucsd --no-pager -l
```

```text
Spacewalk Services Daemon starting up, check in interval 240 minutes.
```

The current state is that `nkucsd` runs, `systemid` is absent, and `serverURL` is still a placeholder, so it can't reach a real NKUC platform and won't fetch or execute remote actions.

```text
nkucsd running ✅
  → systemid missing ❌
    → serverURL still a placeholder ❌
      → can't reach a real NKUC platform
        → won't fetch or run remote actions ✅
```

### nkuc_check (the script that actually connects)

Inspect both programs' file type and dependencies.

```bash
file /usr/sbin/nkucsd
ldd /usr/sbin/nkucsd
```

`nkucsd` is a 64-bit x86_64 ELF program, stripped of debug symbols, with essentially only glibc as a dynamic dependency. Meanwhile `nkuc_check` is this kind of file.

```bash
file /usr/sbin/nkuc_check
```

```text
Python script, ASCII text executable
```

`nkuc_check` is a Python script. Combined with the man pages, the division of labor is clear. `nkucsd` is only the scheduling daemon and doesn't connect to the network itself. When its check interval arrives it invokes the external program `nkuc_check`, which is the one that contacts the Spacewalk server. The unregistered flow today is the following.

```text
nkucsd wakes on schedule
  → runs nkuc_check ✅
    → checks the process lock ✅
      → checks the disabled flag ✅
        → reads systemid
          → currently missing, exits ❌
```

The full logic once registered is the following.

```text
nkuc_check
  → reads up2date config
    → opens an XML-RPC connection
      → fetches the server action queue
        → runs local whitelisted actions
          → reports results back to the server
```

### The remote-action whitelist

`nkuc_check` doesn't let the server push arbitrary Python code. Remote methods are mapped to local functions through `/usr/share/rhn/up2date_client/getMethod.py`, with several layers of restriction.

1. Method names may contain only letters, digits, and underscores.
2. Methods must live under `/usr/share/rhn/actions`.
3. Modules must explicitly export methods via `__rhnexport__`.
4. Methods not on the whitelist can't be called.

The mapping chain is as follows.

```text
Spacewalk returns method + params
  → validate method name ✅
    → locate the /usr/share/rhn/actions module ✅
      → check the __rhnexport__ whitelist ✅
        → call the local Python function ✅
```

The actually exported actions include the following.

```text
errata.update

hardware.refresh_list

packages.update
packages.remove
packages.refresh_list
packages.fullUpdate
packages.checkNeedUpdate
packages.runTransaction
packages.verify

reboot.reboot

rhnsd.configure

systemid.disable

up2date_config.update
up2date_config.rpmmacros
up2date_config.get
```

That covers installing, updating, and removing packages; full system update; package rollback; package verification; uploading the installed-package list; uploading hardware info; changing update-client config; adjusting the check interval; disabling the client identity; and remote reboot. To be clear, this is not a general-purpose remote shell, but these actions run as root, so it is a centralized-ops client with fairly high system privileges. That whitelist is the boundary that defines what a central manager can and can't do on a client. Either it can't touch the client at all, or it can only run these preset action types, so the client is not a freely operable machine.

### Remote reboot and package management

`reboot.py` invokes `/sbin/shutdown -r +3`.

```bash
/sbin/shutdown -r +3
```

It schedules a reboot 3 minutes after receiving the action. The config `noReboot=0` means remote reboot is allowed, and setting `noReboot=1` makes the client refuse to execute it.

`packages.py` uses the Python 2 YUM API to manage packages, supporting install, update, remove, full update, rollback, verify, and profile refresh. Before each transaction it runs repository resolution, dependency calculation, package download, RPM GPG signature check, and a YUM transaction test, then executes, and finally reports the result back to the server.

```text
server sends a package action
  → nkuc_check parses the XML-RPC ✅
    → packages.py builds a YUM transaction ✅
      → dependency resolution and transaction test ✅
        → GPG signature check ✅
          → root executes install/upgrade/remove/rollback ✅
            → result reported back to the server ✅
```

`packages.refresh_list()` collects the local RPM package list and uploads it to the central management server, and `packages.verify()` checks whether specified packages are missing or files are anomalous.

### The YUM plugin and repository state

`yum-nkuc-plugin` ships the plugin config, `/usr/share/rhn/actions/packages.py`, `errata.py`, and `/var/lib/up2date`. The plugin config is as follows.

```ini
[main]
enabled = 0
gpgcheck = 1
timeout = 120
```

`enabled = 0` means the NKUC YUM plugin is currently disabled. The system's only repository config is the following.

```ini
[rhel-source]
name=Neoky7.6
baseurl=file:///mnt
enabled=0
gpgcheck=0
```

So there are no usable YUM sources right now. No online repository is enabled, the only repo points at `/mnt` and is itself disabled, and the installation ISO was removed from the VM, so `/mnt` has nothing mounted. I won't guess at NeoKylin's official repository addresses, nor invent a working mirror. For a freshly installed system that means installing software requires first mounting installation media or configuring a trusted repository yourself, since there's no out-of-the-box source.

Here's the main set of components I unpacked and where they come from or what they do.

| Component | Origin or role |
| --- | --- |
| `neokylin-release-server` | distro name/version identity, RHEL compatibility identifier, RPM macros, GPG public key, default repo config, systemd presets |
| `nkucsd` | repackaged Spacewalk/RHN query daemon; SysV init script hosted by systemd-sysv-generator, invokes `nkuc_check` every 4 hours |
| `nkuc_check` | Python script that contacts the Spacewalk server, fetches the action queue, and reports results |
| `__rhnexport__` whitelist | constrains remote methods to local functions explicitly exported under `/usr/share/rhn/actions`, so the server can't push arbitrary code |
| `yum-nkuc-plugin` | integrates YUM with NKUC; currently disabled with `enabled = 0` |
| kernel / glibc / systemd and other base packages | `Vendor: CS2C`, `Packager: NeoKylin Linux`, built and signed uniformly by NeoKylin |

## Summary

- **Password recovery** Boot GRUB with `init=/bin/bash` to reach a root shell; the read-only root filesystem stopped `passwd` from writing `/etc/shadow`; after `mount -n -o remount,rw /`, the reset worked, and `/.autorelabel` had SELinux relabel.
- **Network recovery** The stopped NetworkManager was the cause; `enable --now` plus manually connecting `ens33` got DHCP addressing, routing, and DNS working layer by layer, and `autoconnect yes` keeps it working after reboot.
- **RHEL 7.6 compatibility base** Officially NeoKylin Linux Advanced Server V7Update6 (Chromium), kernel `3.10.0-957.el7`, using the Enterprise Linux 7 stack of RPM, YUM, systemd, SELinux, GNOME, NetworkManager, XFS, and LVM.
- **NeoKylin rebuild and customization layer** A broad set of base packages is rebuilt and signed by CS2C/NeoKylin; `Vendor`/`Packager` proves the build's origin but not the extent of source changes. On top of the base, NeoKylin adds branding and release identity, GPG signing, the NKUC client, a Spacewalk/RHN-compatible system, and licensing and admin components.
- **NKUC centralized management** `nkucsd` schedules, `nkuc_check` does the network work, and remote methods are mapped to local functions through the `__rhnexport__` whitelist, giving root-level abilities to install/upgrade/remove/rollback packages, report assets, adjust config, and reboot remotely. This build is not registered (no `systemid`, placeholder `serverURL`, YUM plugin disabled), so it performs no real remote actions.

This system's software baseline dates mostly from 2018—2019. It suits historical compatibility testing, research on domestic OSes, learning Enterprise Linux 7 administration, or validating legacy commercial software. If you plan to use it on a new networked production system, you must first confirm vendor support status, the source of security updates, repository availability, vulnerability-fix status, and business-application compatibility, and it needs a full evaluation and ongoing security updates, not a simple yes or no.

## A note on security

Being able to get into GRUB and change boot parameters means you have the VM console or a physical console. It's a standard admin recovery path, but also a path that needs protecting. On a real production system, consider a GRUB password, disk encryption, restricted physical access, and a controlled recovery procedure, so that anyone with console access can't reset passwords or tamper with boot configuration.