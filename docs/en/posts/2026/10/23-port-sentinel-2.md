---
title: Port Sentinel 2.0
date: 2026-10-23
tags:
  - Open Source
  - Go
  - Wails
  - Tools
description: Port Sentinel 2.0 rebuilds the app with Go + Wails, adds macOS and Linux desktop packages, and explains scanning, authorization, process operations, and the hands-on checks still needed.
outline: deep
aside: true
---

# Port Sentinel 2.0

<!-- DESC SEP -->

Port Sentinel 2.0 rebuilds the app with Go + Wails and adds macOS and Linux desktop packages. This post covers scanning, authorization, and process operations, along with the scope of build checks and hands-on desktop validation.

<!-- DESC SEP -->

In January, I built a Flutter Windows desktop tool that brought port lookup, process identification, and process termination into one interface. The [original release post](/en/posts/2026/01/15-port-sentinel-release) records the frustration of repeatedly looking up PIDs to resolve port conflicts.

This time, I rewrote Port Sentinel with Go + Wails v2, using React, TypeScript, and HeroUI for the interface, and added macOS and Linux desktop packages. The tool still centers on the same problem. When a service cannot start, which process is using its port, and how should that process be stopped once you have checked it?

![Port Sentinel 2.0 on macOS in Simplified Chinese and light mode, showing listening ports, process names, local addresses, and the authorized scan control](https://raw.githubusercontent.com/Sanjeever/port_sentinel/main/assets/screenshot/main-macos.png)

## From port conflicts to connection details

For a port conflict, the listening-port view is usually enough. To inspect local connections more broadly, switch to all connections and view local addresses, remote addresses, and connection states. The table covers TCP/UDP and IPv4/IPv6, with search by port, PID, or process name.

Click a process name to open its details and check the executable path, when readable, and associated ports. Search, filters, numeric sorting, and copying all work around this table. A process can occupy several ports at once, and its details help establish whether those rows belong to the same service.

The new version also supports Simplified Chinese and English, light and dark themes, and system preferences. Settings such as the refresh interval and window size stay on the local machine. Closing the window exits the app; open it again when you need to inspect a port.

## Go for system access, web technologies for the interface

The rebuild separates responsibilities. Go handles connection scanning, process operations, system authorization, settings, and updates. React displays data and handles interaction. Wails connects the two and manages the desktop window lifecycle.

[Wails](https://wails.io/docs/introduction/) reuses the system WebView and lets the frontend call Go methods. Tables, search, and settings can use web technologies while system access stays on the Go side. This also makes the system WebView version part of frontend compatibility. Targeting macOS 12, for example, requires accounting for its WebKit capabilities and checking the actual interface after a successful build.

Connection scanning still needs a separate implementation on each platform. Windows reads connection tables through `GetExtendedTcpTable` and `GetExtendedUdpTable`. macOS runs `lsof` and parses its machine-readable output. Linux reads `/proc/net` and uses process file descriptors to associate sockets with PIDs. These implementations live in the [platform scanning module](https://github.com/Sanjeever/port_sentinel/tree/v2.0.1/internal/ports).

The results feed the same search, filtering, and process-operation flow. The interface can be shared, while system APIs, visibility, and authorization need platform-specific handling.

## Before stopping a process

The table displays connections, but termination affects an entire process. Suppose a service listens on both 8080 and 8081. Selecting 8080 and stopping the process also closes 8081. The confirmation therefore needs to show the process and its associated ports, and batch selection must deduplicate by process. Three selected rows may represent a single target.

PID reuse adds another concern. Between a table refresh and a button click, the original process might exit and the system might assign its PID to another process. The new version stores both the PID and creation time, then checks the identity again before acting. If the target has changed, that operation stops. The logic is in the [process-operation implementation](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/internal/ports/process.go).

The default action requests a graceful exit. If the target remains running, or the platform cannot request a graceful exit for it, the interface reports that result. Force termination requires separate confirmation. On Windows, graceful exit depends on the target receiving a window-close request. A process without a suitable window is explicitly reported as unsupported for graceful exit.

After sending an exit request, the app checks the process state and rescans actual connections. A target that stays running, or a partial failure during a batch operation, remains visible in the results so the user can decide what to do next.

Authorization is scoped to an operation as well. The main interface runs without elevation. An explicit authorized scan, or an already confirmed termination that encounters insufficient permissions, starts a temporary helper through Windows UAC, the macOS administrator dialog, or Linux polkit. Elevated access is limited to that request. Auto-refresh does not repeatedly prompt for authorization, and the app does not store administrator passwords.

An authorized scan can increase visibility, but system protections may still prevent some information from being read. The interface distinguishes permission failures, exited processes, and scan failures so missing information is not mistaken for an absence of connections.

## Downloads and migration

The supported targets are listed below. Packages are available from [GitHub Releases](https://github.com/Sanjeever/port_sentinel/releases/latest).

| Platform                         | Package and runtime requirements                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Windows 10/11 amd64              | ZIP; requires Microsoft Edge WebView2 Runtime                                                            |
| macOS 12+ Intel / Apple Silicon  | Universal ZIP; keep the complete `.app` after extraction                                                 |
| Ubuntu 22.04/24.04 amd64 desktop | TAR.GZ; requires GTK 3 and WebKitGTK 4.1; elevation requires polkit and a graphical authentication agent |

Extract the complete package to a writable location before running it. Flutter 1.x users need to install v2 manually. Official builds of the new app can check for subsequent updates. Download, replacement, and restart require confirmation, and downloads can be canceled.

Current Windows packages are unsigned. macOS packages use an ad hoc signature and are not notarized, so operating-system security checks may block installation. Other Linux distributions have not been verified. See the [README](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/README.md) for dependencies and installation details.

The repository records a native macOS window check and successful CI builds across the three platforms. Successful real administrator authentication, Windows/Linux graphical desktops, execution on macOS 12 and Intel hardware, and installed-app update and restart still need hands-on validation. The [validation record](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/docs/development.md#历史验证记录与待验收边界) lists the remaining scope.

The project remains open source under the [MIT license](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/LICENSE). The [source](https://github.com/Sanjeever/port_sentinel) and [release notes](https://github.com/Sanjeever/port_sentinel/tree/v2.0.1/docs/releases) are in the repository. If you encounter a problem, please include the operating-system version, steps, and actual result in an Issue.
