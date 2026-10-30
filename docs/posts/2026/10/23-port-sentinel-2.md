---
title: 端口哨兵 2.0
date: 2026-10-23
tags:
  - 开源
  - Go
  - Wails
  - 工具
description: 用 Go 与 Wails 重写端口哨兵，新增 macOS 与 Linux 桌面版本，整理端口扫描、系统提权与进程退出的边界。
outline: deep
aside: true
---

# 端口哨兵 2.0

<!-- DESC SEP -->

用 Go 与 Wails 重写端口哨兵，新增 macOS 与 Linux 桌面版本，整理端口扫描、系统提权与进程退出的边界。

<!-- DESC SEP -->

今年一月，我用 Flutter 写过一个 Windows 桌面小工具，把查端口、找进程和结束进程放进同一个窗口。[首发那篇文章](/posts/2026/01/15-port-sentinel-release)记下了当时遇到端口冲突、反复翻找 PID 时的烦躁。

十个月过去，我用 Go 和 Wails v2 把它重写了一遍。

前端换成了 React、TypeScript 与 HeroUI，打包目标也加上了 macOS 和 Linux 桌面。工具要回答的还是老问题：服务起不来，端口到底被谁占着，看清之后怎么体面地请它退场？

![Port Sentinel 2.0 macOS 中文浅色界面，展示监听端口、进程名称、本地地址与授权扫描入口](https://raw.githubusercontent.com/Sanjeever/port_sentinel/main/assets/screenshot/main-macos.png)

## 从监听列表到连接详情

日常排查端口冲突，看一眼监听列表就够了。

需要顺藤摸瓜排查本机连接时，可以切到“全部连接”，查看本地地址、远端地址与连接状态。TCP 与 UDP、IPv4 与 IPv6 都在同一张表里，输入端口号、PID 或进程名就能直接过滤。

点开进程名称，右侧会列出可执行文件路径和它名下的关联端口。一个服务常常同时绑着好几个端口，放到一起看，更容易分清这些记录是不是同一套程序。

窗口支持中英文切换，深浅主题可以跟随系统。刷新间隔和窗口尺寸留在本地配置里。用完关掉窗口就退出，下次端口冲突时再叫醒它。

## Go 贴着系统，Web 负责面板

这次重写把前后端的边界划得很清楚。Go 负责连接扫描、进程操作、系统提权、配置与更新；React 负责表格渲染与交互；[Wails](https://wails.io/docs/introduction/) 在中间搭桥，复用系统自带的 WebView。

借用系统 WebView 的好处是包体轻，代价是要顾及不同系统的内核版本。比如面向 macOS 12 打包时，前端样式和脚本得迁就那一版 WebKit 的脾气，不能只看本地浏览器能跑就算数。

底层的连接扫描更是各走各的路。

Windows 调用 `GetExtendedTcpTable` 和 `GetExtendedUdpTable` 直接读表；macOS 调起 `lsof` 解析机器可读输出；Linux 则去读 `/proc/net`，再顺着进程文件描述符把 socket 和 PID 串起来。这些脏活都收在[平台扫描模块](https://github.com/Sanjeever/port_sentinel/tree/v2.0.1/internal/ports)里，向上只交出统一的数据结构。

## 按下结束按钮之前

端口列表是一行行连接，结束操作却会落在整个进程头上。

假设一个服务同时监听 8080 和 8081，你看着 8080 顺手点下结束，8081 也会跟着断掉。所以在确认弹窗里，程序会把目标进程关联的所有端口一并摊开；批量勾选时也会先按进程去重——选了三行，背后可能只是同一个进程。

还有一件小事容易漏掉：操作系统的 PID 是会复用的。

从列表刷新到鼠标点下去的几秒钟里，原进程可能刚好自己退了，系统顺手把同一个 PID 分给了刚启动的另一个无辜进程。为了不杀错人，新版在扫描时会同时记下 PID 和进程创建时间，动手前再核对一次身份。一旦发现对不上，就立刻停手。具体实现在[进程操作模块](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/internal/ports/process.go)里。

默认操作会先请求进程正常退出。如果对方还在运行，或者当前平台不支持对它发送正常退出请求（比如 Windows 下对方根本没有接收关闭消息的窗口），界面会如实反馈，由你决定要不要强制结束。

权限也按需索取。主窗口平时以普通权限运行，自动刷新绝不弹窗打扰。只有当你主动点击“授权扫描”，或者确认结束某个高权限进程却碰壁时，程序才会通过 Windows UAC、macOS 管理员对话框或 Linux polkit 拉起一次临时辅助进程，干完活即销毁，不留密码。

## 下载与已知边界

安装包放在 [GitHub Releases](https://github.com/Sanjeever/port_sentinel/releases/latest)，解压到可写目录即可运行。Flutter 1.x 老用户需要手动安装新版。

| 平台                            | 分发包与运行依赖                                                  |
| ------------------------------- | ----------------------------------------------------------------- |
| Windows 10/11 amd64             | ZIP，依赖 Microsoft Edge WebView2 Runtime                         |
| macOS 12+ Intel / Apple Silicon | Universal ZIP，解压后保留完整 `.app`                              |
| Ubuntu 22.04/24.04 amd64 桌面   | TAR.GZ，依赖 GTK 3、WebKitGTK 4.1；提权需要 polkit 与图形认证代理 |

目前 Windows 包尚未签名，macOS 包使用临时签名且未公证，首次打开可能遇到系统拦截。Linux 侧各发行版的具体依赖见[中文 README](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/README_zh.md)，尚未覆盖的真机验收边界也坦白记在了[开发文档](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/docs/development.md#历史验证记录与待验收边界)里。

项目依然以 [MIT 协议](https://github.com/Sanjeever/port_sentinel/blob/v2.0.1/LICENSE)开源。[源码](https://github.com/Sanjeever/port_sentinel)与[版本日志](https://github.com/Sanjeever/port_sentinel/tree/v2.0.1/docs/releases)都在仓库里，遇到古怪的端口或权限问题，欢迎随时提 Issue。
