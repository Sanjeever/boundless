---
title: Tinkering with Ubuntu 26.04
date: 2026-10-09
tags:
  - Ubuntu
  - Linux
  - Xfce
  - ToDesk
description: A ToDesk connection stuck at 100% led me to switch to Xfce on Ubuntu 26.04, add missing input drivers, authentication and network tools, and give the desktop a familiar Windows layout.
outline: deep
aside: true
---

# Tinkering with Ubuntu 26.04

<!-- DESC SEP -->

ToDesk on Windows was stuck at 100%, while Ubuntu said it was already connected. I switched to Xfce to get remote access working, then ran into an unresponsive mouse and keyboard, a VMware installation with no password prompt, and missing Ethernet settings. This post follows how I tracked down those problems and filled in the missing desktop components.

<!-- DESC SEP -->

All I wanted was to control a physical Ubuntu machine from Windows. ToDesk was installed on both computers, and the client was running on the target. After I entered its device code, the connection quickly reached 100% and stayed there.

On Ubuntu, the connection was already shown as successful. Back on Windows, I still had a loading screen.

The target was running Ubuntu 26.04.1 LTS with GNOME 50.1. ToDesk was version 4.9.7.0 on Linux and 4.8.9.0 on Windows. The findings and steps below apply to that setup. I also had SSH access and could log in at the physical machine when switching desktops.

## Stuck at 100%

I started by checking Ubuntu's desktop session and ToDesk service over SSH.

```bash
loginctl list-sessions
loginctl show-session <desktop-session-id> -p Type -p State
systemctl status todeskd --no-pager
```

The session ID needs to be the one for the logged-in desktop. SSH sessions also appear in the list, but inspecting one of those will not tell you which graphical session is running. On this machine, the desktop reported `Type=wayland`, and the ToDesk service was active.

Next, I checked the service logs under `/var/log/todesk/`. They already contained successful authentication records.

```text
host Authentication success
MSG_HOST_CONN_AUTHOK
```

Authentication had finished by the time the progress indicator reached 100%. The problem was in the video session that followed. Ubuntu's `ToDesk_Session` process restarted roughly every 16 seconds, and the logs kept repeating these messages.

```text
headless handle only support x11
RecaptureEvent reason: 0
session conn disconnect!!!
```

The video session never settled into a working state, leaving Windows waiting for a desktop image. That pointed the investigation toward compatibility between Wayland and the screen capture method used by this version of ToDesk.

[ToDesk's Linux troubleshooting guide](https://todesk.com/faq/110.html) requires an X11 desktop on the remote machine. Switching to an X11 session in Xfce later restored the connection, which supported that diagnosis.

## Switching desktops

Many guides suggest editing `/etc/gdm3/custom.conf`, uncommenting the following line, and rebooting.

```ini
WaylandEnable=false
```

I considered that approach, but the machine had no `/usr/share/xsessions` directory. It only offered the Ubuntu Wayland session. The old “Ubuntu on Xorg” option was missing from the login screen too.

[Ubuntu's announcement](https://discourse.ubuntu.com/t/ubuntu-25-10-drops-support-for-gnome-on-xorg/62538) explains the change. Since 25.10, the default Ubuntu desktop no longer provides a GNOME session on Xorg. Users who need X11 can install another desktop environment that supports it.

Disabling Wayland restricts which sessions the display manager can use. It does not restore the removed GNOME Xorg session. Editing the setting and rebooting this machine would still leave it without an X11 desktop to log into.

The names can be easy to mix up. GNOME and Xfce are desktop environments, including window management, panels, and settings tools. X11 and Wayland are protocols used by the graphical system. Although Xwayland was running, its job was to let X11 applications run within the Wayland desktop. The desktop session itself was still Wayland.

I chose to install Xfce and select it at the login screen. It provides an X11 session, with an entry at `/usr/share/xsessions/xfce.desktop` after installation.

```bash
sudo apt install xfce4 xserver-xorg-input-libinput
```

This command includes the input driver I only discovered I needed later. My first installation was more minimal.

## A desktop without working input

For the first installation, I used `--no-install-recommends`, installing Xfce and its required dependencies. Xorg was already present, and I had confirmed that the Xfce session entry existed. I logged out of GNOME and chose “Xfce Session” at the login screen.

The desktop appeared, but the mouse and keyboard did nothing. The background was black as well.

Checking over SSH showed that the session was now `Type=x11`. The `xfce4-session`, `xfwm4`, `xfce4-panel`, and `xfdesktop` processes were all running. The cause finally showed up in `~/.local/share/xorg/Xorg.0.log`.

```text
Adding input device PixArt Lenovo USB Optical Mouse
No input driver specified, ignoring this device.
Adding input device SEM USB Keyboard
No input driver specified, ignoring this device.
```

Xorg had detected the USB mouse and keyboard but had no suitable input driver to use. The `xserver-xorg-input-libinput` package was indeed missing.

I installed it, then logged out and back into Xfce so that the new Xorg session would load the driver.

```bash
sudo apt install xserver-xorg-input-libinput
```

The mouse and keyboard started working. Connecting again through ToDesk on Windows finally brought up the desktop image too. Running the following command in a terminal on the target's graphical desktop returned `x11`.

```bash
echo "$XDG_SESSION_TYPE"
```

The black background had a separate cause. The default wallpaper path built into Xfce did not exist on this machine, and no other image had been selected. The installed package did provide `/usr/share/backgrounds/xfce/xfce-blue.jpg`. Selecting it in Desktop Settings restored the background.

The components left out of the minimal installation had to be added individually. Checking that the desktop processes could start had not been enough to confirm that the physical input devices worked.

## VMware gets stuck too

With remote access working, I opened VMware. It asked to install kernel modules. After I clicked Install, the window said it was compiling `vmmon` and `vmnet`, but it made no progress and never displayed a password prompt.

I left the window open and inspected the processes. No compiler was running. The operation was waiting at this command.

```text
pkexec /usr/bin/vmware-modconfig --console --install-all
```

VMware needs the `vmmon` and `vmnet` kernel modules, and installing them requires administrator privileges. `pkexec` was waiting for authentication. Compilation had not started.

GNOME had provided a graphical authentication agent in the original session, but the new Xfce installation had no equivalent agent running. [Polkit's documentation](https://polkit.pages.freedesktop.org/polkit/pkexec.1.html) explains that `pkexec` registers its own text-based agent when no authentication agent is available. This installation, launched from the VMware window, never presented that password prompt to me properly.

The fix was to install `mate-polkit`.

```bash
sudo apt install mate-polkit
```

It works in Xfce without switching to the MATE desktop. This version of the package includes `/etc/xdg/autostart/polkit-mate-authentication-agent-1.desktop`, which applies to Xfce logins. There is no need to duplicate that autostart entry.

To enable it immediately, the agent can be started from a terminal in the current desktop session as the ordinary logged-in user.

```bash
/usr/libexec/polkit-mate-authentication-agent-1 &
```

Working over SSH exposed another detail. Starting the agent with `runuser` from root's SSH session changed the process user, but it still belonged to the wrong login session. Registration failed with `User of caller and user of subject differs`. Starting it through the ordinary user's systemd user manager got the agent running successfully.

Once the agent is running, close the original installation window that is still waiting and start the installation again so it can use the new graphical authentication agent. This fixes the authentication step. Whether the modules compile and load successfully still needs to be checked from the actual results. A running authentication agent alone does not establish that VMware is fully working.

## Making the desktop familiar

Xfce's default layout has a panel at the top and a launcher panel at the bottom. I am used to Windows, so I kept having to look around for things. The default icons and the earlier black background also made the desktop feel dated.

I changed the layout to a single bottom taskbar. The Start menu and common applications sit on the left, with the system tray, volume, time, and date on the right. The taskbar is 40 pixels high, spans the screen, and stays visible.

For the Start menu, I used [Whisker Menu](https://docs.xfce.org/panel-plugins/xfce4-whiskermenu-plugin/start), which offers application search and favorites. For application icons, I used [Docklike Taskbar](https://docs.xfce.org/panel-plugins/xfce4-docklike-plugin/start). It groups windows from the same application under one icon and lets me pin the browser, file manager, terminal, and ToDesk.

```bash
sudo apt install xfce4-whiskermenu-plugin xfce4-docklike-plugin \
  greybird-gtk-theme papirus-icon-theme
```

Right-click the panel and open Panel Preferences to adjust its position, size, and items. After adding Whisker Menu and Docklike, the original Applications Menu, Window Buttons, and bottom launcher panel can be removed, leaving a single bottom panel.

I chose the light Greybird theme for windows and controls, Papirus for icons, a dark taskbar, and the blue wallpaper I had found earlier. Fonts stayed around 10 points with antialiasing enabled. The minimize, maximize, and close buttons went in the upper-right corner.

I also set up familiar keyboard shortcuts. `Win` opens the Start menu using `xfce4-popup-whiskermenu`, and `Win+E` opens the file manager using `thunar`. Both can be added under Application Shortcuts in Keyboard settings. `Win+D` is assigned to Show Desktop in the Window Manager's keyboard settings.

Most changes took effect immediately. Replacing the panel plugins required reloading the panel, but I did not log out of the desktop. VMware was still open during the work. After confirming that it was waiting for authentication, I closed that installation attempt and finished configuring the panel.

## Finding the network settings

With the desktop looking better, I wanted to configure the Ethernet IP address through a graphical interface. I could not find an entry in Xfce's Settings Manager.

Xfce's Settings Manager mainly handles the desktop itself. It can be opened from the Start menu or with `xfce4-settings-manager`. NetworkManager was already managing Ethernet on this machine, and editing its connections required a separate application.

```bash
nm-connection-editor
```

The tool was already installed. It appears in the Start menu as “Advanced Network Configuration”. Select the active Ethernet connection, open its IPv4 Settings, and choose “Manual” to edit the IP address, subnet mask, gateway, and DNS servers.

I also installed the network tray applet to keep an entry point in the lower-right corner of the taskbar.

```bash
sudo apt install network-manager-gnome
```

On Ubuntu 26.04, this package pulls in the component that provides `nm-applet`. It includes an autostart entry that applies to Xfce. Running `nm-applet &` in the ordinary user's desktop terminal shows the network icon immediately. The panel needs a system tray item, which I placed to the left of the volume icon.

Ubuntu's original GNOME Settings application was still installed. It can be opened with the following command, though some pages depend on GNOME desktop services. Xfce's own tools remain appropriate for configuring displays and shortcuts in the current desktop.

```bash
env XDG_CURRENT_DESKTOP=GNOME gnome-control-center
```

Network changes need a little care. Reconnecting an interface after saving new settings can interrupt SSH and ToDesk, especially when changing the IP address currently in use. I only added the graphical tools and left the existing address unchanged.

At this point, remote access worked, the physical mouse and keyboard were usable, and administrator authentication and network configuration both had graphical entry points. For another installation like this, I would have the following packages ready.

| Purpose | Packages |
| --- | --- |
| X11 desktop and input driver | `xfce4`, `xserver-xorg-input-libinput` |
| Graphical authentication agent | `mate-polkit` |
| Network connection editor and tray applet | `nm-connection-editor`, `network-manager-gnome` |
| Start menu and application taskbar | `xfce4-whiskermenu-plugin`, `xfce4-docklike-plugin` |
| Window theme and icons | `greybird-gtk-theme`, `papirus-icon-theme` |

I started out wanting a remote connection window to show a desktop image. By the end, I had become familiar with the components behind several everyday desktop tasks. A lightweight desktop gives me room to arrange things as I like, but it also leaves me responsible for checking that the tools I took for granted are all there.
