---
title: 跨系统 SSH 配置手册
date: 2026-09-30
tags:
  - SSH
  - Windows
  - macOS
  - Linux
description: 把 Windows、macOS、Ubuntu 和 Debian 之间的九种 SSH 连接方向收拢成一套流程：开启服务、放进公钥、处理管理员与 root 登录。
outline: deep
aside: true
---

# 跨系统 SSH 配置手册

<!-- DESC SEP -->

把 Windows、macOS、Ubuntu 和 Debian 之间的九种 SSH 连接方向收拢成一套流程：开启服务、放进公钥、处理管理员与 root 登录。

<!-- DESC SEP -->

每次在 Windows、macOS 和 Linux 之间换一台机器连 SSH，最容易绕晕的往往不是命令本身，而是方向：公钥到底该放哪边？Windows 管理员为什么读不到 `.ssh/authorized_keys`？macOS 和 Ubuntu 的 `root` 又被哪一层拦住了？

只要先分清**发起连接的客户端**和**被连接的目标机**，三类系统两两组合出来的九种方向，其实都顺着同一条路走。

| 角色 | 职责 |
| --- | --- |
| **发起连接的客户端** | 生成并保管私钥，运行 `ssh user@ip` 发起连接 |
| **被连接的目标机** | 开启 `sshd` 服务，放行防火墙，把客户端的公钥写进目标账号的授权文件 |

## 第一步：在目标机开启 SSH 服务

### Windows（10 / 11 / Server 2019+）

在**目标 Windows 的管理员 PowerShell** 中检查并安装 OpenSSH 服务端（参见[微软安装文档](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)）：

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
```

确认防火墙已放行 TCP 22 端口（若规则不存在则新建）：

```powershell
Get-NetFirewallRule -Name OpenSSH-Server-In-TCP
New-NetFirewallRule -Name OpenSSH-Server-In-TCP -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

### macOS

打开“系统设置 → 通用 → 共享 → 远程登录”，打开开关，并把允许登录的账号加进列表（详见 [Apple 远程登录说明](https://support.apple.com/guide/mac-help/allow-a-remote-computer-to-access-your-mac-mchlp1066/mac)）。

### Ubuntu / Debian

在**目标 Linux 机器**上安装并启动 `openssh-server`（参见 [Ubuntu 文档](https://ubuntu.com/server/docs/how-to/security/openssh-server/)）：

```bash
sudo apt update
sudo apt install openssh-server
sudo systemctl enable --now ssh
```

如果启用了 UFW 防火墙，放行 OpenSSH：

```bash
sudo ufw allow OpenSSH
```

## 第二步：在客户端生成密钥

在**发起连接的机器**上生成一对 Ed25519 密钥（Windows、macOS、Linux 命令相同）：

```bash
ssh-keygen -t ed25519 -C "my-laptop"
```

如果给私钥设了口令，可以把它交给 `ssh-agent` 缓存，免去每次输入口令的麻烦。

Windows 客户端（先在管理员 PowerShell 开启服务，再添加密钥）：

```powershell
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"
```

macOS / Linux 客户端：

```bash
ssh-add ~/.ssh/id_ed25519
```

接着把带 `.pub` 后缀的公钥整行打印出来备用（千万别拷成不带 `.pub` 的私钥）：

```powershell
# Windows PowerShell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

```bash
# macOS / Linux
cat ~/.ssh/id_ed25519.pub
```

## 第三步：把公钥放进目标机

以下命令都在**目标机本地**执行，把示例里的 `ssh-ed25519 AAAA... my-laptop` 换成刚才复制的整行公钥。

### 目标是 macOS、Ubuntu 或 Debian 普通账号

以目标账号登录终端：

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 目标是 Windows 普通账号

以该普通账号打开 PowerShell：

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$dir = Join-Path $env:USERPROFILE '.ssh'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content -LiteralPath (Join-Path $dir 'authorized_keys') -Value $key -Encoding ascii
```

### 目标是 Windows 管理员账号（最常踩坑）

只要目标账号属于本机 `Administrators` 组，Windows OpenSSH 默认**不会**去读用户目录里的 `.ssh\authorized_keys`，而是统一读取 `C:\ProgramData\ssh\administrators_authorized_keys`，且对该文件的权限极为挑剔（详见[微软密钥管理文档](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)）。

在**目标 Windows 的管理员 PowerShell** 中执行：

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$path = Join-Path $env:ProgramData 'ssh\administrators_authorized_keys'
Add-Content -LiteralPath $path -Value $key -Encoding ascii
icacls.exe $path /inheritance:r /grant '*S-1-5-32-544:F' /grant 'SYSTEM:F'
```

这里用 SID `*S-1-5-32-544` 指代内置管理员组，中英文系统通用。

## 第四步：需要直登 root 时怎么配

日常维护用普通账号登录再 `sudo` 最省心。需要直接连 `root` 时，优先使用公钥；如果需要密码登录，也可以按下面的步骤开启。

### Ubuntu / Debian 的 root

以下配置命令都在**目标 Ubuntu / Debian 机器**上执行。先确认 `/etc/ssh/sshd_config` 开头包含这行，系统默认通常已有：

```text
Include /etc/ssh/sshd_config.d/*.conf
```

OpenSSH 多数配置项采用最先读取的值，配置片段按文件名字典序加载。因此，下面使用 `00-root-login.conf`，让它先于常见的 `50-cloud-init.conf` 读取。直接编辑主文件也可以用 `sudoedit /etc/ssh/sshd_config`，但要检查前面加载的配置是否已经设置同名选项（参见 [Debian `sshd_config` 手册](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)）。

#### 使用公钥登录（推荐）

先看生效配置：

```bash
sudo sshd -T | grep '^permitrootlogin '
```

`prohibit-password` 是默认常见值，允许 root 使用公钥，禁止 root 使用密码和键盘交互认证。如果需要调整为这个值，可以写入配置片段；下面的 `tee` 命令会覆盖同名文件：

```bash
sudo mkdir -p /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/00-root-login.conf > /dev/null <<'EOF'
PermitRootLogin prohibit-password
EOF
sudo sshd -t && sudo systemctl restart ssh
```

随后把客户端公钥放进 `/root/.ssh/authorized_keys`，替换示例中的整行公钥：

```bash
sudo install -d -m 700 /root/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' | sudo tee -a /root/.ssh/authorized_keys > /dev/null
sudo chmod 600 /root/.ssh/authorized_keys
```

保持现有连接，在**客户端另开终端**测试，把示例 IP 换成目标机地址：

```bash
ssh -o PreferredAuthentications=publickey -i ~/.ssh/id_ed25519 root@192.168.1.20
```

#### 使用密码登录

需要 root 密码登录时，将配置片段改为下面两项。此命令会覆盖同名文件：

```bash
sudo mkdir -p /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/00-root-login.conf > /dev/null <<'EOF'
PermitRootLogin yes
PasswordAuthentication yes
EOF
```

`PermitRootLogin yes` 允许 root 登录；这里的 `PasswordAuthentication yes` 是全局设置，也会允许其他符合登录条件的账号使用密码。

给 root 设置密码，再校验配置并重启服务。`&&` 保证校验通过后才执行重启：

```bash
sudo passwd root
sudo sshd -t && sudo systemctl restart ssh
```

检查两项配置是否按预期读取：

```bash
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication) '
```

预期输出：

```text
permitrootlogin yes
passwordauthentication yes
```

保持现有连接，在**客户端另开终端**测试密码登录，把示例 IP 换成目标机地址：

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@192.168.1.20
```

如果配置值符合预期仍无法登录，再检查 `AllowUsers`、`DenyUsers` 或 `Match` 等额外限制。配置包含 `Match` 时，可以用 `sshd -T -C` 带上实际连接条件检查（参见 [Debian `sshd` 手册](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html)）。

### macOS 的 root

macOS 默认禁用 `root`（参见 [Apple 说明](https://support.apple.com/en-us/102367)）。确需开启时：

1. 在“目录实用工具”里启用 root 用户；
2. 将 root 加入远程登录允许组：`sudo dseditgroup -o edit -a root -t user com.apple.access_ssh`；
3. 把公钥写入 `/var/root/.ssh/authorized_keys`（属主设为 `root:wheel`，权限 `600`），并确认 `sudo sshd -T | grep '^permitrootlogin '` 不为 `no`。

## 验证与排错

保持现有窗口别关，在客户端新开一个终端，强制只走公钥测试一次：

```bash
ssh -o PreferredAuthentications=publickey -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

确认公钥登录畅通后，要是想关闭目标机的密码认证，再把生效配置中的 `PasswordAuthentication` 设为 `no`，用 `sshd -t` 校验语法后重启服务。Ubuntu / Debian 若采用上面的 `00-root-login.conf`，应在该文件中修改，避免被更早读取的值覆盖。

万一连不上，按报错对号入座：

- **`Connection timed out`**：IP 不通、防火墙拦了，或者目标 Mac 睡着了。
- **`Connection refused`**：目标机 `sshd` 没起，先看服务状态。
- **`Permission denied (publickey)`**：客户端加 `-vvv` 看递出了哪把钥匙；服务端重点查文件权限（尤其是 Windows 管理员的 `administrators_authorized_keys` ACL 和 Linux 的 `700`/`600` 权限）。
