---
title: Port Sentinel
date: 2026-01-15
tags:
  - Open Source
  - Flutter
  - Windows
  - Tools
description: Tired of hunting down PIDs and killing processes across terminals on Windows, I built a small Flutter desktop utility called Port Sentinel.
outline: deep
aside: true
---

# Port Sentinel

<!-- DESC SEP -->

Tired of hunting down PIDs and killing processes across terminals on Windows, I built a small Flutter desktop utility called Port Sentinel.

<!-- DESC SEP -->

> **October 23, 2026 update**
>
> Port Sentinel 2.0 rebuilds the app with Go + Wails and adds macOS and Linux support. This post covers the original Flutter Windows release; see [Port Sentinel 2.0](/en/posts/2026/10/23-port-sentinel-2) for the rewrite, or [download the latest release](https://github.com/Sanjeever/port_sentinel/releases/latest).

## Why Build This Tool

When working on backend services, running into `Port 8080 already in use` is a daily ritual.

On Windows, the routine always looks the same:

1. Open a terminal and run `netstat -ano | findstr :8080` to dig out the PID.
2. Open Task Manager, switch to the Details tab, and match the PID to a process name.
3. Or jump back to the terminal and type `taskkill /PID <PID> /F`.

None of it is hard, just tedious when repeated several times an afternoon. All I wanted was a single window that shows who owns a port and lets me stop the process once I’m sure what it is. So I built **Port Sentinel**.

## What It Does

Port Sentinel is a Windows desktop utility built with Flutter, focused on pairing ports with the processes behind them.

- **Port List**: Shows active TCP and UDP ports in one table.
- **Process Mapping**: Displays the process name right next to its PID, without a trip to Task Manager.
- **Search & Filter**: Filters by port number, PID, process name, or protocol.
- **End Process**: Frees an occupied port with a click once you’ve checked the target.
- **Auto-Refresh**: Optionally polls in the background to watch connections change.

It still pays to glance at the process name before clicking End Process, so freeing a port doesn’t take a local database or editor down with it.

## Source & Releases

The project is open source on GitHub, with installers on the Releases page:

- **GitHub Repository**: [Sanjeever/port_sentinel](https://github.com/Sanjeever/port_sentinel)

`netstat` and Task Manager could already do all of this; Port Sentinel simply saves the window-switching and PID-copying in between.
