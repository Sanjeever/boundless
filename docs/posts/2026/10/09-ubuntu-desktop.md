---
title: Ubuntu 26.04 桌面折腾记
date: 2026-10-09
tags:
  - Ubuntu
  - Linux
  - Xfce
  - ToDesk
description: 从 ToDesk 卡在 100% 开始，记录在 Ubuntu 26.04 上换用 Xfce、补齐输入驱动与图形授权组件，并把桌面调顺手的过程。
outline: deep
aside: true
---

# Ubuntu 26.04 桌面折腾记

<!-- DESC SEP -->

从 ToDesk 卡在 100% 开始，记录在 Ubuntu 26.04 上换用 Xfce、补齐输入驱动与图形授权组件，并把桌面调顺手的过程。

<!-- DESC SEP -->

本来只是想从 Windows 远程连一台 Ubuntu 26.04 实体机。两边装好 ToDesk，输完设备码，进度条飞快走到 100%，然后就一动不动了。

转头看一眼旁边的 Ubuntu 显示器，上面明明写着连接成功；回到 Windows 屏幕前，却始终停在加载画面。

## 为什么卡在 100%

用 SSH 连上 Ubuntu，先看一眼当前的桌面会话类型：

```bash
loginctl list-sessions
loginctl show-session <桌面会话编号> -p Type -p State
systemctl status todeskd --no-pager
```

桌面会话显示 `Type=wayland`。再去翻 `/var/log/todesk/` 下的日志，认证早就通过了（`MSG_HOST_CONN_AUTHOK`），但 `ToDesk_Session` 每隔十来秒就重启一次，反复吐出这几行：

```text
headless handle only support x11
RecaptureEvent reason: 0
session conn disconnect!!!
```

认证过了，画面采集却在 Wayland 下一直崩（更多细节见 [ToDesk 帮助中心](https://todesk.com/faq/110.html)）。

## 换用 Xfce

以前遇到 Wayland 不兼容，改一下 `/etc/gdm3/custom.conf` 里的 `WaylandEnable=false`，重启切到 “Ubuntu on Xorg” 就行。

但从 [Ubuntu 25.10 起](https://discourse.ubuntu.com/t/ubuntu-25-10-drops-support-for-gnome-on-xorg/62538)，默认桌面已经移除了 GNOME 的 Xorg 会话，机器上压根没有 `/usr/share/xsessions` 目录。单改 GDM 配置，连能进的 X11 桌面都没有。

干脆装一套原生的 X11 桌面环境 Xfce：

```bash
sudo apt install xfce4 xserver-xorg-input-libinput
```

## 进了桌面，键鼠却不动了

说起来，`xserver-xorg-input-libinput` 是我踩完坑才补上的。

第一次装 Xfce 时，我图省事加了 `--no-install-recommends`。注销 GNOME 切进 Xfce Session 后，桌面是出来了，背景一片漆黑，鼠标和键盘更是一点反应都没有。

只好从另一台电脑 SSH 进去翻 `~/.local/share/xorg/Xorg.0.log`：

```text
Adding input device PixArt Lenovo USB Optical Mouse
No input driver specified, ignoring this device.
Adding input device SEM USB Keyboard
No input driver specified, ignoring this device.
```

Xorg 认出了 USB 键鼠，但精简安装没装输入驱动。补上 `xserver-xorg-input-libinput` 重新登录，键鼠立刻活了过来，Windows 端的 ToDesk 画面也秒开了。再顺手去桌面设置里挑中 `/usr/share/backgrounds/xfce/xfce-blue.jpg`，黑屏背景也解决了。

## 消失的密码框

远程画面通了，打开 VMware 准备干活。首次启动提示需要编译 `vmmon` 和 `vmnet` 内核模块，点下安装，进度条就一直停在那里，既不往前走，也不弹密码框。

切到终端看了一眼进程，原来卡在这条命令上：

```text
pkexec /usr/bin/vmware-modconfig --console --install-all
```

编译内核模块要提权，而精简安装的 Xfce 里没有跑图形化的 Polkit 认证代理（见 [pkexec 手册](https://polkit.pages.freedesktop.org/polkit/pkexec.1.html)），密码框弹不出来，前后端就在那儿干等。

补装 `mate-polkit` 并启动代理：

```bash
sudo apt install mate-polkit
/usr/libexec/polkit-mate-authentication-agent-1 &
```

关掉卡住的 VMware 窗口重开一次，熟悉的授权密码框就跳出来了。

## 调成顺手的单任务栏与网络入口

Xfce 默认是顶栏加底栏的双面板布局，用惯了 Windows 总觉得别扭。我装了两个面板插件和一套主题图标：

```bash
sudo apt install xfce4-whiskermenu-plugin xfce4-docklike-plugin \
  greybird-gtk-theme papirus-icon-theme
```

删掉底部 Dock，把顶栏挪到底部，左边放可搜索的 [Whisker Menu](https://docs.xfce.org/panel-plugins/xfce4-whiskermenu-plugin/start) 和 [Docklike Taskbar](https://docs.xfce.org/panel-plugins/xfce4-docklike-plugin/start)，右边放系统托盘与时钟；再把 `Win` 键绑给 `xfce4-popup-whiskermenu`、`Win+E` 绑给 `thunar`、`Win+D` 绑给显示桌面，手感就顺多了。

最后想改个静态 IP，发现在 Xfce 设置里找不到有线网络。这台机器的网络归 NetworkManager 管，图形化编辑入口其实是 `nm-connection-editor`。再补装一个托盘图标包：

```bash
sudo apt install network-manager-gnome
nm-applet &
```

右下角就有了熟悉的网络图标。

## 备忘清单

下次再在 Ubuntu 26.04 上搭支持 X11 远程控制的轻量桌面，直接一条命令把这些拼图装齐就够了：

| 用途 | 软件包 |
| --- | --- |
| X11 桌面与键鼠驱动 | `xfce4`、`xserver-xorg-input-libinput` |
| 图形提权密码框 | `mate-polkit` |
| 网络配置与右下角托盘 | `nm-connection-editor`、`network-manager-gnome` |
| 开始菜单与任务栏合并 | `xfce4-whiskermenu-plugin`、`xfce4-docklike-plugin` |
| 主题与图标 | `greybird-gtk-theme`、`papirus-icon-theme` |
