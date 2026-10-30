---
title: I Gave Up Mirror Registries for Official Sources Behind a Proxy
date: 2026-08-05
tags:
  - Development tools
  - Proxy
  - Windows
  - macOS
  - CLI
description: Resetting Windows and macOS developer tools to their official upstream registries and routing traffic through a local FlClash proxy.
outline: deep
aside: true
---

# I Gave Up Mirror Registries for Official Sources Behind a Proxy

<!-- DESC SEP -->

Resetting Windows and macOS developer tools to their official upstream registries and routing traffic through a local FlClash proxy.

<!-- DESC SEP -->

For a long time I configured a separate mirror registry for every package manager on my machine. Eventually one mirror would lag behind upstream, another tool would rename a config key, and debugging any failed install started with hunting down which mirror I had pointed that tool at months ago.

I finally reset everything to its official upstream source and routed the traffic through FlClash instead. Here are my notes for `npm`, `pnpm`, `uv`, `pip`, `Maven`, `Go`, `Cargo`, `Dart/Flutter`, `Git`, `Homebrew`, and `Docker Desktop`.

## Mirrors and Proxies Solve Different Problems

It helps to keep two layers separate:

- A **mirror** changes *where* the request goes by pointing downloads at a third-party server.
- A **proxy** changes *how* the request gets there, leaving the official destination untouched while forwarding traffic through a local port.

Once the source address is always the official upstream and the network path goes through one local proxy, a broken download is much easier to diagnose.

## Shared Proxy Environment Variables

My FlClash instance listens on `127.0.0.1:7897` with a mixed HTTP/SOCKS port. Tools like `uv`, `pip`, `Go`, `Dart/Flutter`, and `Homebrew` pick up standard proxy environment variables directly.

Windows (PowerShell, saved at the user level):

```powershell
$proxy = "http://127.0.0.1:7897"

[Environment]::SetEnvironmentVariable("HTTP_PROXY", $proxy, "User")
[Environment]::SetEnvironmentVariable("HTTPS_PROXY", $proxy, "User")

$env:HTTP_PROXY = $proxy
$env:HTTPS_PROXY = $proxy
```

macOS (`~/.zshrc`):

```bash
export HTTP_PROXY="http://127.0.0.1:7897"
export HTTPS_PROXY="http://127.0.0.1:7897"
export http_proxy="$HTTP_PROXY"
export https_proxy="$HTTPS_PROXY"
```

Using `http://127.0.0.1:7897` for `HTTPS_PROXY` works because HTTPS clients tunnel through the HTTP proxy via `CONNECT`.

## Tools Using the Shared Environment Variables

### uv

uv defaults to PyPI. Set `UV_DEFAULT_INDEX` explicitly and clear the deprecated `UV_INDEX_URL`:

Windows:

```powershell
[Environment]::SetEnvironmentVariable("UV_INDEX_URL", $null, "User")
[Environment]::SetEnvironmentVariable("UV_DEFAULT_INDEX", "https://pypi.org/simple", "User")

Remove-Item Env:UV_INDEX_URL -ErrorAction SilentlyContinue
$env:UV_DEFAULT_INDEX = "https://pypi.org/simple"
```

macOS (after updating `~/.zshrc`):

```bash
export UV_DEFAULT_INDEX="https://pypi.org/simple"
unset UV_INDEX_URL
source ~/.zshrc
```

Verify:

```bash
uvx --refresh --verbose ruff --version
```

### pip

Point the global index back to PyPI (same on Windows and macOS):

```bash
pip config set global.index-url https://pypi.org/simple
```

Verify:

```bash
pip config list
pip index versions pip
```

If an old environment variable still overrides it, `pip config debug` will show where it comes from.

### Go

`GOPROXY` configures the [Go module proxy](https://go.dev/ref/mod#goproxy-protocol) rather than the network proxy; the underlying HTTP requests automatically use `HTTP_PROXY` / `HTTPS_PROXY`:

```bash
go env -w GOPROXY="https://proxy.golang.org,direct"
go env -w GOSUMDB="sum.golang.org"
```

Verify:

```bash
go env GOPROXY GOSUMDB
go list -m -versions golang.org/x/text
```

### Dart / Flutter

Dart and Flutter use `pub.dev` and Google storage by default. Clearing the three mirror variables restores upstream defaults.

Windows:

```powershell
[Environment]::SetEnvironmentVariable("PUB_HOSTED_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_STORAGE_BASE_URL", $null, "User")
[Environment]::SetEnvironmentVariable("FLUTTER_GIT_URL", $null, "User")

Remove-Item Env:PUB_HOSTED_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_STORAGE_BASE_URL -ErrorAction SilentlyContinue
Remove-Item Env:FLUTTER_GIT_URL -ErrorAction SilentlyContinue
```

macOS (remove from `~/.zshrc`, then run):

```bash
unset PUB_HOSTED_URL FLUTTER_STORAGE_BASE_URL FLUTTER_GIT_URL
source ~/.zshrc
```

### Homebrew

macOS only. Remove `HOMEBREW_API_DOMAIN`, `HOMEBREW_BOTTLE_DOMAIN`, and related mirror variables from `~/.zshrc` or `~/.zprofile`, then unset them in the active shell:

```bash
unset HOMEBREW_API_DOMAIN HOMEBREW_ARTIFACT_DOMAIN HOMEBREW_BOTTLE_DOMAIN
unset HOMEBREW_BREW_GIT_REMOTE HOMEBREW_CORE_GIT_REMOTE HOMEBREW_PIP_INDEX_URL
brew config
brew update
```

## Package Managers with Dedicated Proxy Settings

### npm

Restore the official registry and set the user-level proxy (Windows and macOS):

```bash
npm config set registry "https://registry.npmjs.org/" --location=user
npm config set proxy "http://127.0.0.1:7897" --location=user
npm config set https-proxy "http://127.0.0.1:7897" --location=user
npm ping
```

### pnpm

Per the [pnpm settings docs](https://pnpm.io/settings), the proxy keys are `httpProxy` and `httpsProxy`:

```bash
pnpm config set registry "https://registry.npmjs.org/" --global
pnpm config set httpProxy "http://127.0.0.1:7897" --global
pnpm config set httpsProxy "http://127.0.0.1:7897" --global
pnpm ping
```

### Maven

Edit `$HOME\.m2\settings.xml` (Windows) or `~/.m2/settings.xml` (macOS).

Remove any third-party `<mirrors>` entries so Maven falls back to Maven Central, and add the local proxy under `<settings>`:

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
mvn -U dependency:get "-Dartifact=org.apache.commons:commons-lang3:3.18.0"
```

### Rust / Cargo

In `$HOME\.cargo\config.toml` or `~/.cargo/config.toml`, delete any `replace-with` mirror blocks under `[source.crates-io]` and keep only the HTTP proxy:

```toml
[http]
proxy = "http://127.0.0.1:7897"
```

Verify:

```bash
cargo search serde --limit 1
```

## Git over HTTPS and SSH

Scoping Git’s proxy settings to `github.com` keeps internal corporate Git servers on a direct connection.

### Git HTTPS

Windows:

```powershell
git config --global --unset-all http.proxy 2>$null
git config --global "http.https://github.com.proxy" "http://127.0.0.1:7897"
```

macOS:

```bash
git config --global --unset-all http.proxy 2>/dev/null || true
git config --global "http.https://github.com.proxy" "http://127.0.0.1:7897"
```

Verify:

```bash
git ls-remote "https://github.com/git/git.git" HEAD
```

### Git SSH

Route SSH connections to `ssh.github.com:443` through the local HTTP proxy.

Windows (`$HOME\.ssh\config`, using `connect.exe` bundled with Git for Windows):

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand "C:/Program Files/Git/mingw64/bin/connect.exe" -H 127.0.0.1:7897 %h %p
```

macOS (`~/.ssh/config`, using built-in `nc`):

```sshconfig
Host github.com
    HostName ssh.github.com
    User git
    Port 443
    ProxyCommand /usr/bin/nc -X connect -x 127.0.0.1:7897 %h %p
```

Verify:

```bash
chmod 600 ~/.ssh/config
ssh -T git@github.com
```

## Docker Desktop

As noted in [Docker’s proxy docs](https://docs.docker.com/engine/daemon/proxy/), Docker Desktop manages proxies through its GUI:

1. In `Settings → Docker Engine`, remove `"registry-mirrors"` from the JSON config and click **Apply & Restart**.
2. In `Settings → Resources → Proxies`, enable **Manual configuration** and set both HTTP and HTTPS Proxy to `http://127.0.0.1:7897`.

Verify:

```bash
docker info --format '{{json .RegistryConfig.Mirrors}}'
docker pull hello-world
```

## Quick Troubleshooting Checklist

When a tool fails to fetch packages:

1. Confirm FlClash is running and listening on `127.0.0.1:7897`.
2. Check the tool’s active config to make sure no leftover mirror variable is overriding the upstream URL.
3. Open a fresh terminal window after changing user-level environment variables.
