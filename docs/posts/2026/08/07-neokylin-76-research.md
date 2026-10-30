---
title: NeoKylin 7.6 实机研究
date: 2026-08-07
tags:
  - Linux
  - 中标麒麟
  - 系统运维
  - GRUB
  - VMware
description: 从一台没有密码、断网的 NeoKylin 7.6 虚拟机出发，记下通过 GRUB 与 NetworkManager 恢复访问，并拆解其 RHEL 7.6 底座与 NKUC 运维客户端的过程。
outline: deep
aside: true
---

# NeoKylin 7.6 实机研究

<!-- DESC SEP -->

从一台没有密码、断网的 NeoKylin 7.6 虚拟机出发，记下通过 GRUB 与 NetworkManager 恢复访问，并拆解其 RHEL 7.6 底座与 NKUC 运维客户端的过程。

<!-- DESC SEP -->

手头拿到一份名为 `zbql7.6_v5u9.iso` 的镜像。在 VMware 里装完开机，迎面撞上两件尴尬事：系统预置了账号，但我既不知道普通用户密码，也不知道 `root` 密码；桌面右上角的网络图标还挂着一行 `NetworkManager needs to be running`。

一台没密码、没网络的虚拟机摆在面前，好在控制台还在自己手里。

## 从 GRUB 拿回密码

重启虚拟机，停在 GRUB 菜单时按 `e` 编辑启动项，在 `linux`（或 `linux16`）开头的内核参数行末尾加上：

```text
init=/bin/bash console=tty0
```

按 `Ctrl+x` 启动，屏幕直接落进 `bash-4.2#`。

一上来直接敲 `passwd root`，立刻吃了一记报错：

```text
passwd: Authentication token manipulation error
```

原因不复杂：`init=/bin/bash` 启动时，根文件系统默认是只读挂载的。先把 `/` 重新挂载成可写：

```bash
mount -n -o remount,rw /
mount | grep ' on / '
# /dev/mapper/nlas-root on / type xfs (rw,relatime,attr2,inode64,noquota)
```

顺带能看到根分区是 XFS 文件系统，逻辑卷名叫 `nlas-root`。变成 `rw` 之后，再改 `root` 和普通用户的密码就一路顺畅了。

重启前别忘了给 SELinux 留个重打标签的标记，免得单用户下改过 `/etc/shadow` 导致重启后登不进去：

```bash
touch /.autorelabel
sync
/sbin/reboot -f
```

## 拉起 VMware NAT 网络

用新密码进了桌面，网络还是断的。查一眼 `NetworkManager`：

```bash
systemctl status NetworkManager --no-pager -l
# inactive (dead)
```

服务压根没起。把它拉起来并设为开机自启，再连上网卡 `ens33`：

```bash
systemctl enable --now NetworkManager
nmcli device connect ens33
```

DHCP 顺利分到了 `192.168.182.x/24`，网关、公网 IP 和域名都能 ping 通。不过检查连接属性时发现了一个小坑：

```bash
nmcli -f NAME,UUID,DEVICE,AUTOCONNECT connection show
```

`ens33` 的 `AUTOCONNECT` 居然是 `no`——也就是说，这次是手动连上的，下次重启照样断网。顺手把它改成自动连接：

```bash
nmcli connection modify ens33 connection.autoconnect yes
```

| 故障现象 | 原因 | 处理命令 |
| --- | --- | --- |
| `passwd` 报 `Authentication token manipulation error` | `init=/bin/bash` 下根分区默认只读 | `mount -n -o remount,rw /` 后再改密码 |
| 开机后无网络 | `NetworkManager` 服务未启用 | `systemctl enable --now NetworkManager` 并连接 `ens33` |
| 重启后网络不自动恢复 | 网卡配置 `AUTOCONNECT=no` | `nmcli connection modify ens33 connection.autoconnect yes` |

## 拆看系统底座

网络通了，切到自己顺手的终端用 SSH 连上去，看看这套系统里面到底装了什么。

### 发行标识与内核

先看 `/etc/*release`：

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

正式名称是中标麒麟高级服务器操作系统 V7Update6（代号 Chromium），底下同时保留了 `Red Hat Enterprise Linux Server release 7.6 (Maipo)` 的兼容行。

再看内核：

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

`3.10.0-957.el7` 正好对应 [RHEL 7.6 首发内核](https://access.redhat.com/articles/red-hat-enterprise-linux-release-dates)。翻看 `rpm -q --changelog kernel-$(uname -r)`，最顶上是一条 `Modify for: neokylin-rpm-config`，往下则是长长的 Red Hat 内核补丁记录。

### 基础包与定制包

扫一遍系统里的 RPM 包，`kernel`、`glibc`、`bash`、`systemd`、`yum`、`GNOME`、`OpenSSH` 等基础组件大多带着 `Vendor: CS2C` 和 `Packager: NeoKylin Linux` 的重编译标识。

属于中标麒麟自家的定制包则集中在这一组：

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

其中 `neokylin-release-server` 管着 `/etc/os-release`、GPG 密钥和默认仓库配置；而最引人好奇的，是那一串 `nkuc` 开头的包。

## 顺藤摸瓜看 NKUC 客户端

查一下 `nkucsd` 的包信息，底牌直接亮了出来：

```text
Summary     : Spacewalk query daemon
URL         : https://fedorahosted.org/spacewalk
Vendor      : CS2C
Packager    : NeoKylin Linux
```

原来 NKUC 是基于 Spacewalk / RHN 体系打包的集中运维客户端。顺着文件列表往下摸，整条调用链很清楚：

1. **`nkucsd`**：一个精简的 C 语言守护进程，按 `/etc/sysconfig/rhn/nkucsd` 里的 `INTERVAL=240` 每 4 小时唤醒一次。它自己不联网，只负责定时调用 `/usr/sbin/nkuc_check`。
2. **`nkuc_check`**：一个 Python 脚本，读取 `/etc/sysconfig/rhn/up2date` 里的 `serverURL` 和 `systemIdPath`，通过 XML-RPC 向服务端拉取动作队列。
3. **白名单分发**：拉到的远程方法经过 `/usr/share/rhn/up2date_client/getMethod.py` 校验，只能调用 `/usr/share/rhn/actions` 目录下通过 `__rhnexport__` 显式导出的 Python 函数。

实际导出的动作包括：

- `packages.*` / `errata.update`：调用 YUM API 安装、更新、卸载、回滚软件包，或上报本机软件列表；
- `hardware.refresh_list`：上报硬件清单；
- `reboot.reboot`：调用 `/sbin/shutdown -r +3` 在三分钟后重启机器；
- `rhnsd.configure` / `up2date_config.*` / `systemid.disable`：修改客户端配置或禁用注册身份。

虽然不能直接下发任意 Shell 命令，但因为整套客户端以 `root` 身份跑，只要连上管控端，装包和重启依然握有整台机器的控制权。

不过在这台虚拟机里，`/etc/sysconfig/rhn/systemid` 并不存在，`serverURL` 也是默认的占位符 `https://enter.your.server.url.here/XMLRPC`；YUM 仓库列表里唯一的 `file:///mnt` 同样处于 `enabled=0` 状态。也就是说，`nkucsd` 虽然在后台空转，却哪儿也连不上。

## 小结

拆完一圈，这份 NeoKylin 7.6 镜像的轮廓就很清晰了：底子是 2018—2019 年前后的 Enterprise Linux 7.6（`3.10.0-957.el7` 内核、XFS + LVM、systemd、SELinux），上面叠了一层 `neokylin-release` 品牌标识和基于 Spacewalk 的 NKUC 运维客户端。日常拿来做旧环境兼容测试时，把它当成一台没有配好在线 YUM 源的 RHEL 7.6 来打理就八九不离十了。
