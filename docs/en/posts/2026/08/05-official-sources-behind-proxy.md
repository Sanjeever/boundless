---
title: I gave up mirror registries for official sources behind a proxy
date: 2026-08-05
tags:
  - Development tools
  - Proxy
  - Windows
  - macOS
  - CLI
description: Developing with both Windows and macOS in China, I stopped configuring a mirror registry for every tool. Instead every tool uses its official source and all network traffic goes through a single FlClash mixed proxy. This post records the complete setup.
outline: deep
aside: true
---

# I gave up mirror registries for official sources behind a proxy

<!-- DESC SEP -->

I used to give every tool its own mirror registry and could never remember which source each one pointed at. Now every tool uses its official source and all traffic goes through a single FlClash proxy — network trouble collapsed from "check each tool's source" to "check the proxy".

<!-- DESC SEP -->

After a while with mirrors, the problem wasn't a one-time "can't connect" — it was chronic. One mirror lagged a version behind, another occasionally served stale packages, and every tool pointed at a different registry, so debugging meant first recalling which one each pointed to. So I flipped the approach: tools keep their official sources, and all network traffic goes through one FlClash mixed proxy. This post records the setup, covering npm, pnpm, uv, pip, Maven, Go, Cargo, Dart/Flutter, Git over HTTP and SSH, Homebrew, and Docker Desktop. If something won't connect, start with the troubleshooting notes at the end.

## Mirror sources and proxies are two different things

Before you start, separate two things that are often conflated:

- A **mirror source** answers "where the request goes" — it redirects downloads to a third-party server.
- A **proxy** answers "how the request travels" — it leaves the target address alone and just routes traffic through a local port.

My old problem was mixing the two: a different mirror per tool, all of them closed third-party services that lagged on versions and needed long-term maintenance. After switching to a proxy, tools keep official sources and the network layer goes through FlClash — a smaller surface, and easier to debug.

So the configuration below only does two things: **reset the source/registry/index to official**, and **route network requests through the proxy**. Some tools have their own proxy settings, others only read the environment variables. Tell those apart and the rest is copy-paste.

## Shared proxy environment variables

FlClash is the proxy client I use; by default it exposes a mixed proxy on port `7897` (both HTTP and SOCKS). The following tools read the standard proxy environment variables directly, so their network layer needs no extra configuration: **uv, pip, Go, Dart/Flutter, Homebrew**. Pin these two variables down first.

Windows (PowerShell, sets user-level variables):

```powershell
$proxy = "http://127.0.0.1:7897"

[Environment]::SetEnvironmentVariable("HTTP_PROXY", $proxy, "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", $proxy, "User")

$env:HTTP_PROXY = $proxy
$env:HTTPS_PROXY = $proxy
```

macOS (in `~/.zshrc`):

```bash
export HTTP_PROXY="http://127.0.0.1:7897"
export HTTPS_PROXY="http://127.0.0.1:7897"
export http_proxy="$HTTP_PROXY"
export https_proxy="$HTTPS_PROXY"
```

Verify:

```bash
source ~/.zshrc
printf '%s\n' "$HTTP_PROXY"
printf '%s\n' "$HTTPS_PROXY"
```

Writing `HTTPS_PROXY=http://127.0.0.1:7897` works because you treat it as an HTTP proxy; for HTTPS targets the proxy forwards through a CONNECT tunnel, so no separate SOCKS setting is needed.

## Official source, network via the shared proxy variables

### uv

uv's default index is PyPI. Set it explicitly to `https://pypi.org/simple` and remove the deprecated `UV_INDEX_URL` so it doesn't conflict with `UV_DEFAULT_INDEX`.

Windows:

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

macOS: remove the old `UV_INDEX_URL` from `~/.zshrc`, keep and apply:

```bash
export UV_DEFAULT_INDEX="https://pypi.org/simple"
unset UV_INDEX_URL
source ~/.zshrc
```

Verify (same on both platforms):

```bash
printf '%s\n' "$UV_DEFAULT_INDEX"
uvx --refresh --verbose ruff --version
```

If `uvx` prints the ruff version, PyPI and the network both work.

### pip

pip uses PyPI as its default index, just like uv. Restoring the official source means setting `global.index-url` explicitly; the network goes through the shared proxy variables.

Same on Windows and macOS:

```bash
pip config set global.index-url https://pypi.org/simple
```

pip's user-level config file lives at `%APPDATA%\pip\pip.ini` on Windows and `~/.config/pip/pip.conf` on macOS. Verify:

```bash
pip config list
pip index versions pip
```

If `pip index versions pip` lists versions, PyPI and the network both work.

### Go

`GOPROXY` is Go's module repository, **not** a network proxy. It decides where modules come from; the actual proxy is the shared environment variables above.

Same on Windows and macOS:

```bash
go env -w GOPROXY="https://proxy.golang.org,direct"
go env -w GOSUMDB="sum.golang.org"
```

Verify:

```bash
go env GOPROXY
go env GOSUMDB
go list -m -versions golang.org/x/text
```

If `go list` prints versions, the module proxy and network both work.

### Dart / Flutter

Dart and Flutter share pub.dev as their package repository, and Flutter's engine artifacts come from Google's storage. The former is controlled by `PUB_HOSTED_URL`, the latter by `FLUTTER_STORAGE_BASE_URL`; restoring official sources means removing the two variables that point at a mirror. If `FLUTTER_GIT_URL` (the mirror address used when cloning the Flutter SDK repo) still lingers, remove that too.

Windows (removes user-level variables):

```powershell
[Environment]::SetEnvironmentVariable("PUB_HOSTED_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_STORAGE_BASE_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_GIT_URL", $null, "User")

Remove-Item Env:PUB_HOSTED_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_STORAGE_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_GIT_URL -ErrorAction SilentlyContinue
```

macOS: remove these three variables from `~/.zshrc` and clean the current shell:

```bash
unset PUB_HOSTED_URL
unset FLUTTER_STORAGE_BASE_URL
unset FLUTTER_GIT_URL
source ~/.zshrc
```

Network goes through the shared proxy variables. Verify:

```bash
env | grep -E '^PUB_HOSTED_URL=|^FLUTTER_STORAGE_BASE_URL=|^FLUTTER_GIT_URL='
```

No output is expected. In a Flutter project run:

```bash
flutter pub get
```

If it resolves dependencies, pub.dev and the network both work.

### Homebrew

macOS only. Homebrew has no separate proxy configuration; it uses the shared variables, so the only thing to do is clear the mirror variables.

Remove from `~/.zshrc`, `~/.zprofile`, `~/.bash_profile`:

```text
HOMEBREW_API_DOMAIN
HOMEBREW_ARTIFACT_DOMAIN
HOMEBREW_BOTTLE_DOMAIN
HOMEBREW_BREW_GIT_REMOTE
HOMEBREW_CORE_GIT_REMOTE
HOMEBREW_PIP_INDEX_URL
```

Clean the current shell:

```bash
unset HOMEBREW_API_DOMAIN
unset HOMEBREW_ARTIFACT_DOMAIN
unset HOMEBREW_BOTTLE_DOMAIN
unset HOMEBREW_BREW_GIT_REMOTE
unset HOMEBREW_CORE_GIT_REMOTE
unset HOMEBREW_PIP_INDEX_URL
```

Verify:

```bash
brew config
brew update
env | grep -E '^HOMEBREW_(API_DOMAIN|ARTIFACT_DOMAIN|BOTTLE_DOMAIN|BREW_GIT_REMOTE|CORE_GIT_REMOTE|PIP_INDEX_URL)='
```

The last command should produce no output.

## Package managers with their own proxy settings

### npm

npm's official registry is `https://registry.npmjs.org/`, and it supports `proxy`, `https-proxy`, and the standard proxy environment variables. Restore the official source and set the proxy (same on Windows and macOS):

```bash
npm config set registry "https://registry.npmjs.org/" --location=user
npm config set proxy "http://127.0.0.1:7897" --location=user
npm config set https-proxy "http://127.0.0.1:7897" --location=user
```

Verify:

```bash
npm config get registry --location=user
npm config get proxy --location=user
npm config get https-proxy --location=user
npm ping
```

`npm ping` prints `PONG` on success.

### pnpm

Written for the current pnpm 11/12 configuration; the network options are `httpProxy` and `httpsProxy`. Restore the official source and set the proxy (same on Windows and macOS):

```bash
pnpm config set registry "https://registry.npmjs.org/" --global
pnpm config set httpProxy "http://127.0.0.1:7897" --global
pnpm config set httpsProxy "http://127.0.0.1:7897" --global
```

Verify:

```bash
pnpm config get registry --global
pnpm config get httpProxy --global
pnpm config get httpsProxy --global
pnpm ping
```

`pnpm ping` prints `PONG` on success.

### Maven

Config file location: `$HOME\.m2\settings.xml` on Windows, `~/.m2/settings.xml` on macOS.

**Restore the official source:** remove `<mirror>` entries such as Aliyun, Tencent, or Huawei's, for example:

```diff
- <mirrors>
-     <mirror>
-         <id>aliyun</id>
-         <mirrorOf>*</mirrorOf>
-         <url>https://maven.aliyun.com/repository/public</url>
-     </mirror>
- </mirrors>
```

With no third-party `<mirror>` override, Maven uses Maven Central by default.

**Set the proxy:** add inside the existing `<settings>`; if a `<proxies>` block already exists, merge into it rather than creating a duplicate:

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

Verify:

```bash
mvn help:effective-settings
mvn -U dependency:get "-Dartifact=org.apache.commons:commons-lang3:3.18.0"
```

The download log should show:

```text
Downloading from central: https://repo.maven.apache.org/maven2/...
```

### Rust / Cargo

Cargo uses crates.io by default. Config file location: `$HOME\.cargo\config.toml` on Windows, `~/.cargo/config.toml` on macOS.

**Restore official crates.io:** remove the third-party source override, for example:

```diff
- [source.crates-io]
- replace-with = "rsproxy"
-
- [source.rsproxy]
- registry = "sparse+https://rsproxy.cn/index/"
```

**Set the proxy:** if an `[http]` section already exists, just add `proxy`:

```toml
[http]
proxy = "http://127.0.0.1:7897"
```

Verify:

```bash
cargo search serde --limit 1
```

If `cargo search` returns results, crates.io and the network both work.

## Git's two channels

Git remotes can go over HTTPS or SSH, and the two paths are handled separately. The rule of thumb: proxy GitHub only and skip a global catch-all proxy, so unrelated requests don't get routed through it.

### Git: HTTPS

Windows: clear any global generic proxy, then proxy only GitHub:

```powershell
git config --global --unset-all http.proxy 2>$null
git config --global `
    "http.https://github.com.proxy" `
    "http://127.0.0.1:7897"
```

macOS:

```bash
git config --global --unset-all http.proxy 2>/dev/null || true
git config --global \
    "http.https://github.com.proxy" \
    "http://127.0.0.1:7897"
```

Restore the current repo's GitHub official URL:

```bash
git remote get-url origin
git remote set-url origin "https://github.com/OWNER/REPOSITORY.git"
```

Verify:

```bash
git config --global --get "http.https://github.com.proxy"
git ls-remote "https://github.com/git/git.git" HEAD
```

### Git: SSH

GitHub's SSH endpoint over port 443 is `ssh.github.com:443`. For SSH, the connection goes out through `ssh.github.com` on port 443, and a system tool forwards the connection to the local proxy.

Windows: restore the GitHub SSH URL, and confirm Git for Windows ships the `connect` helper:

```powershell
git remote set-url origin "git@github.com:OWNER/REPOSITORY.git"
Test-Path "$env:ProgramFiles\Git\mingw64\bin\connect.exe"
```

Edit `$HOME\.ssh\config`, adding:

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand "C:/Program Files/Git/mingw64/bin/connect.exe" -H 127.0.0.1:7897 %h %p
```

macOS: restore the GitHub SSH URL, then edit `~/.ssh/config`:

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

Set permissions and verify:

```bash
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

## Docker Desktop

macOS only. Docker Desktop must be configured inside its own settings; proxy configuration in `daemon.json` is ignored, so editing the file won't help.

**Restore the official source:** go to `Docker Desktop → Settings → Docker Engine`, remove config like:

```diff
{
-  "registry-mirrors": [
-    "https://some-mirror-url"
-  ]
}
```

Click **Apply & Restart**.

**Set the proxy:** go to `Docker Desktop → Settings → Resources → Proxies`, choose **Manual configuration**:

```text
HTTP Proxy:  http://127.0.0.1:7897
HTTPS Proxy: http://127.0.0.1:7897
```

Verify:

```bash
docker info --format '{{json .RegistryConfig.Mirrors}}'
docker pull hello-world
```

The first command should print `[]`, meaning no leftover mirrors.

## Troubleshooting

- Make sure FlClash is running and port 7897 is listening.
- Tell apart "wrong source" from "proxy not working": print the registry/index config to confirm it's official, then test the network once (e.g. `npm ping`, `docker pull`).
- Environment variables only apply to the current shell; reload them in new terminals (macOS `source ~/.zshrc`).
- Before removing mirrors, confirm there are no leftover third-party source address overrides.

## Summary

The trade-off is that without a proxy, official sources may be unreachable. In return, every tool points at the official, traceable source, and network problems collapse into a single failure point — if the proxy fails, you check one place. To get started, first set the two variables in the shared proxy environment variables section, then reset sources for each tool on your list.