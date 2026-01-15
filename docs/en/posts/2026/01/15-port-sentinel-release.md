---
title: Port Sentinel: I Built a Windows Port Management Tool
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

# Port Sentinel: I Built a Windows Port Management Tool

<!-- DESC SEP -->

Tired of the tedious process of checking port usage and killing processes on Windows, I developed Port Sentinel using Flutter.

<!-- DESC SEP -->

## Why Reinvent the Wheel?

As a backend developer, I often encounter this scenario: starting a local service and getting the error "Port 8080 already in use".

On Windows, the standard solution flow usually looks like this:

1. Open CMD or PowerShell.
2. Type `netstat -ano | findstr :8080`, squinting to find the PID in the output.
3. Open Task Manager, switch to the "Details" tab, and find the corresponding process by PID.
4. Or directly type `taskkill /PID <PID> /F` in the command line.

While not difficult, this process is tedious, especially when it happens several times a day. Although there are some similar tools on the market, they either have interfaces stuck in the Windows 98 era, are full of ads, or are overly bloated.

I thought, why not build one myself? Simple, good-looking, and intuitive.

And so, **Port Sentinel** was born.

## What Does It Do?

Port Sentinel is a Windows desktop application built with Flutter, focused on solving the question "Who is using this port?".

It mainly provides the following features:

- **Real-time Monitoring**: Intuitively list the usage status of all current TCP/UDP ports.
- **Process Association**: See at a glance which program (process name and PID) is occupying the port, without having to dig through Task Manager.
- **Search & Filter**: Support searching by port number, PID, or process name, and filtering by protocol (TCP/UDP).
- **One-Click Termination**: Found a conflicting process? Just click the "End Process" button to resolve it.
- **Auto-Refresh**: Supports optional auto-refresh to keep track of system status in real-time.

In terms of interface design, I tried to keep it simple and modern, hoping to bring a little convenience to developers who are also troubled by port issues.

## Tech Stack Choice

This time I chose **Flutter** to develop the Windows desktop client.

Although Electron is also a good choice, Flutter often performs better in terms of performance and package size. Moreover, Flutter's UI construction method allowed me to quickly reproduce the interface in my mind.

The project is completely open source. If you are interested in Flutter desktop development, feel free to check out the code.

## Get It & Open Source

Port Sentinel is open source on GitHub.

- **GitHub Repository**: [Sanjeever/port_sentinel](https://github.com/Sanjeever/port_sentinel)

The current released version is v1.0.2, and the basic functions are stable. If you encounter bugs during use or have suggestions for new features, Issues and PRs are welcome.

I hope this little tool can save you a little bit of time typing commands.
