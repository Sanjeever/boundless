---
title: Port Sentinel
date: 2026-01-15
tags:
  - Open Source
  - Flutter
  - Windows
  - Tools
description: Tired of the tedious process of checking port usage and killing processes on Windows, I developed Port Sentinel using Flutter.
outline: deep
aside: true
---

# Port Sentinel

<!-- DESC SEP -->

Tired of the tedious process of checking port usage and killing processes on Windows, I developed Port Sentinel using Flutter.

<!-- DESC SEP -->

> **October 23, 2026 update**
>
> Port Sentinel 2.0 rebuilds the app with Go + Wails and adds macOS and Linux desktop support. This post records the original Flutter Windows version. Read [Port Sentinel 2.0](/en/posts/2026/10/23-port-sentinel-2) for the rebuild, or [download the latest release](https://github.com/Sanjeever/port_sentinel/releases/latest).

## Why Build This Tool

As a backend developer, I often run into port conflicts when starting a local service, seeing errors like "Port 8080 already in use".

On Windows, the standard resolution flow usually looks like this:

1. Open CMD or PowerShell.
2. Run `netstat -ano | findstr :8080` to find the PID in the output.
3. Open Task Manager, switch to the "Details" tab, and locate the corresponding process by PID.
4. Or directly run `taskkill /PID <PID> /F` in the terminal.

The steps are not difficult, but repeating them multiple times a day is tedious. My requirements were very focused: find which process owns a port, verify what it is, and decide whether to stop it. To bring these steps into a single, easily scannable interface, I built **Port Sentinel**.

## Key Features

Port Sentinel is a Windows desktop application built with Flutter, focused specifically on identifying and managing port conflicts.

Its primary features include:

- **Port List**: Displays current usage for all active TCP and UDP ports.
- **Process Association**: Shows process names alongside PIDs directly, without needing to open Task Manager.
- **Search & Filter**: Supports search by port number, PID, or process name, with protocol filtering (TCP/UDP).
- **Process Termination**: Releases occupied ports with an "End Process" button after verifying the target.
- **Auto-Refresh**: An optional auto-refresh toggle to track state changes.

The interface is kept simple and uncluttered, providing a straightforward utility for resolving local port conflicts.

## Tech Stack Choice

This time I chose **Flutter** to develop the Windows desktop client.

Flutter's way of building interfaces mattered most to me: it let me quickly turn the interface I had in mind into something usable. Performance and package size matter too, but this post contains no controlled comparison with Electron and cannot establish which is better on those measures.

The project is completely open source. If you are interested in Flutter desktop development, feel free to check out the code.

## Get It & Open Source

Port Sentinel is open source on GitHub.

- **GitHub Repository**: [Sanjeever/port_sentinel](https://github.com/Sanjeever/port_sentinel)

See the repository’s Releases page for installers, the current version, and known issues. This tool terminates local processes, so confirm that the PID, process name, and port really belong to the service you intend to stop; do not free a port by accidentally killing a database, editor, or another important task.

If you encounter bugs during use or have suggestions for new features, Issues and PRs are welcome.

`netstat`, PowerShell, and Task Manager can all perform these operations. Port Sentinel brings them into one interface, saving the trips between tools and the copying of PIDs.
