---
title: 端口哨兵
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

# 端口哨兵

<!-- DESC SEP -->

因为受够了 Windows 上查看端口占用和杀进程的繁琐，我用 Flutter 开发了 Port Sentinel。

<!-- DESC SEP -->

> **2026 年 10 月 23 日更新**
>
> Port Sentinel 2.0 使用 Go + Wails 重构，新增 macOS 与 Linux 桌面支持。本文记录 Flutter Windows 首发版本，重构介绍见[《端口哨兵 2.0》](/posts/2026/10/23-port-sentinel-2)。[下载新版](https://github.com/Sanjeever/port_sentinel/releases/latest)。

## 为什么做这个工具

作为后端开发，经常遇到启动本地服务报错 "Port 8080 already in use"。

在 Windows 上，标准的解决流程通常是这样的：

1. 打开 CMD 或 PowerShell。
2. 输入 `netstat -ano | findstr :8080`，在一堆输出里找到 PID。
3. 打开任务管理器，切换到“详细信息”选项卡，通过 PID 找到对应的进程。
4. 或者直接在命令行输入 `taskkill /PID <PID> /F`。

这个过程虽然不难，但每天重复几次就很琐碎。我需要的功能很集中：按端口找到进程，核对它是谁，再决定要不要结束它。为了把这几步集中在一个容易扫读的界面里，我做了 **Port Sentinel**（端口哨兵）。

## 功能特点

Port Sentinel 是一个基于 Flutter 开发的 Windows 桌面应用，专注于解决“端口被谁占用了”这个问题。

它主要提供以下功能：

- **端口列表**：列出当前所有 TCP/UDP 端口的使用情况。
- **进程关联**：直接显示占用端口的进程名与 PID，不用再翻任务管理器。
- **搜索过滤**：支持通过端口号、PID 或进程名称进行搜索，也支持按协议（TCP/UDP）过滤。
- **结束进程**：核对目标后，通过“结束进程”按钮释放被占用的端口。
- **自动刷新**：支持可选的自动刷新功能，掌握系统状态变化。

界面设计尽量保持简洁，希望能给同样被端口冲突困扰的开发者带来一点便利。

## 技术栈选择

这次我选择了 **Flutter** 来开发 Windows 桌面端。

我更看重 Flutter 的 UI 构建方式，它让我能快速把脑海中的界面还原出来。性能和包体积也会影响桌面应用体验，但这篇文章没有与 Electron 做同条件比较，不能据此判断两者孰优。

项目完全开源，如果你对 Flutter 桌面开发感兴趣，欢迎去翻翻代码。

## 获取与开源

Port Sentinel 已经开源在 GitHub 上。

- **GitHub 仓库**: [Sanjeever/port_sentinel](https://github.com/Sanjeever/port_sentinel)

安装包、当前版本和已知问题请以仓库的 Release 页面为准。这个工具会终止本机进程，执行前应确认 PID、进程名与端口确实属于目标服务；不要为了腾出端口，误杀正在运行的数据库、编辑器或其他重要任务。

如果你在使用过程中遇到 Bug，或者有新的功能建议，欢迎提 Issue 或 PR。

`netstat`、PowerShell 和任务管理器都能完成这些操作。Port Sentinel 把它们集中在一个界面里，省掉来回查找和抄 PID 的步骤。
