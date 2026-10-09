---
title: Ubuntu 26.04 桌面折腾记
date: 2026-10-09
tags:
  - Ubuntu
  - Linux
  - Xfce
  - ToDesk
description: 从 ToDesk 卡在 100% 开始，我在 Ubuntu 26.04 上换用 Xfce，补齐输入驱动、图形授权和网络管理组件，再把桌面调成自己习惯的 Windows 风格。
outline: deep
aside: true
---

# Ubuntu 26.04 桌面折腾记

<!-- DESC SEP -->

Windows 上的 ToDesk 卡在 100%，Ubuntu 却显示已经连接。为了让远程桌面正常工作，我换用了 Xfce，随后又遇到鼠标键盘失灵、VMware 安装没有密码提示、找不到有线网络设置。这篇记录这些问题是怎么查出来的，以及最后补上了哪些组件。

<!-- DESC SEP -->

我原本只是想从 Windows 远程操作一台 Ubuntu 实体机。两边都安装了 ToDesk，目标机也已经启动客户端，输入设备码后，连接进度很快走到 100%，然后就停在那里。

到 Ubuntu 上看，它已经显示连接成功。回到 Windows，还是加载画面。

这台机器使用 Ubuntu 26.04.1 LTS 和 GNOME 50.1，Linux 端 ToDesk 为 4.9.7.0，Windows 端为 4.8.9.0。下面的判断和操作都围绕这套环境展开。我手里还有 SSH 和实体机的登录入口，切换桌面时可以在本地操作。

## 卡在 100%

我先通过 SSH 查看 Ubuntu 的桌面会话和 ToDesk 服务。

```bash
loginctl list-sessions
loginctl show-session <桌面会话编号> -p Type -p State
systemctl status todeskd --no-pager
```

要检查的是登录桌面的那条会话。SSH 登录也会出现在列表里，查看它得不到当前图形桌面的类型。这台机器的桌面会话显示 `Type=wayland`，ToDesk 服务则处于运行状态。

接着查看 `/var/log/todesk/` 下的服务日志，已经能找到认证成功的记录。

```text
host Authentication success
MSG_HOST_CONN_AUTHOK
```

这说明进度条走到 100% 时，认证确实已经完成。问题发生在后面的视频会话阶段。Ubuntu 上的 `ToDesk_Session` 进程大约每隔 16 秒重新启动一次，日志里反复出现几条记录。

```text
headless handle only support x11
RecaptureEvent reason: 0
session conn disconnect!!!
```

视频会话始终没有稳定下来，Windows 也就迟迟拿不到桌面画面。这些现象把排查方向指向了 Wayland 与当前 ToDesk 屏幕采集方式的兼容性。

[ToDesk 的 Linux 故障说明](https://todesk.com/faq/110.html)要求被控端使用 X11 桌面。后来切到 Xfce 的 X11 会话后，远程连接恢复正常，也印证了这次排查的方向。

## 换一个桌面

不少教程会让人修改 `/etc/gdm3/custom.conf`，取消下面这一行的注释，然后重启。

```ini
WaylandEnable=false
```

我也考虑过这个办法，但查看系统后发现，目标机没有 `/usr/share/xsessions`，只有 Wayland 的 Ubuntu 会话。登录界面自然也没有旧教程里的 “Ubuntu on Xorg”。

[Ubuntu 官方说明](https://discourse.ubuntu.com/t/ubuntu-25-10-drops-support-for-gnome-on-xorg/62538)已经交代了这项变化。从 25.10 起，默认 Ubuntu 桌面不再提供 GNOME 的 Xorg 会话。需要 X11 时，可以安装其他支持它的桌面环境。

禁用 Wayland 只是限制登录管理器使用哪一种会话，并不会恢复已经移除的 GNOME Xorg 会话。对这台机器直接改配置并重启，也没有现成的 X11 桌面可供登录。

这里几个名字容易混在一起。GNOME 和 Xfce 是桌面环境，包含窗口管理、面板和设置工具。X11 和 Wayland 则是图形系统使用的协议。系统里虽然运行着 Xwayland，但它主要用于在 Wayland 桌面上运行 X11 应用，当前桌面会话仍然是 Wayland。

我最后选择安装 Xfce，再从登录界面切过去。它能提供 X11 会话，安装后会出现 `/usr/share/xsessions/xfce.desktop`。

```bash
sudo apt install xfce4 xserver-xorg-input-libinput
```

这条命令已经包含后面踩坑才补上的输入驱动。第一次安装时，我实际采用了更精简的方式。

## 能登录，却不能操作

第一次安装用了 `--no-install-recommends`，只安装 Xfce 及其必需依赖。原有系统已经有 Xorg，检查时也确认了 Xfce 的会话入口，于是注销 GNOME，在登录界面选择 “Xfce Session”。

桌面出来了，鼠标键盘却没有反应，背景也是黑的。

通过 SSH 检查，当前会话已经是 `Type=x11`，`xfce4-session`、`xfwm4`、`xfce4-panel` 和 `xfdesktop` 都在运行。继续查看 `~/.local/share/xorg/Xorg.0.log`，终于找到了原因。

```text
Adding input device PixArt Lenovo USB Optical Mouse
No input driver specified, ignoring this device.
Adding input device SEM USB Keyboard
No input driver specified, ignoring this device.
```

Xorg 已经发现了 USB 鼠标和键盘，却没有相应的输入驱动可以使用。系统也确实没有安装 `xserver-xorg-input-libinput`。

我补装这个包，再注销并重新登录 Xfce，让新的 Xorg 会话加载驱动。

```bash
sudo apt install xserver-xorg-input-libinput
```

鼠标键盘随即恢复。再次用 Windows 上的 ToDesk 连接，桌面画面也正常出现了。在目标机的图形终端执行下面的命令，输出为 `x11`。

```bash
echo "$XDG_SESSION_TYPE"
```

黑色背景是另一个问题。Xfce 程序里内置的默认壁纸路径在这台机器上不存在，当前又没有指定其他图片。安装包实际提供了 `/usr/share/backgrounds/xfce/xfce-blue.jpg`，在桌面设置里选上它，背景就恢复了。

这次最小安装省下的组件，需要逐个找回来。只确认桌面进程能启动，还不足以说明实体机上的输入设备也能正常工作。

## VMware 又卡住了

远程连接解决后，我打开 VMware。它提示需要安装内核模块，点击安装，窗口显示正在编译 `vmmon` 和 `vmnet`，却一直没有进展，也没有弹出密码框。

我先保留这个窗口，检查进程。没有实际运行的编译进程，操作停在了这一条命令上。

```text
pkexec /usr/bin/vmware-modconfig --console --install-all
```

`vmmon` 和 `vmnet` 是 VMware 需要的内核模块，安装它们需要管理员权限。`pkexec` 正在等待认证，编译还没有开始。

GNOME 会话原本提供了图形授权入口，这次装的 Xfce 环境却没有补上对应的代理。[Polkit 的说明](https://polkit.pages.freedesktop.org/polkit/pkexec.1.html)指出，找不到认证代理时，`pkexec` 会注册自己的文本认证代理。从 VMware 窗口启动的这次安装，没有把密码提示正常展示给我。

解决办法是安装 `mate-polkit`。

```bash
sudo apt install mate-polkit
```

它可以用于 Xfce，并不要求切换到 MATE 桌面。这个版本的安装包自带 `/etc/xdg/autostart/polkit-mate-authentication-agent-1.desktop`，适用于 Xfce 登录自动启动，不需要再复制一份相同的启动项。

如果想立即启用，可以在当前桌面的普通用户终端里运行代理。

```bash
/usr/libexec/polkit-mate-authentication-agent-1 &
```

我这次通过 SSH 操作，还遇到了一个细节。直接从 root 的 SSH 会话用 `runuser` 启动代理，虽然进程用户换了，所在的登录会话仍然不对，注册时报出 `User of caller and user of subject differs`。最后通过普通用户的 systemd 用户管理器启动，代理才正常运行。

补上代理后，关闭原来等待中的安装窗口，再重新发起安装，才会使用新的图形授权入口。这一步解决的是认证问题，后续模块能否编译、加载，还需要看实际结果，不能只凭授权代理已启动就认定 VMware 已经修好。

## 把桌面调顺手

Xfce 默认在顶部放一条面板，底部再放一条启动栏。我习惯 Windows，这种布局用起来总要找一找。默认图标和之前的黑色背景凑在一起，也显得有些老旧。

我把桌面改成了底部单任务栏。左边放开始菜单和常用应用，右边放系统托盘、音量、时间和日期。任务栏高度设为 40 像素，占满屏幕宽度，始终显示。

开始菜单使用 [Whisker Menu](https://docs.xfce.org/panel-plugins/xfce4-whiskermenu-plugin/start)，可以搜索应用，也可以收藏常用程序。任务栏使用 [Docklike Taskbar](https://docs.xfce.org/panel-plugins/xfce4-docklike-plugin/start)，把同一个应用的窗口归到一个图标下，并固定浏览器、文件管理器、终端和 ToDesk。

```bash
sudo apt install xfce4-whiskermenu-plugin xfce4-docklike-plugin \
  greybird-gtk-theme papirus-icon-theme
```

面板上右键进入“面板首选项”，就能调整位置、尺寸和项目。添加 Whisker Menu 和 Docklike 后，可以移除原来的应用菜单、窗口按钮和底部启动栏，留下一个完整的底部面板。

窗口和控件使用 Greybird 浅色主题，图标使用 Papirus，任务栏设为深色，壁纸选用刚才找到的蓝色图片。字体保持 10 磅左右，开启抗锯齿，窗口的最小化、最大化和关闭按钮放在右上角。

我还配置了几个熟悉的快捷键。`Win` 打开开始菜单，对应命令是 `xfce4-popup-whiskermenu`。`Win+E` 打开文件管理器，对应 `thunar`。这两项可以在键盘设置的应用程序快捷键中添加。`Win+D` 则在窗口管理器的键盘设置里绑定“显示桌面”。

大部分调整都能直接生效。替换面板插件时，我重新加载了面板，没有注销整个桌面。操作时 VMware 还开着，我先确认它停在认证阶段，再关闭那次等待中的安装，继续完成配置。

## 找回网络设置

桌面调好后，我想图形化设置有线网络 IP，却在 Xfce 的设置管理器里找不到入口。

Xfce 的设置管理器主要负责桌面本身，可以通过开始菜单打开，也可以执行 `xfce4-settings-manager`。这台机器的有线网络已经由 NetworkManager 管理，网络连接的编辑入口是另一个程序。

```bash
nm-connection-editor
```

目标机已经装了这个工具，开始菜单里可以搜索 “Advanced Network Configuration”。打开后选择当前有线连接，在 IPv4 设置中选择“手动”，就能编辑 IP、子网掩码、网关和 DNS。

我又补装了网络托盘组件，让网络入口留在任务栏右下角。

```bash
sudo apt install network-manager-gnome
```

Ubuntu 26.04 中，这个包会带上提供 `nm-applet` 的组件。安装包自带适用于 Xfce 的登录自动启动项。在当前普通用户的桌面终端执行 `nm-applet &`，就可以立即显示网络图标。面板需要保留系统托盘，我把它放在音量图标左边。

至于原来 Ubuntu 的 GNOME 设置，它仍然安装在系统里。需要时可以这样打开，但部分页面依赖 GNOME 桌面服务，当前桌面的显示器和快捷键仍然适合用 Xfce 工具配置。

```bash
env XDG_CURRENT_DESKTOP=GNOME gnome-control-center
```

网络配置需要多留意一步。保存新的连接设置后，重新连接网卡可能会中断 SSH 和 ToDesk，尤其是修改当前使用的 IP 时。我这次只补上图形入口，没有改变现有地址。

折腾到这里，这台机器终于能正常远程连接，实体鼠标键盘也可用，管理员授权和网络配置都有了图形入口。以后再搭同样的环境，我会把下面这些组件一起准备好。

| 用途 | 软件包 |
| --- | --- |
| X11 桌面和输入驱动 | `xfce4`、`xserver-xorg-input-libinput` |
| 图形授权代理 | `mate-polkit` |
| 网络连接编辑器和托盘 | `nm-connection-editor`、`network-manager-gnome` |
| 开始菜单和应用任务栏 | `xfce4-whiskermenu-plugin`、`xfce4-docklike-plugin` |
| 窗口主题和图标 | `greybird-gtk-theme`、`papirus-icon-theme` |

我最初只想让一个远程连接窗口显示画面，最后却把日常操作会用到的桌面组件重新认识了一遍。轻量桌面的好处是可以按自己的习惯组合，代价是这些原本不需要留意的入口，也要自己确认齐全。
