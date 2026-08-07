---
title: NeoKylin 7.6 实机研究
date: 2026-08-07
tags:
  - Linux
  - 中标麒麟
  - 系统运维
  - GRUB
  - VMware
description: 我拿到一份名为 zbql7.6_v5u9.iso 的镜像，在 VMware 里安装后发现不知道任何密码、系统也没有网络。我通过 GRUB 重置密码、恢复网络，再通过 SSH 拆解了 NeoKylin 7.6 与 RHEL 7.6 的关系，以及 NKUC/Spacewalk 集中运维机制。
outline: deep
aside: true
---

# NeoKylin 7.6 实机研究

<!-- DESC SEP -->

我拿到一份名为 `zbql7.6_v5u9.iso` 的镜像，在 VMware 里装好后发现不知道任何密码，系统也没有网络，一台"锁死"的虚拟机摆在面前，控制台在手，却登录不进去。

<!-- DESC SEP -->

拿到一份名为 `zbql7.6_v5u9.iso` 的系统镜像，在 VMware 中安装后，我既不知道任何密码，系统也没有网络。这篇文章记录我如何通过 GRUB 恢复访问、找回网络，再顺着 SSH 拆解这套系统的发行版身份、RPM 构建差异，以及 NKUC 和 Spacewalk 的集中运维机制。技术判断我会尽量克制，并明确区分"我实际观察到的"和"基于观察作出的推断"。

## 拿到镜像后遇到的两个问题

这不是一个官方发布的镜像，只是一份我拿到的、名为 `zbql7.6_v5u9.iso` 的安装介质。在 VMware 里用默认 NAT 网络装完后，系统已经预置了一个普通用户。问题在于我不知道这个普通用户的密码，root 的密码同样未知，所以无法登录。

更麻烦的是，登录界面能切到用户，却始终进不去系统。而系统根本连不上网，桌面网络图标直接提示 `NetworkManager needs to be running`。没有密码、没有网络，等于拿到了一台"锁死"的机器。

好在这是虚拟机，我拥有它的控制台权限。这意味着我可以用一个标准手段恢复访问，即通过 GRUB 修改内核启动参数进入单用户式环境。这要求你手里有虚拟机的控制台或物理控制台，而不是一条远程入侵路径。

## 通过 GRUB 恢复系统访问

重启后在 GRUB 菜单中选择对应启动项，按 `e` 编辑，在内核启动参数行（`linux` 或 `linux16` 开头那行）末尾追加下面的参数。

```text
init=/bin/bash console=tty0
```

按 `Ctrl+x` 启动后，会进入一个直接落在 root shell 的 bash 环境。

```text
bash-4.2#
```

我最初直接尝试重置密码。

```bash
passwd root
passwd <普通用户名>
```

两条命令都报同样的错。

```text
passwd: Authentication token manipulation error
```

这个报错说明 `passwd` 没能把改动写进 `/etc/shadow`。排查后确认，根因是用 `init=/bin/bash` 启动时根文件系统默认按只读挂载，`passwd` 无法写入密码数据库。解决办法是先把它重新挂载为可写。

```bash
mount -n -o remount,rw /
```

确认当前挂载状态，关键一行来自 `mount | grep ' on / '`。

```bash
mount | grep ' on / '
```

```text
/dev/mapper/nlas-root on / type xfs (rw,relatime,attr2,inode64,noquota)
```

注意这里 `rw` 已经生效，而且能看出根文件系统是 XFS，逻辑卷名为 `nlas-root`。挂载可写后，再分别重置 `root` 和 `普通用户` 的密码。

```bash
passwd root
passwd <普通用户名>
```

如果提示弱密码，那只是警告，不代表修改失败。真正的成功标志是 `passwd: all authentication tokens updated successfully.`

改完密码后，我再做三件事才重启。

```bash
touch /.autorelabel
sync
/sbin/reboot -f
```

`touch /.autorelabel` 让 SELinux 在下次启动时重新检查文件标签，因为我在单用户环境里改过文件，标签可能不完整，跳过这一步可能导致重启后某些服务无法启动。`sync` 把缓存里的修改落盘。重启后，root 和普通用户都能用新密码登录。

密码修改这条链路可以用下图概括。

```text
passwd 命令 ✅
  → PAM 密码处理 ✅
    → 写入 /etc/shadow
      → 根文件系统只读时失败 ❌
      → 重新挂载为 rw 后成功 ✅
```

## 恢复 VMware NAT 网络

能登录了，但系统还是没网。桌面的网络图标提示 `NetworkManager needs to be running`。

系统最初只能看到回环接口，看不到正常工作的 VMware 网卡。先看 NetworkManager 服务状态。

```bash
systemctl status NetworkManager --no-pager -l
```

结果显示它处于停用状态。

```text
inactive (dead)
```

启动并设为开机自启。

```bash
systemctl enable --now NetworkManager
```

再看设备，系统已经识别出网卡 `ens33`，只是还没连接。

```bash
nmcli device status
```

连接这张网卡。

```bash
nmcli device connect ens33
```

查看地址，网卡通过 DHCP 拿到了 `192.168.182.x/24`。

```bash
ip -4 addr show ens33
```

查看路由，默认网关是 `192.168.182.2`。

```bash
ip route
```

然后分别做三项连通性测试。

```bash
ping -c 4 192.168.182.2
ping -c 4 223.5.5.5
ping -c 4 www.baidu.com
```

三项都成功，分别说明虚拟机到 VMware NAT 网关通、公网 IP 可达、DNS 解析正常。网络链路是逐层打通的。

```text
VMware NAT ✅
  → 虚拟网卡 ens33 ✅
    → NetworkManager ✅
      → DHCP 获取地址 ✅
        → 默认路由 ✅
          → 公网访问 ✅
            → DNS 解析 ✅
```

不过还有个隐患，如果只是手动连上，重启后网络未必自动恢复。检查连接的自动连接开关。

```bash
nmcli -f NAME,UUID,DEVICE,AUTOCONNECT connection show
```

发现 `AUTOCONNECT=no`，即这次开机网络能通，是我手动连的，重启后可能又断。把它改成自动连接。

```bash
nmcli connection modify ens33 connection.autoconnect yes
```

修改后验证。

```bash
nmcli -f NAME,DEVICE,AUTOCONNECT connection show
```

```text
ens33  ens33  yes
```

重启后网络会自动恢复。到这一步，系统已经能正常访问，我通过 SSH 登录进去继续研究。

把前面两个故障整理成一张表。

| 故障 | 原因 | 处理方法 |
| --- | --- | --- |
| `passwd` 报 `Authentication token manipulation error` | `init=/bin/bash` 启动时根文件系统默认只读 | `mount -n -o remount,rw /` 后重新设置密码 |
| 系统没有网络 | NetworkManager 服务停用 | `systemctl enable --now NetworkManager`，手动连接 `ens33` |
| 网络重启后可能不恢复 | `AUTOCONNECT=no` | `nmcli connection modify ens33 connection.autoconnect yes` |

## SSH 登录后拆解系统内部结构

有了网络和密码，我通过 SSH 登录系统，开始从发行版身份、内核、RPM 构建、定制包和虚拟硬件几个方向拆解它。

### 发行版身份

先看系统自己怎么声明身份。

```bash
cat /etc/*release
```

关键输出如下。

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

可以确认，正式产品名是 NeoKylin Linux Advanced Server，版本 V7Update6，代号 Chromium，同时系统保留了 RHEL 7.6 的兼容标识。更准确地说，从这些标识看，可以说它高度基于或兼容 RHEL 7.6，继承了以 RPM、YUM、systemd、SELinux 为代表的 Enterprise Linux 7 技术栈。

### 内核

查看运行内核。

```bash
uname -a
```

```text
Linux localhost.localdomain 3.10.0-957.el7.x86_64 #1 SMP Fri Jan 11 17:34:50 CST 2019 x86_64 x86_64 x86_64 GNU/Linux
```

再看内核包信息。

```bash
rpm -qi kernel-$(uname -r)
```

关键字段如下。

```text
Name        : kernel
Version     : 3.10.0
Release     : 957.el7
Source RPM  : kernel-3.10.0-957.el7.src.rpm
Build Host  : kojibuilder-ve
Packager    : NeoKylin Linux
Vendor      : CS2C
```

内核版本和 Source RPM 与 RHEL 7.6 的 `3.10.0-957.el7` 一致。看内核的变更记录开头。

```bash
rpm -q --changelog kernel-$(uname -r) | head -n 50
```

最上方是中标麒麟的构建记录。

```text
Modify for: neokylin-rpm-config
```

之后大量记录来自 Red Hat 的内核补丁历史，包括 CVE 修复和硬件支持更新。这说明补丁历史大部分继承自 Red Hat，中标麒麟进行了自己的构建、签名和发行。需要强调的是，仅凭这份 changelog，不能断言所有源码差异都只有这一处，它只记录到构建层面，不代表源码层面的全部改动。

### RPM 包的重新构建

用一个格式化查询，看哪些包带有中标麒麟的构建标识。

```bash
rpm -qa --qf '%{NAME}\t%{VENDOR}\t%{PACKAGER}\n' |
grep -Ei 'NeoKylin|CS2C' |
sort
```

结果里大量基础包都带有 `Vendor: CS2C` 和 `Packager: NeoKylin Linux`。

```text
Vendor   : CS2C
Packager : NeoKylin Linux
```

涉及 kernel、glibc、bash、systemd、yum、rpm、GNOME、NetworkManager、SELinux、OpenSSH、libvirt、Xorg、open-vm-tools 等。这说明中标麒麟对大量 Enterprise Linux 软件包进行了统一构建、签名和发行。

但这里要分清，`Vendor` 和 `Packager` 字段只能证明包由中标麒麟构建或重新打包，不能单独证明源码发生了多少实质修改。

```text
Vendor/Packager 字段
  → 能证明由中标麒麟构建或打包 ✅
    → 不能单独证明源码做了多少修改 ❌
```

### 中标麒麟自身的定制包

把显然属于中标麒麟自身的包筛出来。

```bash
rpm -qa |
grep -Ei '^(neokylin|nkuc|yum-nkuc|license-client|System_)' |
sort
```

关键包如下。

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

这些包构成了中标麒麟相对基础 Enterprise Linux 的品牌、发行标识、授权和集中运维定制层。其中 `neokylin-release-server` 提供的文件说明了"发行版身份"具体落在哪里。

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

它负责发行版名称和版本标识、RHEL 兼容标识、RPM 发行版宏、RPM GPG 公钥、默认 YUM 仓库配置、systemd 服务预设，以及许可协议和版本查询工具。

### 存储和 VMware 虚拟硬件

存储布局如下。

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

系统采用 XFS 文件系统，根分区和交换分区由 LVM 管理，`/boot` 是单独的 XFS 分区，这也呼应了前面 `nlas-root` 的逻辑卷名。`lspci` 显示的是标准的 VMware 虚拟硬件（SVGA II 显卡、LSI 53c1030 SCSI、PCI/IDE 桥等），系统还预装了 `open-vm-tools` 和 VMware 的 Xorg 驱动，说明针对 VMware 虚拟化做了适配。

## NKUC、Spacewalk 和集中运维机制

前面那些定制包里，最值得研究的是以 `nkuc` 开头的一组。它们构成了中标麒麟的集中运维客户端，本质上是 Spacewalk/RHN 体系的重打包。我顺着"守护进程 → 检查脚本 → 白名单动作 → 实际执行"这条线拆了下去。

### nkucsd（定时调度守护进程）

```bash
rpm -qi nkucsd
```

关键结果如下。

```text
Summary     : Spacewalk query daemon
URL         : https://fedorahosted.org/spacewalk
Vendor      : CS2C
Packager    : NeoKylin Linux
```

`Summary` 直接写着 Spacewalk query daemon，`nkucsd` 本质上是中标麒麟重新打包的 Spacewalk/RHN 查询守护进程。看它装了什么文件。

```bash
rpm -ql nkucsd
```

关键文件如下。

```text
/etc/rc.d/init.d/nkucsd
/etc/sysconfig/rhn
/etc/sysconfig/rhn/nkucsd
/usr/sbin/nkucsd
```

它用的是传统 SysV init 脚本，由 systemd 的兼容机制托管。

```text
/etc/rc.d/init.d/nkucsd
  → systemd-sysv-generator
    → nkucsd.service
```

检查周期配置如下。

```bash
cat /etc/sysconfig/rhn/nkucsd
```

```text
INTERVAL=240
```

表示每 240 分钟，也就是每 4 小时检查一次。再看更新客户端配置里非注释、非空行的部分。

```bash
grep -Ev '^[[:space:]]*(#|$)' /etc/sysconfig/rhn/up2date
```

关键配置如下。

```text
systemIdPath=/etc/sysconfig/rhn/systemid
serverURL=https://enter.your.server.url.here/XMLRPC
sslCACert=/usr/share/nkuc/NKUC-CA-CERT
noReboot=0
stagingContent=1
stagingContentWindow=24
```

检查系统身份是否已注册。

```bash
ls -l /etc/sysconfig/rhn/systemid
```

```text
No such file or directory
```

`systemid` 不存在，说明这套系统没有完成 NKUC/Spacewalk 注册。尽管服务在运行。

```bash
systemctl status nkucsd --no-pager -l
```

```text
Spacewalk Services Daemon starting up, check in interval 240 minutes.
```

但当前状态是，`nkucsd` 在跑，`systemid` 不存在，`serverURL` 还是占位地址，所以它连不上真实 NKUC 平台，也就不会获取和执行远程动作。

```text
nkucsd 运行 ✅
  → systemid 不存在 ❌
    → serverURL 仍是占位地址 ❌
      → 无法连接真实 NKUC 平台
        → 不会获取和执行远程动作 ✅
```

### nkuc_check（真正联网的检查脚本）

看两个程序的文件类型和依赖。

```bash
file /usr/sbin/nkucsd
ldd /usr/sbin/nkucsd
```

`nkucsd` 是 64 位 x86_64 ELF 程序，已去除调试符号，动态依赖基本只有 glibc。而 `nkuc_check` 是这样的文件。

```bash
file /usr/sbin/nkuc_check
```

```text
Python script, ASCII text executable
```

`nkuc_check` 是一个 Python 脚本。结合手册可以理清分工，`nkucsd` 本身只是定时守护进程，不直接连接网络；到达检查周期后它调用外部程序 `nkuc_check`，后者才负责连接 Spacewalk 服务器。当前未注册时的流程如下。

```text
nkucsd 定时唤醒
  → 执行 nkuc_check ✅
    → 检查进程锁 ✅
      → 检查禁用标志 ✅
        → 读取 systemid
          → 当前不存在，直接退出 ❌
```

注册完成后的完整逻辑如下。

```text
nkuc_check
  → 读取 up2date 配置
    → 建立 XML-RPC 连接
      → 获取服务端动作队列
        → 执行本地白名单动作
          → 将执行结果回传服务器
```

### 远程动作白名单

`nkuc_check` 不允许服务器直接下发任意 Python 代码。远程方法通过 `/usr/share/rhn/up2date_client/getMethod.py` 映射到本地函数，并受几层限制。

1. 方法名只能包含字母、数字和下划线。
2. 方法必须位于 `/usr/share/rhn/actions`。
3. 模块必须通过 `__rhnexport__` 显式导出方法。
4. 未列入白名单的方法不能被调用。

方法映射链路如下。

```text
Spacewalk 返回 method + params
  → 检查方法名合法性 ✅
    → 定位 /usr/share/rhn/actions 模块 ✅
      → 检查 __rhnexport__ 白名单 ✅
        → 调用本地 Python 函数 ✅
```

实际导出的动作如下。

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

这些能力包括安装、更新、删除软件包，全量更新系统，回滚软件包版本，校验软件包，上传已安装软件包列表，上传硬件信息，修改更新客户端配置，调整检查周期，禁用客户端身份，以及远程重启系统。需要说明，这不是通用远程 Shell，但这些动作仍然以 root 权限运行，所以它属于具有较高系统权限的集中运维客户端。这套白名单机制决定了集中管理方要么完全动不了客户端，要么只能执行这几类预设动作，相当于给远程能力画了一条边界，而不是把客户端变成一台可自由操作的机器。

### 远程重启和软件包管理

`reboot.py` 的实现调用 `/sbin/shutdown -r +3`。

```bash
/sbin/shutdown -r +3
```

收到动作后安排 3 分钟后重启。配置项 `noReboot=0` 表示允许远程重启，如果设为 `noReboot=1`，客户端会拒绝执行远程重启动作。

`packages.py` 使用 Python 2 的 YUM API 操作系统软件包，支持 install、update、remove、full update、rollback、verify 和 refresh package profile。每次事务执行前会依次做仓库解析、依赖计算、下载软件包、RPM GPG 签名检查、YUM 事务测试，然后才正式执行，最后把结果回传服务器。

```text
服务端下发软件包动作
  → nkuc_check 解析 XML-RPC ✅
    → packages.py 构造 YUM 事务 ✅
      → 依赖解析和事务测试 ✅
        → GPG 签名校验 ✅
          → root 权限执行安装/升级/删除/回滚 ✅
            → 结果回传服务端 ✅
```

其中 `packages.refresh_list()` 会收集本机 RPM 软件包清单并上传到集中管理服务器，`packages.verify()` 会检查指定软件包是否缺失、文件是否异常。

### YUM 插件和仓库状态

`yum-nkuc-plugin` 安装了插件配置、`/usr/share/rhn/actions/packages.py`、`errata.py` 和 `/var/lib/up2date`。插件配置如下。

```ini
[main]
enabled = 0
gpgcheck = 1
timeout = 120
```

`enabled = 0` 说明 NKUC 的 YUM 插件当前被禁用。系统的仓库配置只有这一处。

```ini
[rhel-source]
name=Neoky7.6
baseurl=file:///mnt
enabled=0
gpgcheck=0
```

所以当前位置没有任何可用的 YUM 软件源。没有启用在线仓库，唯一仓库指向 `/mnt` 且本身被禁用，而 VMware 里安装用的 ISO 已被移除、`/mnt` 没有挂载安装介质。我并不打算推测中标麒麟官方仓库地址，也不编造可用镜像源。这意味着刚装好的系统要装软件，必须先自行挂载安装介质或配置可信软件源，不能指望开箱即用。

把拆到的主要组件和它们的来源或作用整理成一张表。

| 组件 | 来源或作用 |
| --- | --- |
| `neokylin-release-server` | 发行版名称/版本标识、RHEL 兼容标识、RPM 宏、GPG 公钥、默认仓库配置、systemd 预设 |
| `nkucsd` | 重新打包的 Spacewalk/RHN 查询守护进程；SysV init 脚本由 systemd-sysv-generator 托管，每 4 小时调用 `nkuc_check` |
| `nkuc_check` | Python 脚本，负责连接 Spacewalk 服务器、获取动作队列并回传结果 |
| `__rhnexport__` 白名单 | 把远程方法限制到 `/usr/share/rhn/actions` 中显式导出的本地函数，避免服务器下发任意代码 |
| `yum-nkuc-plugin` | 让 YUM 与 NKUC 集成的插件，当前 `enabled = 0` 被禁用 |
| kernel / glibc / systemd 等基础包 | `Vendor: CS2C`、`Packager: NeoKylin Linux`，由中标麒麟统一构建和签名 |

## 总结

- **密码恢复** 通过 GRUB 加 `init=/bin/bash` 进入 root shell，根文件系统默认只读导致 `passwd` 写不进 `/etc/shadow`，`mount -n -o remount,rw /` 重置后即可改密，再用 `/.autorelabel` 让 SELinux 重新标记。
- **网络恢复** 起停的 NetworkManager 是根因，`enable --now` 后手动连接 `ens33`，DHCP 取地址、路由和 DNS 逐层打通，再设 `autoconnect yes` 保证重启后自动恢复。
- **RHEL 7.6 兼容基础** 系统正式名 NeoKylin Linux Advanced Server V7Update6 (Chromium)，内核 `3.10.0-957.el7`，使用 RPM、YUM、systemd、SELinux、GNOME、NetworkManager、XFS、LVM 的 Enterprise Linux 7 技术栈。
- **NeoKylin 重构建和定制层** 大量基础包由 CS2C/NeoKylin 重新构建和签名；`Vendor`/`Packager` 只能证明构建出自中标麒麟，不能单独说明源码改动程度。中标麒麟在基础之上增加了品牌与发行标识、GPG 签名、NKUC 客户端、Spacewalk/RHN 兼容体系以及授权和系统管理组件。
- **NKUC 集中管理机制** `nkucsd` 定时调度，`nkuc_check` 联网执行，远程方法经 `__rhnexport__` 白名单映射到本地函数，具备软件安装/升级/删除/回滚、资产上报、配置调整和远程重启等 root 级能力。当前这台系统未注册（无 `systemid`、`serverURL` 为占位值、YUM 插件被禁用），因此不会执行真实远程动作。

这套系统的软件基线主要来自 2018—2019 年，适合历史业务兼容测试、国产操作系统研究、Enterprise Linux 7 运维学习或老旧商业软件验证。如果要用在新的联网生产系统上，必须先确认厂商支持状态、安全更新来源、软件仓库可用性、漏洞修复状态以及业务系统的兼容要求，需要完整评估和持续安全更新，而不是简单判定"能"或"不能"。

## 安全提示

能进入 GRUB 并修改启动参数，意味着你拥有虚拟机的控制台或物理控制台权限。这是标准的管理员恢复手段，也是一条需要被保护的路径。在真实生产环境，应考虑设置 GRUB 密码、启用磁盘加密、限制物理访问，并建立受控的系统恢复流程，避免任何能接触到控制台的人重置密码或篡改启动配置。