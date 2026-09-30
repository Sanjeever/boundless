---
title: 跨系统 SSH 配置手册
date: 2026-09-30
tags:
  - SSH
  - Windows
  - macOS
  - Linux
description: 把 Windows、macOS、Ubuntu 和 Debian 之间的 SSH 连接整理成一套可查的步骤：开启服务、登录管理员或 root、安装公钥并排查连接失败。
outline: deep
aside: true
---

# 跨系统 SSH 配置手册

<!-- DESC SEP -->

在 Windows、macOS、Ubuntu 和 Debian 之间换一台机器连接，我总会重新查一遍：目标机的 SSH 服务怎么开、管理员或 root 能不能登录、公钥应该放在哪。这里把九种连接方向收敛成一套步骤，遇到问题时也能按报错回查。

<!-- DESC SEP -->

我需要 SSH 时，通常不是从零学习协议，而是手边有两台机器，想尽快让其中一台连上另一台。最容易记混的恰好是方向：在 A 上生成的公钥要交给 B；改成从 B 连 A，就得检查 A 的服务，并给 B 准备密钥。

本文使用系统自带的 OpenSSH，目标机为 Windows 10/11 或 Windows Server 2019 及更新版本、macOS、Ubuntu、Debian。示例使用本地账号和默认的 22 端口；域账号、WSL、第三方 SSH 服务与互联网穿透不在其中。命令里的 `192.168.1.20`、用户名和公钥内容都要换成自己的。操作前需要能进入目标机的本地终端或管理控制台。

## 先分清客户端和目标机

| 位置           | 需要做什么                                                          |
| -------------- | ------------------------------------------------------------------- |
| 发起连接的机器 | 有 `ssh` 客户端；生成并保管私钥；用 `ssh` 连接目标机。              |
| 被连接的机器   | 开启 `sshd`；允许目标账号登录；把客户端的公钥加入该账号的授权列表。 |

九种组合就是三个客户端系统乘以三个目标机系统。连接命令基本一样，差别集中在目标机。两台机器要互相连接，就分别把两台机器都按目标机配置一次。私钥始终留在发起连接的机器，不要复制到目标机。

先确认两台机器之间有网络路径。局域网里可以用目标机的内网 IP；跨网络时要先有 VPN、可达的公网地址或相应的网络转发。SSH 配置本身解决不了地址不可达的问题。

查内网地址时，目标 Windows 可运行 `ipconfig`，Ubuntu/Debian 可运行 `hostname -I`；目标 Mac 可在“系统设置 → 网络”查看当前连接的地址。若列出多个地址，选客户端实际能到达的那个。

## 在目标机开启 SSH 服务

### Windows

在**目标 Windows 本机的管理员 PowerShell** 中检查 OpenSSH 组件：

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
```

如果 `OpenSSH.Server~~~~0.0.1.0` 是 `NotPresent`，安装服务端组件；已经是 `Installed` 就跳过安装：

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

启动服务并设置开机启动：

```powershell
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
Get-Service sshd
```

安装服务时通常会创建名为 `OpenSSH-Server-In-TCP` 的入站防火墙规则。检查它是否存在并启用：

```powershell
Get-NetFirewallRule -Name OpenSSH-Server-In-TCP
```

如果规则不存在，创建允许 TCP 22 端口的规则；如果存在但被禁用，启用它：

```powershell
New-NetFirewallRule -Name OpenSSH-Server-In-TCP -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

```powershell
Enable-NetFirewallRule -Name OpenSSH-Server-In-TCP
```

上面两条只需按检查结果执行对应的一条。服务端配置文件是 `C:\ProgramData\ssh\sshd_config`，修改后要重启 `sshd`。Windows 没有 Unix 意义上的 `root`，`PermitRootLogin` 也不适用于它；需要高权限时，使用已有的 Windows 管理员账号。[微软的安装说明](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)和[服务端配置说明](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh-server-configuration)列出了这些默认位置和规则。

### macOS

在目标 Mac 打开“系统设置 → 通用 → 共享 → 远程登录”，开启“远程登录”。在详细设置里选择“仅这些用户”，加入准备登录的账号；界面也会显示可用的 SSH 连接命令。只有确实需要远程访问受隐私保护的文件时，再考虑“允许远程用户进行完全磁盘访问”。[Apple 的远程登录说明](https://support.apple.com/guide/mac-help/allow-a-remote-computer-to-access-your-mac-mchlp1066/mac)对应这些设置。

优先让自己的普通或管理员账号登录，再用 `sudo` 执行管理命令。Mac 的 root 账号默认关闭，后文单独说明直接登录 root 的条件。

### Ubuntu 和 Debian

在**目标 Linux 机器**上安装服务端，并确认服务正在运行：

```bash
sudo apt update
sudo apt install openssh-server
sudo systemctl enable --now ssh
sudo systemctl status ssh --no-pager
```

如果启用了 UFW，还要放行 SSH；没安装或没启用 UFW，就检查实际使用的防火墙和云平台入站规则：

```bash
sudo ufw status
sudo ufw allow OpenSSH
```

第二条只在 UFW 已启用且尚未放行 SSH 时执行。服务端主配置是 `/etc/ssh/sshd_config`，也可能读取 `/etc/ssh/sshd_config.d/` 中的片段。特别是 Ubuntu，配置片段通常在主文件前加载，不能只看主文件里最后写了什么；后文用 `sshd -T` 查看生效值。[Ubuntu OpenSSH 文档](https://ubuntu.com/server/docs/how-to/security/openssh-server/)与[Debian 参考手册](https://www.debian.org/doc/manuals/debian-reference/ch06.en.html)都有安装和配置说明。

## 从客户端完成第一次连接

macOS 一般可直接在终端使用 `ssh`。Windows 在 PowerShell 中运行 `ssh -V`；若没有客户端，可在管理员 PowerShell 中安装：

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

Ubuntu 或 Debian 若没有 `ssh` 命令，安装客户端：

```bash
sudo apt install openssh-client
```

接下来在**发起连接的机器**运行。这里的 `alice` 是目标机上已有的账号，IP 是目标机地址：

```bash
ssh alice@192.168.1.20
```

首次连接会显示目标机的主机密钥指纹。它用来确认“连到的是哪台机器”，不是后面要生成的用户公钥。可以在目标机本地核对提示中对应算法的主机公钥指纹。比如提示为 ED25519 时，Windows 和 macOS/Linux 分别运行：

```powershell
ssh-keygen -lf "$env:ProgramData\ssh\ssh_host_ed25519_key.pub"
```

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

确认一致后再接受并输入目标账号密码。如果已经在这一步遇到超时或拒绝连接，先查服务、地址和防火墙，不必急着生成用户密钥。

## 在每台客户端生成自己的密钥

在**发起连接的机器**运行，三个系统使用同一条命令：

```bash
ssh-keygen -t ed25519 -C "my-laptop"
```

按提示保存到默认位置时，Windows 通常是 `C:\Users\<用户名>\.ssh\id_ed25519`，macOS/Linux 是 `~/.ssh/id_ed25519`；带 `.pub` 后缀的是公钥。如果默认文件已经存在，先确认是不是自己正在使用的密钥，不要覆盖。多台客户端可以各生成一对密钥，把每台的公钥都加入目标机。

生成时可以给私钥设置口令。后面说的“免密”是**不再输入目标机的账号密码**；如果私钥设置了口令，客户端仍可能要求输入它。需要减少重复输入时，可让 `ssh-agent` 缓存已解锁的私钥。Ubuntu 的[密钥说明](https://ubuntu.com/server/docs/how-to/security/openssh-server/)也推荐使用 Ed25519。

Windows 客户端先在管理员 PowerShell 启动 `ssh-agent` 服务：

```powershell
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
```

再回到日常使用的账号，在普通 PowerShell 中加入私钥：

```powershell
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"
```

macOS 和 Linux 客户端可运行：

```bash
ssh-add ~/.ssh/id_ed25519
```

如果 Linux 提示无法连接到代理，在当前终端先运行 `eval "$(ssh-agent -s)"`，再执行 `ssh-add`。这只让当前 shell 使用新启动的代理；不需要为此去掉私钥口令。[微软的 Windows 说明](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)和 [OpenSSH 的 `ssh-add` 手册](https://man.openbsd.org/ssh-add.1)解释了这些命令。

把公钥内容打印出来，稍后复制**完整的一行**。Windows PowerShell：

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

macOS 和 Linux：

```bash
cat ~/.ssh/id_ed25519.pub
```

不要把没有 `.pub` 后缀的私钥内容贴到目标机，也不要把它写进博客、聊天记录或代码仓库。

## 把公钥放到目标账号下

以下命令都在**目标机本地**执行。示例里的 `ssh-ed25519 AAAA... my-laptop` 必须替换为刚才打印出的**整行公钥**；已有多个公钥时逐行追加，不要覆盖原文件。

### 目标机是 macOS、Ubuntu 或 Debian

先以准备远程登录的普通账号进入目标机终端，再运行：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

这里的 `~` 必须是**目标账号的主目录**，不能在另一个账号下运行后指望它生效。Linux 上如果客户端已经装了 `ssh-copy-id`，也可以从客户端执行 `ssh-copy-id -i ~/.ssh/id_ed25519.pub alice@192.168.1.20`；手动追加的方式在三个客户端系统间更容易照搬。

### 目标机是 Windows 普通账号

以**准备远程登录的 Windows 账号**打开 PowerShell，运行：

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$dir = Join-Path $env:USERPROFILE '.ssh'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content -LiteralPath (Join-Path $dir 'authorized_keys') -Value $key -Encoding ascii
```

普通账号的公钥文件位于它自己的用户目录，例如 `C:\Users\alice\.ssh\authorized_keys`。这里要用该账号的 PowerShell；切换到别人的账号执行时，`$env:USERPROFILE` 指向的也会是别人的目录。

### 目标机是 Windows 管理员账号

只要目标账号属于本机 Administrators 组，默认就应使用共享的 `C:\ProgramData\ssh\administrators_authorized_keys`，而不是该账号用户目录里的 `authorized_keys`。在**目标 Windows 本机的管理员 PowerShell** 中运行：

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$path = Join-Path $env:ProgramData 'ssh\administrators_authorized_keys'
Add-Content -LiteralPath $path -Value $key -Encoding ascii
icacls.exe $path /inheritance:r /grant '*S-1-5-32-544:F' /grant 'SYSTEM:F'
icacls.exe $path
```

`S-1-5-32-544` 是内置 Administrators 组的 SID，避免系统界面语言不同导致组名不匹配。检查最后一条输出：这个文件只应由 Administrators 和 SYSTEM 访问；若此前给其他账号加过显式权限，需要去掉那些权限。由于默认使用同一个文件，加入其中的公钥也会被管理员组账号共同使用。[微软的密钥管理说明](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)特别指出了管理员账号的文件位置与 ACL 要求。

现在从客户端新开一个终端再连一次。如果有多把私钥，显式指定这一把：

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" alice@192.168.1.20
```

```bash
ssh -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

第一条给 Windows PowerShell，第二条给 macOS/Linux；两条不要都执行。正常情况下，这次不再要求目标账号密码。

## 确实需要直接登录 root 时

直接登录 root 需要同时满足三件事：目标机允许 root 通过 SSH 登录、root 有对应的公钥、客户端持有匹配的私钥。日常操作可以先登录自己的账号，再执行 `sudo`。确需直接登录时，优先只开放密钥认证。

### Ubuntu 和 Debian 的 root

Ubuntu 默认禁用 root 的密码登录，但这不等于公钥认证也必然被禁用；是否能登录要看目标机的实际账号状态和 SSH 配置。[Ubuntu 用户管理文档](https://ubuntu.com/server/docs/how-to/security/user-management/)明确区分了密码锁定与 SSH 公钥认证。Debian/OpenSSH 的 `PermitRootLogin` 默认值通常为 `prohibit-password`，即允许 root 使用公钥，但不接受 root 密码；仍应以当前机器的生效配置为准。[Debian 手册](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)

先在目标 Linux 机器上检查：

```bash
sudo sshd -T | grep '^permitrootlogin '
```

若输出是 `prohibit-password`，无需为了密钥登录改成 `yes`；若是 `no`，需要在实际生效的配置中改为：

```text
PermitRootLogin prohibit-password
```

再把客户端公钥加入 **root 自己的**授权文件，而不是普通账号的文件：

```bash
sudo install -d -m 700 /root/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' | sudo tee -a /root/.ssh/authorized_keys > /dev/null
sudo chmod 600 /root/.ssh/authorized_keys
```

修改了 SSH 配置时，先检查语法，再重启服务，并重新确认生效值：

```bash
sudo sshd -t
sudo systemctl restart ssh
sudo sshd -T | grep '^permitrootlogin '
```

最后从客户端用 `ssh root@192.168.1.20` 测试。不需要为了公钥登录而给 root 设置一个可远程猜测的密码。

### macOS 的 root

Apple 默认关闭 Mac 的 root 账号，并建议普通管理员账号配合 `sudo`。如果确实要直接登录，在目标 Mac 上打开“目录实用工具”，解锁后通过“编辑 → 启用 root 用户”设置 root 密码；完成任务后可在同一位置再次禁用。[Apple 的 root 账号说明](https://support.apple.com/en-us/102367)

随后确认“远程登录”允许 root 访问。如果限制为“仅这些用户”，需要将 root 加入允许列表；无法从界面选择时，可在目标 Mac 的管理员终端运行：

```bash
sudo dseditgroup -o edit -a root -t user com.apple.access_ssh
sudo dseditgroup -o checkmember -m root com.apple.access_ssh
```

把客户端公钥加入 root 的主目录，Mac 上通常为 `/var/root`：

```bash
sudo install -d -m 700 -o root -g wheel /var/root/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' | sudo tee -a /var/root/.ssh/authorized_keys > /dev/null
sudo chown root:wheel /var/root/.ssh/authorized_keys
sudo chmod 600 /var/root/.ssh/authorized_keys
sudo sshd -T | grep '^permitrootlogin '
```

若生效值为 `no`，在实际生效的 SSH 配置中设为 `PermitRootLogin prohibit-password`，用 `sudo sshd -t` 检查后重新开启“远程登录”，再从另一台机器测试 `ssh root@目标地址`。Mac 的远程登录允许名单与 `sshd` 配置都可能拦住 root，不能只做其中一步。没有持续使用 root 的必要时，完成后用 `sudo dseditgroup -o edit -d root -t user com.apple.access_ssh` 撤销刚才添加的授权，并在“目录实用工具”中禁用 root。

## 验证密钥登录后再收紧密码认证

留着已经连上的会话，**另开一个终端**测试密钥登录。可以强制客户端只尝试公钥，避免公钥失败后又回退到账号密码，让一次看似成功的连接掩盖问题：

```bash
ssh -o PreferredAuthentications=publickey -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

Windows PowerShell 把 `-i` 后的路径换成 `"$env:USERPROFILE\.ssh\id_ed25519"`。如果出现 `Enter passphrase for key`，输入的是**本机私钥口令**。这条命令若未被服务端接受，会直接失败；普通 `ssh` 连接如果退回到 `alice@... password:`，说明公钥登录尚未成功。

确定新会话可用后，才考虑关闭目标机的账号密码登录。macOS 和 Linux 在实际生效的 SSH 配置中设置：

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
```

Windows 自带 OpenSSH 不支持 `KbdInteractiveAuthentication`，只设置 `PasswordAuthentication no`。Windows 的配置写在 `C:\ProgramData\ssh\sshd_config` 的 `Match` 块之前；Ubuntu/Debian 还要注意配置片段的覆盖顺序。

Linux 用 `sudo sshd -t` 检查语法，再运行 `sudo systemctl restart ssh`；Mac 用 `sudo sshd -t` 检查后，在“远程登录”中关闭再重新开启；Windows 在管理员 PowerShell 中运行 `sshd.exe -t` 和 `Restart-Service sshd`。每次改动后都测试一个新连接，再关闭旧会话。[Windows 服务端支持的配置项](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh-server-configuration)与[Ubuntu 配置说明](https://ubuntu.com/server/docs/how-to/security/openssh-server/)可用于核对。

## 九种连接方向怎么查

下面表中的 `WIN_IP`、`MAC_IP`、`LINUX_IP` 是目标机地址，`win_user`、`mac_user`、`linux_user` 是**目标机账号**。同一列的连接语法相同；先按该列完成目标机配置，再从所在行的客户端生成密钥并安装公钥。

| 发起连接的系统  | 连接 Windows          | 连接 macOS            | 连接 Ubuntu / Debian      |
| --------------- | --------------------- | --------------------- | ------------------------- |
| Windows         | `ssh win_user@WIN_IP` | `ssh mac_user@MAC_IP` | `ssh linux_user@LINUX_IP` |
| macOS           | `ssh win_user@WIN_IP` | `ssh mac_user@MAC_IP` | `ssh linux_user@LINUX_IP` |
| Ubuntu / Debian | `ssh win_user@WIN_IP` | `ssh mac_user@MAC_IP` | `ssh linux_user@LINUX_IP` |

比如“Linux 连 Windows 管理员账号”，就在 Linux 上生成密钥，打开目标 Windows 的 `sshd`，把 Linux 客户端公钥放进目标机的 `administrators_authorized_keys`，最后从 Linux 执行 `ssh 管理员用户名@WIN_IP`。反过来“Windows 连 Linux root”，则在 Windows 生成密钥，打开 Linux 的 `ssh` 服务，把 Windows 公钥放进 `/root/.ssh/authorized_keys`，检查 `PermitRootLogin` 后从 Windows 执行 `ssh root@LINUX_IP`。

## 连不上时先看哪一层

- **`Connection timed out`**：先查 IP、VPN/路由、目标机是否开机，以及本机或云平台的防火墙。macOS 还要确认目标 Mac 没有睡眠。
- **`Connection refused`**：目标地址可以到达，但 22 端口没有服务接听。检查 Windows 的 `Get-Service sshd`、Linux 的 `systemctl status ssh`，或 Mac 的“远程登录”开关。
- **仍要求目标账号密码或显示 `Permission denied (publickey)`**：在客户端加 `-vvv` 看实际提供了哪把密钥；在目标机检查公钥是否完整、是否放在正确账号下。Windows 管理员尤其要查专用文件与 ACL；macOS/Linux 查 `~/.ssh` 和 `authorized_keys` 权限。Mac 还要查“远程登录”的允许名单。
- **root 被拒绝**：在目标机看 `sshd -T` 的 `permitrootlogin`，再核对 root 的公钥文件和 macOS 的 root 账号状态。不要把 Linux 普通用户的 `authorized_keys` 当作 root 的。
- **`REMOTE HOST IDENTIFICATION HAS CHANGED`**：先确认目标机是否重装、换了地址或主机密钥，再核对新指纹。不要直接跳过主机密钥检查。

排查公钥认证最有用的一条客户端命令是：

```bash
ssh -vvv -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

Windows PowerShell 同样只需换掉 `-i` 后的路径。日志里先找“客户端提供了哪把钥匙”，再看“服务端是否接受”；不要在连接超时的时候反复修改 `authorized_keys`。

下次再换系统连接时，先问两个问题：**从哪台机器发起？目标机是什么系统、要登录哪个账号？**确定这三件事，就能顺着“目标机开服务 → 客户端生成密钥 → 目标账号安装公钥 → 新会话验证”走完，而不用再把九种方向各查一遍。
