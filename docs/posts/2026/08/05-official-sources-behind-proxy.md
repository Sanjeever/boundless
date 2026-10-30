---
title: 我放弃了镜像源，改用官方源加代理
date: 2026-08-05
tags:
  - 开发工具
  - 代理
  - Windows
  - macOS
  - 命令行
description: 把 Windows 和 macOS 上的开发工具切回官方源并统一走本地代理，让源地址与网络路径各司其职。
outline: deep
aside: true
---

# 我放弃了镜像源，改用官方源加代理

<!-- DESC SEP -->

把 Windows 和 macOS 上的开发工具切回官方源并统一走本地代理，让源地址与网络路径各司其职。

<!-- DESC SEP -->

以前我习惯给每个开发工具各配一套国内镜像源。时间一长，有的镜像同步滞后，有的工具换了配置项，每次拉不下包都得先翻一遍配置文件，回忆当时到底把它指到了哪里。

后来我干脆把这些工具全部恢复成官方源，网络统一走本地的 FlClash 代理。这里记下 `npm`、`pnpm`、`uv`、`pip`、`Maven`、`Go`、`Cargo`、`Dart/Flutter`、`Git`、`Homebrew` 和 `Docker Desktop` 的设置方式。

## 镜像源和代理是两回事

动手前先分清两件事：

- **镜像源**决定“去哪儿拿”，把下载请求改写到另一台服务器；
- **代理**决定“怎么走”，目标还是官方地址，只是流量经由本地端口转发出去。

把源复位到官方、把网络交给代理之后，万一拉包失败，至少能很快分清是网络不通还是配置写错了。

## 公共代理变量

我的 FlClash 在本机 `7897` 端口提供混合代理（同时支持 HTTP 与 SOCKS）。`uv`、`pip`、`Go`、`Dart/Flutter` 和 `Homebrew` 都可以直接读取环境变量：

Windows（PowerShell，写入用户级环境变量）：

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

访问 HTTPS 时，客户端会通过 HTTP 代理的 `CONNECT` 隧道转发，因此 `HTTPS_PROXY` 同样填 `http://127.0.0.1:7897` 即可。

## 走公共代理变量的工具

### uv

uv 默认使用 PyPI。显式设好 `UV_DEFAULT_INDEX`，并清掉已弃用的 `UV_INDEX_URL`：

Windows：

```powershell
[Environment]::SetEnvironmentVariable("UV_INDEX_URL", $null, "User")
[Environment]::SetEnvironmentVariable("UV_DEFAULT_INDEX", "https://pypi.org/simple", "User")

Remove-Item Env:UV_INDEX_URL -ErrorAction SilentlyContinue
$env:UV_DEFAULT_INDEX = "https://pypi.org/simple"
```

macOS（更新 `~/.zshrc` 后执行）：

```bash
export UV_DEFAULT_INDEX="https://pypi.org/simple"
unset UV_INDEX_URL
source ~/.zshrc
```

验证：

```bash
uvx --refresh --verbose ruff --version
```

### pip

把全局索引显式指回 PyPI（Windows 与 macOS 相同）：

```bash
pip config set global.index-url https://pypi.org/simple
```

验证：

```bash
pip config list
pip index versions pip
```

如果曾经设过 `PIP_INDEX_URL` 环境变量，可用 `pip config debug` 检查是否有残留覆盖。

### Go

`GOPROXY` 配的是 [Go 模块代理服务](https://go.dev/ref/mod#goproxy-protocol)，决定去哪儿拉模块，底层的网络请求则会走前面配好的 `HTTP_PROXY` / `HTTPS_PROXY`：

```bash
go env -w GOPROXY="https://proxy.golang.org,direct"
go env -w GOSUMDB="sum.golang.org"
```

验证：

```bash
go env GOPROXY GOSUMDB
go list -m -versions golang.org/x/text
```

### Dart / Flutter

Dart 与 Flutter 默认走 `pub.dev` 和 Google 官方存储，把以前指到镜像的三个环境变量删掉即可。

Windows：

```powershell
[Environment]::SetEnvironmentVariable("PUB_HOSTED_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_STORAGE_BASE_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_GIT_URL", $null, "User")

Remove-Item Env:PUB_HOSTED_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_STORAGE_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_GIT_URL -ErrorAction SilentlyContinue
```

macOS（从 `~/.zshrc` 删除对应行后执行）：

```bash
unset PUB_HOSTED_URL FLUTTER_STORAGE_BASE_URL FLUTTER_GIT_URL
source ~/.zshrc
```

### Homebrew

仅限 macOS。从 `~/.zshrc`、`~/.zprofile` 等配置文件里删掉 `HOMEBREW_API_DOMAIN`、`HOMEBREW_BOTTLE_DOMAIN` 等镜像变量，并在当前终端清理：

```bash
unset HOMEBREW_API_DOMAIN HOMEBREW_ARTIFACT_DOMAIN HOMEBREW_BOTTLE_DOMAIN
unset HOMEBREW_BREW_GIT_REMOTE HOMEBREW_CORE_GIT_REMOTE HOMEBREW_PIP_INDEX_URL
brew config
brew update
```

## 自带代理配置的包管理器

### npm

恢复官方源并写入用户级代理（Windows 与 macOS 相同）：

```bash
npm config set registry "https://registry.npmjs.org/" --location=user
npm config set proxy "http://127.0.0.1:7897" --location=user
npm config set https-proxy "http://127.0.0.1:7897" --location=user
npm ping
```

### pnpm

按 [pnpm 设置文档](https://pnpm.io/settings)，代理字段名为 `httpProxy` 和 `httpsProxy`：

```bash
pnpm config set registry "https://registry.npmjs.org/" --global
pnpm config set httpProxy "http://127.0.0.1:7897" --global
pnpm config set httpsProxy "http://127.0.0.1:7897" --global
pnpm ping
```

### Maven

配置文件在 `$HOME\.m2\settings.xml`（Windows）或 `~/.m2/settings.xml`（macOS）。

先删掉 `<mirrors>` 里的第三方镜像块，让 Maven 回到默认的 Maven Central；再在 `<settings>` 里加上代理：

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
mvn -U dependency:get "-Dartifact=org.apache.commons:commons-lang3:3.18.0"
```

### Rust / Cargo

编辑 `$HOME\.cargo\config.toml` 或 `~/.cargo/config.toml`，删掉 `[source.crates-io]` 的 `replace-with` 镜像段落，只保留代理设置：

```toml
[http]
proxy = "http://127.0.0.1:7897"
```

验证：

```bash
cargo search serde --limit 1
```

## Git 的两种通道

Git 远端分 HTTPS 和 SSH 两条路。这里只为 `github.com` 单独指派代理，免得影响公司内网的 Git 服务。

### Git HTTPS

Windows：

```powershell
git config --global --unset-all http.proxy 2>$null
git config --global "http.https://github.com.proxy" "http://127.0.0.1:7897"
```

macOS：

```bash
git config --global --unset-all http.proxy 2>/dev/null || true
git config --global "http.https://github.com.proxy" "http://127.0.0.1:7897"
```

验证：

```bash
git ls-remote "https://github.com/git/git.git" HEAD
```

### Git SSH

SSH 走 `ssh.github.com` 的 443 端口，通过本地代理转发。

Windows（编辑 `$HOME\.ssh\config`，利用 Git for Windows 自带的 `connect.exe`）：

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand "C:/Program Files/Git/mingw64/bin/connect.exe" -H 127.0.0.1:7897 %h %p
```

macOS（编辑 `~/.ssh/config`，使用系统自带的 `nc`）：

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand /usr/bin/nc -X connect -x 127.0.0.1:7897 %h %p
```

验证：

```bash
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

## Docker Desktop

按 [Docker 官方文档](https://docs.docker.com/engine/daemon/proxy/)，Docker Desktop 的代理在图形界面里设置：

1. 打开 `Settings → Docker Engine`，删掉 JSON 里的 `"registry-mirrors"` 数组，点击 **Apply & Restart**。
2. 打开 `Settings → Resources → Proxies`，开启 **Manual configuration**，将 HTTP 与 HTTPS Proxy 都填为 `http://127.0.0.1:7897`。

验证：

```bash
docker info --format '{{json .RegistryConfig.Mirrors}}'
docker pull hello-world
```

## 排查小抄

万一哪个工具拉不下包，按这个顺序看一眼就能定位：

1. FlClash 是否开着，`7897` 端口有没有在监听。
2. 跑工具自带的 config 命令，看源地址是不是已经回到了官方地址（防旧环境变量残留）。
3. 改过系统环境变量后，记得新开一个终端窗口再试。
