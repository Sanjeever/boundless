---
title: Tinkering with Ubuntu 26.04
date: 2026-10-09
tags:
  - Ubuntu
  - Linux
  - Xfce
  - ToDesk
description: Starting from a ToDesk connection stuck at 100%, here is how I switched Ubuntu 26.04 to Xfce, restored missing input and Polkit agents, and shaped a familiar desktop layout.
outline: deep
aside: true
---

# Tinkering with Ubuntu 26.04

<!-- DESC SEP -->

Starting from a ToDesk connection stuck at 100%, here is how I switched Ubuntu 26.04 to Xfce, restored missing input and Polkit agents, and shaped a familiar desktop layout.

<!-- DESC SEP -->

All I wanted was to control a physical Ubuntu 26.04 box from Windows. Both machines had ToDesk installed, I typed in the device code, and the progress bar zipped straight to 100%—then froze.

Glancing at the monitor attached to the Ubuntu box, ToDesk said the session was connected. Back on Windows, I was still staring at a spinner.

## Why It Stalled at 100%

Over SSH, I checked the active desktop session on Ubuntu:

```bash
loginctl list-sessions
loginctl show-session <desktop-session-id> -p Type -p State
systemctl status todeskd --no-pager
```

The desktop was running `Type=wayland`. In `/var/log/todesk/`, authentication had succeeded (`MSG_HOST_CONN_AUTHOK`), but `ToDesk_Session` was crashing and restarting every sixteen seconds with the same lines:

```text
headless handle only support x11
RecaptureEvent reason: 0
session conn disconnect!!!
```

Authentication worked fine; screen capture under Wayland did not (see the [ToDesk FAQ](https://todesk.com/faq/110.html)).

## Switching to Xfce

On older Ubuntu releases, uncommenting `WaylandEnable=false` in `/etc/gdm3/custom.conf` and rebooting into “Ubuntu on Xorg” was enough.

Starting in [Ubuntu 25.10](https://discourse.ubuntu.com/t/ubuntu-25-10-drops-support-for-gnome-on-xorg/62538), however, the default desktop dropped the GNOME on Xorg session altogether—`/usr/share/xsessions` wasn’t even on the disk. Disabling Wayland in GDM without installing an X11 desktop would leave nothing to log into.

So I installed Xfce for a native X11 session:

```bash
sudo apt install xfce4 xserver-xorg-input-libinput
```

## A Desktop with Dead Input

I only learned about `xserver-xorg-input-libinput` the hard way.

On my first attempt, I installed `xfce4` with `--no-install-recommends`. When I logged into the Xfce Session, the panel appeared over a pitch-black background, and neither the mouse nor the keyboard responded.

SSHing back in and reading `~/.local/share/xorg/Xorg.0.log` explained why:

```text
Adding input device PixArt Lenovo USB Optical Mouse
No input driver specified, ignoring this device.
Adding input device SEM USB Keyboard
No input driver specified, ignoring this device.
```

Xorg saw the USB devices, but the minimal install had skipped the input driver. Installing `xserver-xorg-input-libinput` and logging back in brought the mouse, keyboard, and remote ToDesk image to life at once. Picking `/usr/share/backgrounds/xfce/xfce-blue.jpg` in Desktop Settings fixed the black wallpaper too.

## The Missing Password Dialog

Next I opened VMware, which offered to compile its `vmmon` and `vmnet` kernel modules. Clicking Install brought up a progress window that sat still forever without asking for a password.

Checking `ps` in a terminal showed where it was stuck:

```text
pkexec /usr/bin/vmware-modconfig --console --install-all
```

Building kernel modules requires root privileges, and my bare-bones Xfce session had no graphical Polkit authentication agent running to display the password prompt (see the [pkexec manual](https://polkit.pages.freedesktop.org/polkit/pkexec.1.html)).

Installing `mate-polkit` and launching the agent fixed it right away:

```bash
sudo apt install mate-polkit
/usr/libexec/polkit-mate-authentication-agent-1 &
```

Relaunching VMware immediately popped up the password dialog.

## Shaping a Single Taskbar and Network Tray

Xfce’s default top-bar-plus-bottom-dock layout felt unfamiliar coming from Windows, so I pulled in two panel plugins and a clean theme:

```bash
sudo apt install xfce4-whiskermenu-plugin xfce4-docklike-plugin \
  greybird-gtk-theme papirus-icon-theme
```

I consolidated everything into a single 40px bottom taskbar: [Whisker Menu](https://docs.xfce.org/panel-plugins/xfce4-whiskermenu-plugin/start) and [Docklike Taskbar](https://docs.xfce.org/panel-plugins/xfce4-docklike-plugin/start) on the left, system tray and clock on the right, with `Win` bound to `xfce4-popup-whiskermenu`, `Win+E` to `thunar`, and `Win+D` to Show Desktop.

Finally, to edit Ethernet settings from the GUI and keep a network icon in the system tray, I used `nm-connection-editor` and added the GNOME NetworkManager applet:

```bash
sudo apt install network-manager-gnome
nm-applet &
```

## Package Checklist

Next time I set up a remote-friendly X11 desktop on Ubuntu 26.04, I’ll install the whole bundle up front:

| Role | Packages |
| --- | --- |
| X11 desktop & input driver | `xfce4`, `xserver-xorg-input-libinput` |
| Graphical Polkit prompt | `mate-polkit` |
| Network editor & tray icon | `nm-connection-editor`, `network-manager-gnome` |
| Start menu & grouped taskbar | `xfce4-whiskermenu-plugin`, `xfce4-docklike-plugin` |
| Theme & icons | `greybird-gtk-theme`, `papirus-icon-theme` |
