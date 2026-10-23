---
title: 端口哨兵 2.0
date: 2026-10-23
tags:
  - 开源
  - Go
  - Wails
  - 工具
description: Port Sentinel 2.0 使用 Go + Wails 重构，新增 macOS 与 Linux 桌面支持，并重新整理端口扫描、系统授权和进程操作流程。
outline: deep
aside: true
---

# 端口哨兵 2.0

<!-- DESC SEP -->

Port Sentinel 2.0 使用 Go + Wails 重构，新增 macOS 与 Linux 桌面支持，并重新整理端口扫描、系统授权和进程操作流程。

<!-- DESC SEP -->

今年 1 月，我用 Flutter 写过一个 Windows 桌面工具，把查端口、找进程和结束进程放进同一个界面。[首发文章](/posts/2026/01/15-port-sentinel-release)记录着当时遇到端口冲突、反复查找 PID 时那点烦躁。

这次，我用 Go + Wails v2 重写端口哨兵，界面采用 React、TypeScript 和 HeroUI，并增加 macOS、Linux 桌面分发包。工具仍然围绕同一个问题展开。服务启动失败，端口被谁占用，确认之后怎样结束目标进程？

![Port Sentinel 2.0 macOS 中文浅色界面，展示监听端口、进程名称、本地地址与授权扫描入口](https://raw.githubusercontent.com/Sanjeever/port_sentinel/main/assets/screenshot/main-macos.png)

## 从端口占用到连接详情

日常排查端口冲突，先看监听端口就够。需要追踪本机连接时，可以切换到全部连接，查看本地地址、远端地址与连接状态。TCP/UDP、IPv4/IPv6 都在同一张表里，搜索支持端口号、PID 和进程名称。

找到目标后，点击进程名称打开详情，核对可执行文件路径与关联端口。搜索、筛选、数值排序和复制都围绕这张表展开。一个进程可能同时占用多个端口，详情能帮助判断这些记录是否属于同一个服务。

新版也支持简体中文与英文、浅色与深色主题，以及跟随系统设置。刷新间隔和窗口大小等偏好保存在本机。关闭窗口就退出，需要查端口时再打开。

## Go 处理系统能力，Web 构建界面

这次实现把职责分开。Go 负责连接扫描、进程操作、系统授权、设置与更新，React 负责展示数据和处理交互，Wails 连接两端并管理桌面窗口生命周期。

[Wails](https://wails.io/docs/introduction/)复用系统 WebView，并让前端调用 Go 方法。于是，表格、搜索和设置界面可以采用 Web 技术，系统访问留在 Go 侧。随之而来，系统 WebView 版本也会影响前端兼容范围。比如面向 macOS 12，就需要顾及其 WebKit 能力，打包成功之后还要检查真实界面。

跨平台扫描也需要分别实现。Windows 通过 `GetExtendedTcpTable`、`GetExtendedUdpTable` 读取连接；macOS 调用 `lsof`，解析机器可读输出；Linux 读取 `/proc/net`，再结合进程文件描述符关联 socket 与 PID。相关实现集中在[平台扫描模块](https://github.com/Sanjeever/port_sentinel/tree/v2.0.1/internal/ports)。

这些数据最后进入同一套搜索、筛选和进程操作流程。界面可以统一，系统接口、可见范围和授权方式仍需逐个平台处理。

## 结束进程之前

端口列表按连接展示，结束操作却作用于整个进程。假设一个服务同时监听 8080 和 8081，选中 8080 并结束进程，8081 也会随之关闭。因此，确认操作时需要展示进程与关联端口，批量选择也要先按进程去重。选中三行，可能实际只有一个目标进程。

还有一个容易忽略之处，PID 会被复用。从列表刷新到点击按钮之间，原进程可能退出，系统又把相同 PID 分配给另一个进程。新版保存 PID 与创建时间，执行前再次复核身份；发现目标发生变化，就停止该项操作。具体逻辑见[进程操作实现](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/internal/ports/process.go)。

默认操作请求正常退出。目标仍在运行，或当前平台无法对它执行正常退出时，界面会反馈结果，强制结束需要另行确认。Windows 正常退出依赖目标接收窗口关闭请求，目标没有适用窗口时，程序会明确报告不支持正常退出。

发出退出请求之后，程序还会检查进程状态，并重新扫描实际连接。某个目标没有退出，或批量操作中有一部分失败，都需要在结果中保留，方便继续判断下一步。

权限同样按操作处理。主界面以普通权限运行，用户主动授权扫描，或已经确认结束操作却遇到权限不足时，再通过 Windows UAC、macOS 管理员对话框或 Linux polkit 启动临时辅助进程。高权限范围限定在本次请求，自动刷新不会反复弹出授权窗口，也不保存管理员密码。

授权扫描可以扩大可见范围，但系统保护仍可能阻止读取部分信息。界面需要区分权限不足、进程退出与扫描失败，避免把没有读到信息当成没有连接。

## 下载与迁移

新版支持目标如下，安装包见 [GitHub Releases](https://github.com/Sanjeever/port_sentinel/releases/latest)。

| 平台                            | 分发包与运行依赖                                                  |
| ------------------------------- | ----------------------------------------------------------------- |
| Windows 10/11 amd64             | ZIP，需要 Microsoft Edge WebView2 Runtime                         |
| macOS 12+ Intel / Apple Silicon | Universal ZIP，解压后保留完整 `.app`                              |
| Ubuntu 22.04/24.04 amd64 桌面   | TAR.GZ，需要 GTK 3、WebKitGTK 4.1；提权需要 polkit 与图形认证代理 |

下载后先完整解压到可写位置，再运行程序。Flutter 1.x 用户需要手动安装 v2。新版正式构建支持检查后续更新，下载、替换和重启均需确认，下载过程可以取消。

当前 Windows 包未签名，macOS 包采用临时签名且未经公证，安装时可能遇到系统拦截。其他 Linux 发行版尚未验证，依赖要求与安装说明见[中文 README](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/README_zh.md)。

仓库已记录 macOS 本机窗口检查与三平台 CI 构建通过。真实管理员认证成功、Windows/Linux 图形桌面、macOS 12 与 Intel 设备运行，以及已安装程序升级重启仍待实测，具体范围见[验证记录](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/docs/development.md#历史验证记录与待验收边界)。

项目继续以 [MIT 协议](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/LICENSE)开源。[源码](https://github.com/Sanjeever/port_sentinel)与[版本日志](https://github.com/Sanjeever/port_sentinel/tree/v2.0.1/docs/releases)都在仓库，使用中遇到问题，欢迎附上系统版本、操作步骤与实际结果提交 Issue。
