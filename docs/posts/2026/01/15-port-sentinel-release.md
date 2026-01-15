---
title: Port Sentinel：我做了一款 Windows 端口管理工具
date: 2026-01-15
tags:
  - 开源
  - Flutter
  - Windows
  - 工具
description: 因为受够了 Windows 上查看端口占用和杀进程的繁琐，我用 Flutter 开发了 Port Sentinel。
outline: deep
aside: true
---

# Port Sentinel：我做了一款 Windows 端口管理工具

<!-- DESC SEP -->

因为受够了 Windows 上查看端口占用和杀进程的繁琐，我用 Flutter 开发了 Port Sentinel。

<!-- DESC SEP -->

## 为什么造这个轮子？

作为一个后端开发者，我经常遇到这样的场景：启动本地服务时报错 "Port 8080 already in use"。

在 Windows 上，标准的解决流程通常是这样的：

1. 打开 CMD 或 PowerShell。
2. 输入 `netstat -ano | findstr :8080`，眯着眼睛在一堆输出里找到 PID。
3. 打开任务管理器，切换到“详细信息”选项卡，通过 PID 找到对应的进程。
4. 或者直接在命令行输入 `taskkill /PID <PID> /F`。

这个过程虽然不难，但很繁琐，尤其是当这种事情每天发生好几次的时候。市面上虽然有一些类似工具，但要么界面停留在 Windows 98 时代，要么广告满天飞，要么功能过于臃肿。

我想，为什么不自己做一个呢？简单、好看、直观。

于是就有了 **Port Sentinel**（端口哨兵）。

## 它是做什么的？

Port Sentinel 是一个基于 Flutter 开发的 Windows 桌面应用，专注于解决“端口被谁占用了”这个问题。

它主要提供以下功能：

- **实时监控**：直观地列出当前所有 TCP/UDP 端口的使用情况。
- **进程关联**：一眼就能看到是哪个程序（进程名和 PID）占用了端口，不用再去翻任务管理器。
- **搜索过滤**：支持通过端口号、PID 或进程名称进行搜索，也支持按协议（TCP/UDP）过滤。
- **一键终止**：发现冲突进程？直接点击“结束进程”按钮，解决战斗。
- **自动刷新**：支持可选的自动刷新功能，实时掌握系统状态。

界面设计上，我尽量保持简洁现代，，希望能给同样被端口问题困扰的开发者带来一点便利。

## 技术栈选择

这次我选择了 **Flutter** 来开发 Windows 桌面端。

虽然 Electron 也是个不错的选择，但 Flutter 在性能和包体积上往往有更好的表现。而且 Flutter 的 UI 构建方式让我能快速把脑海中的界面还原出来。

项目完全开源，如果你对 Flutter 桌面开发感兴趣，欢迎去翻翻代码。

## 获取与开源

Port Sentinel 已经开源在 GitHub 上。

- **GitHub 仓库**: [Sanjeever/port_sentinel](https://github.com/Sanjeever/port_sentinel)

目前发布的版本是 v1.0.2，基本功能已经稳定。如果你在使用过程中遇到 BUG，或者有新的功能建议，欢迎提 Issue 或 PR。

希望这个小工具能帮你节省一点点敲命令的时间。
