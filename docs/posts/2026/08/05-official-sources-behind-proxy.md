---
title: 我放弃了镜像源，改用官方源加代理
date: 2026-08-05
tags:
  - 开发工具
  - 代理
  - Windows
  - macOS
  - 命令行
description: 在中国同时使用 Windows 和 macOS 开发时，我放弃给每个工具配置镜像源，改让所有工具走官方源，网络请求统一走 FlClash 混合代理，并整理出这套完整配置。
outline: deep
aside: true
---

# 我放弃了镜像源，改用官方源加代理

<!-- DESC SEP -->

以前在国内开发，我给每个工具各配一套镜像源，换来的是记不清"哪个工具用哪家源"的维护负担。现在我让所有工具恢复官方源，网络请求统一走 FlClash 的混合代理——网络问题从"每个工具各查一遍源"收敛成"只在代理这一个地方查"。

<!-- DESC SEP -->

用过一段时间镜像源后，我遇到的不是"连不上"这种一次性问题，而是慢性的：某个源的镜像更新慢半拍、另一个偶发返回旧版本，不同工具各指各的镜像，排查时还得先回忆它指向哪。后来我换了个思路——工具保持官方源，网络请求统一走 FlClash 的混合代理。这篇记录这套配置，覆盖 npm、pnpm、uv、pip、Maven、Go、Cargo、Dart/Flutter，以及 Git 的 HTTP 与 SSH、Homebrew 和 Docker Desktop。遇到问题先看文末的「排查思路」。

## 镜像源和代理是两回事

动手前先分清两个经常被混在一起的问题：

- 镜像源回答"请求发往哪"，是把下载请求重定向到第三方服务器；
- 代理回答"请求怎么走"，不改动目标地址，只让流量经过本地端口转发出去。

我过去的问题在于把两者混在一起：每个工具各配一套镜像源，镜像本身是第三方闭源服务，版本有延迟，还要长期维护。转向代理后，工具保持官方源，网络层统一走 FlClash，改动面小，也更好排查。

所以下面的配置只有两个动作：**把源/仓库/index 复位成官方**，以及**让网络请求走代理**。有些工具自带代理配置，有些只认环境变量，分清楚这点，剩下的就是照抄。

## 公共代理变量

FlClash 是我使用的代理客户端，默认在 `7897` 端口暴露混合代理（同时支持 HTTP 与 SOCKS）。下面这些工具都直接读取标准代理环境变量，网络层不用单独配置：**uv、pip、Go、Dart/Flutter、Homebrew**。先在系统里固定这两个变量：

Windows（PowerShell，写入用户级变量）：

```powershell
$proxy = "http://127.0.0.1:7897"

[Environment]::SetEnvironmentVariable("HTTP_PROXY", $proxy, "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", $proxy, "User")

$env:HTTP_PROXY = $proxy
$env:HTTPS_PROXY = $proxy
```

macOS（写入 `~/.zshrc`）：

```bash
export HTTP_PROXY="http://127.0.0.1:7897"
export HTTPS_PROXY="http://127.0.0.1:7897"
export http_proxy="$HTTP_PROXY"
export https_proxy="$HTTPS_PROXY"
```

验证：

```bash
source ~/.zshrc
printf '%s\n' "$HTTP_PROXY"
printf '%s\n' "$HTTPS_PROXY"
```

之所以写成 `HTTPS_PROXY=http://127.0.0.1:7897`，是因为把它当作 HTTP 代理用即可；访问 HTTPS 时由代理通过 CONNECT 隧道转发，不需要单独设 SOCKS。

## 源/索引走官方，网络走公共变量

### uv

uv 官方默认索引是 PyPI，这里显式设为 `https://pypi.org/simple`，同时删除已弃用的 `UV_INDEX_URL`，避免和 `UV_DEFAULT_INDEX` 冲突。

Windows：

```powershell
[Environment]::SetEnvironmentVariable("UV_INDEX_URL", $null, "User")
[Environment]::SetEnvironmentVariable(
    "UV_DEFAULT_INDEX",
    "https://pypi.org/simple",
    "User"
)

Remove-Item Env:UV_INDEX_URL -ErrorAction SilentlyContinue
$env:UV_DEFAULT_INDEX = "https://pypi.org/simple"
```

macOS：从 `~/.zshrc` 删除旧的 `UV_INDEX_URL`，保留并应用：

```bash
export UV_DEFAULT_INDEX="https://pypi.org/simple"
unset UV_INDEX_URL
source ~/.zshrc
```

验证（两平台相同）：

```bash
printf '%s\n' "$UV_DEFAULT_INDEX"
uvx --refresh --verbose ruff --version
```

`uvx` 能打印出 ruff 的版本号，说明 PyPI 与网络都通。

### pip

pip 和 uv 一样使用 PyPI 作为默认索引。恢复官方源就是显式设置 `global.index-url`；网络走公共代理变量。

Windows 与 macOS 相同：

```bash
pip config set global.index-url https://pypi.org/simple
```

pip 的用户级配置文件分别位于 Windows 的 `%APPDATA%\pip\pip.ini` 和 macOS 的 `~/.config/pip/pip.conf`。验证：

```bash
pip config list
pip index versions pip
```

`pip index versions pip` 能列出版本，说明 PyPI 与网络都通。

### Go

`GOPROXY` 是 Go 模块仓库，**不是**网络代理。它决定模块从哪下载；真正走代理的是上面的公共变量。

Windows 与 macOS 相同：

```bash
go env -w GOPROXY="https://proxy.golang.org,direct"
go env -w GOSUMDB="sum.golang.org"
```

验证：

```bash
go env GOPROXY
go env GOSUMDB
go list -m -versions golang.org/x/text
```

`go list` 能列出版本，说明模块代理与网络都通。

### Dart / Flutter

Dart 和 Flutter 共用 pub.dev 作为包仓库，Flutter 的引擎等产物则从 Google 的存储下载。前者由 `PUB_HOSTED_URL` 控制，后者由 `FLUTTER_STORAGE_BASE_URL` 控制；恢复官方源就是删掉指向镜像的这两个变量。`FLUTTER_GIT_URL`（克隆 Flutter SDK 仓库时用的镜像地址）有残留也一并删掉。

Windows（删除用户级变量）：

```powershell
[Environment]::SetEnvironmentVariable("PUB_HOSTED_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_STORAGE_BASE_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_GIT_URL", $null, "User")

Remove-Item Env:PUB_HOSTED_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_STORAGE_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_GIT_URL -ErrorAction SilentlyContinue
```

macOS：从 `~/.zshrc` 删除这三个变量，并清理当前终端：

```bash
unset PUB_HOSTED_URL
unset FLUTTER_STORAGE_BASE_URL
unset FLUTTER_GIT_URL
source ~/.zshrc
```

网络走公共代理变量。验证：

```bash
env | grep -E '^PUB_HOSTED_URL=|^FLUTTER_STORAGE_BASE_URL=|^FLUTTER_GIT_URL='
```

正确时没有输出。在一个 Flutter 项目里运行：

```bash
flutter pub get
```

能拉取依赖，说明 pub.dev 与网络都通。

### Homebrew

仅 macOS。Homebrew 没有独立代理配置，网络走公共变量；只需清掉镜像变量。

从 `~/.zshrc`、`~/.zprofile`、`~/.bash_profile` 删除：

```text
HOMEBREW_API_DOMAIN
HOMEBREW_ARTIFACT_DOMAIN
HOMEBREW_BOTTLE_DOMAIN
HOMEBREW_BREW_GIT_REMOTE
HOMEBREW_CORE_GIT_REMOTE
HOMEBREW_PIP_INDEX_URL
```

清理当前终端：

```bash
unset HOMEBREW_API_DOMAIN
unset HOMEBREW_ARTIFACT_DOMAIN
unset HOMEBREW_BOTTLE_DOMAIN
unset HOMEBREW_BREW_GIT_REMOTE
unset HOMEBREW_CORE_GIT_REMOTE
unset HOMEBREW_PIP_INDEX_URL
```

验证：

```bash
brew config
brew update
env | grep -E '^HOMEBREW_(API_DOMAIN|ARTIFACT_DOMAIN|BOTTLE_DOMAIN|BREW_GIT_REMOTE|CORE_GIT_REMOTE|PIP_INDEX_URL)='
```

正确时最后一条命令没有输出。

## 自带代理配置的包管理器

### npm

npm 的官方 registry 是 `https://registry.npmjs.org/`，支持 `proxy`、`https-proxy` 及标准代理环境变量。下面恢复官方源并配置代理（Windows 与 macOS 相同）：

```bash
npm config set registry "https://registry.npmjs.org/" --location=user
npm config set proxy "http://127.0.0.1:7897" --location=user
npm config set https-proxy "http://127.0.0.1:7897" --location=user
```

验证：

```bash
npm config get registry --location=user
npm config get proxy --location=user
npm config get https-proxy --location=user
npm ping
```

`npm ping` 成功时输出 `PONG`。

### pnpm

按当前 pnpm 11/12 配置，网络选项为 `httpProxy`、`httpsProxy`。下面恢复官方源并配置代理（Windows 与 macOS 相同）：

```bash
pnpm config set registry "https://registry.npmjs.org/" --global
pnpm config set httpProxy "http://127.0.0.1:7897" --global
pnpm config set httpsProxy "http://127.0.0.1:7897" --global
```

验证：

```bash
pnpm config get registry --global
pnpm config get httpProxy --global
pnpm config get httpsProxy --global
pnpm ping
```

`pnpm ping` 成功时输出 `PONG`。

### Maven

配置文件位置：Windows 在 `$HOME\.m2\settings.xml`，macOS 在 `~/.m2/settings.xml`。

**恢复官方源：** 删除阿里云、腾讯云、华为云等 `<mirror>` 配置，例如：

```diff
- <mirrors>
-     <mirror>
-         <id>aliyun</id>
-         <mirrorOf>*</mirrorOf>
-         <url>https://maven.aliyun.com/repository/public</url>
-     </mirror>
- </mirrors>
```

没有第三方 `<mirror>` 覆盖时，Maven 默认使用 Maven Central。

**配置代理：** 在现有 `<settings>` 内加入；已有 `<proxies>` 时合并，不要重复创建：

```xml
<proxies>
    <proxy>
        <id>flclash</id>
        <active>true</active>
        <protocol>http</protocol>
        <host>127.0.0.1</host>
        <port>7897</port>
        <nonProxyHosts>localhost|127.0.0.1</nonProxyHosts>
    </proxy>
</proxies>
```

验证：

```bash
mvn help:effective-settings
mvn -U dependency:get "-Dartifact=org.apache.commons:commons-lang3:3.18.0"
```

下载日志应显示：

```text
Downloading from central: https://repo.maven.apache.org/maven2/...
```

### Rust / Cargo

Cargo 默认使用 crates.io。配置文件位置：Windows 在 `$HOME\.cargo\config.toml`，macOS 在 `~/.cargo/config.toml`。

**恢复官方 crates.io：** 删除第三方源替换，例如：

```diff
- [source.crates-io]
- replace-with = "rsproxy"
-
- [source.rsproxy]
- registry = "sparse+https://rsproxy.cn/index/"
```

**配置代理：** 已有 `[http]` 时只加入 `proxy`：

```toml
[http]
proxy = "http://127.0.0.1:7897"
```

验证：

```bash
cargo search serde --limit 1
```

`cargo search` 能返回结果，说明 crates.io 与网络都通。

## Git 的两种通道

Git 的远端可以走 HTTPS 或 SSH，两条路分别处理。统一原则：只代理 GitHub，不设全局通配代理，避免把无关请求也塞进代理。

### Git：HTTPS

Windows：清理可能存在的全局通用代理，再只代理 GitHub：

```powershell
git config --global --unset-all http.proxy 2>$null
git config --global `
    "http.https://github.com.proxy" `
    "http://127.0.0.1:7897"
```

macOS：

```bash
git config --global --unset-all http.proxy 2>/dev/null || true
git config --global \
    "http.https://github.com.proxy" \
    "http://127.0.0.1:7897"
```

当前仓库恢复 GitHub 官方地址：

```bash
git remote get-url origin
git remote set-url origin "https://github.com/OWNER/REPOSITORY.git"
```

验证：

```bash
git config --global --get "http.https://github.com.proxy"
git ls-remote "https://github.com/git/git.git" HEAD
```

### Git：SSH

GitHub 的 SSH 443 入口是 `ssh.github.com:443`。走 SSH 时连接从 `ssh.github.com` 的 443 端口出去，再用系统自带工具把连接转发到本地代理。

Windows：先恢复 GitHub SSH 地址，并确认 Git for Windows 自带代理程序存在：

```powershell
git remote set-url origin "git@github.com:OWNER/REPOSITORY.git"
Test-Path "$env:ProgramFiles\Git\mingw64\bin\connect.exe"
```

编辑 `$HOME\.ssh\config`，加入：

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand "C:/Program Files/Git/mingw64/bin/connect.exe" -H 127.0.0.1:7897 %h %p
```

macOS：恢复 GitHub SSH 地址，再编辑 `~/.ssh/config`：

```bash
git remote set-url origin "git@github.com:OWNER/REPOSITORY.git"
```

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand /usr/bin/nc -X connect -x 127.0.0.1:7897 %h %p
```

设置权限并验证：

```bash
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

## Docker Desktop

仅 macOS。Docker Desktop 需要在它自己的设置里配置代理；`daemon.json` 里的 daemon 代理配置会被忽略，改文件没用。

**恢复官方源：** 进入 `Docker Desktop → Settings → Docker Engine`，删除类似配置：

```diff
{
-  "registry-mirrors": [
-    "https://某个镜像地址"
-  ]
}
```

点击 **Apply & Restart**。

**配置代理：** 进入 `Docker Desktop → Settings → Resources → Proxies`，选 **Manual configuration**：

```text
HTTP Proxy:  http://127.0.0.1:7897
HTTPS Proxy: http://127.0.0.1:7897
```

验证：

```bash
docker info --format '{{json .RegistryConfig.Mirrors}}'
docker pull hello-world
```

第一条命令应输出 `[]`，说明没有残留镜像源。

## 排查思路

- 先确认 FlClash 在运行，且 7897 端口在监听。
- 区分"源错了"和"代理没生效"：打印 registry/index 配置确认是官方地址，再单独测一次网络（如 `npm ping`、`docker pull`）。
- 环境变量只在当前 shell 生效，新开的终端要重新加载（macOS `source ~/.zshrc`）。
- 删镜像源前，先确认没有残留的第三方源地址覆盖项。

## 总结

这套配置的代价是：没有代理时，官方源可能连不上。但换来的是每个工具都指向官方、可追溯，网络问题也收敛成一个故障点——代理挂了，只查一个地方。想落地的话，先按「公共代理变量」一节把两个变量设好，再对照你自己的工具清单逐项复位源。