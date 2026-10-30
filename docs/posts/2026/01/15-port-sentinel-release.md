---
title: 端口哨兵
date: 2026-01-15
tags:
  - 开源
  - Flutter
  - Windows
  - 工具
description: 为了省掉在 Windows 上反复查端口、对 PID 和杀进程的步骤，我用 Flutter 写了一个桌面小工具 Port Sentinel。
outline: deep
aside: true
---

# 端口哨兵

<!-- DESC SEP -->

为了省掉在 Windows 上反复查端口、对 PID 和杀进程的步骤，我用 Flutter 写了一个桌面小工具 Port Sentinel。

<!-- DESC SEP -->

> **2026 年 10 月 23 日更新**
>
> Port Sentinel 2.0 已使用 Go + Wails 重构，新增 macOS 与 Linux 支持。本文记录最初的 Flutter Windows 版本，重构过程见[《端口哨兵 2.0》](/posts/2026/10/23-port-sentinel-2)，也可直接[下载最新版](https://github.com/Sanjeever/port_sentinel/releases/latest)。

## 为什么做这个工具

写后端服务时，本地启动撞上 `Port 8080 already in use` 是家常便饭。

在 Windows 上，排查起来总是那几步：

1. 打开终端跑 `netstat -ano | findstr :8080`，从输出里扒出 PID。
2. 切到任务管理器的“详细信息”页，顺着 PID 找到对应的进程。
3. 或者回到终端敲 `taskkill /PID <PID> /F`。

步骤不难，一天重复几回却很烦人。我想要的无非是在一个窗口里看清端口被谁占了，确认无误后顺手把它关掉。于是写了个小工具，取名 **Port Sentinel**（端口哨兵）。

## 它做什么

Port Sentinel 是一个用 Flutter 写的 Windows 桌面应用，只干一件事：把端口和进程对应起来。

- **端口列表**：列出当前活动的 TCP 和 UDP 端口。
- **进程关联**：把占用端口的进程名和 PID 摆在同一行，省去翻任务管理器的工夫。
- **搜索与过滤**：按端口号、PID、进程名或协议筛选。
- **结束进程**：看清目标后直接点按钮释放端口，免去手敲命令。
- **自动刷新**：可选定时刷新，留意本机连接变化。

结束进程前还是得看一眼进程名，免得为了腾个端口，顺手把正在跑的数据库或编辑器给关了。

## 获取与源码

项目开源在 GitHub，安装包和版本记录都在 Release 页面里：

- **GitHub 仓库**：[Sanjeever/port_sentinel](https://github.com/Sanjeever/port_sentinel)

`netstat` 和任务管理器本来就能办成这些事，Port Sentinel 只是替我省掉了来回切窗口和抄 PID 的几秒钟。
