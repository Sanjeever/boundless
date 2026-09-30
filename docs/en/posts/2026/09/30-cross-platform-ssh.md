---
title: SSH Setup Across Systems
date: 2026-09-30
tags:
  - SSH
  - Windows
  - macOS
  - Linux
description: A practical reference for SSH between Windows, macOS, Ubuntu, and Debian, covering server setup, administrator and root access, public keys, and connection troubleshooting.
outline: deep
aside: true
---

# SSH Setup Across Systems

<!-- DESC SEP -->

Each time I connect machines running Windows, macOS, Ubuntu, or Debian, I end up checking the same things again: how to start the SSH server, whether an administrator or root can log in, and where to put the public key. This guide puts the nine connection directions into one workflow, with a place to start when a connection fails.

<!-- DESC SEP -->

Usually I have two machines in front of me and just want one to connect to the other. The part I am most likely to mix up is the direction: if A initiates the connection, A's public key goes on B. To connect from B to A later, A needs a running server and B needs a key.

This guide uses the OpenSSH supplied with Windows 10/11 or Windows Server 2019 and later, macOS, Ubuntu, and Debian. The examples use local accounts and the default port 22. Domain accounts, WSL, third-party SSH servers, and ways to expose a machine through the internet are outside its scope. Replace `192.168.1.20`, the usernames, and the sample public keys with your own values. You need access to a local terminal or management console on the target machine before starting.

## Identify the client and the target

| Machine                           | What it needs                                                                                            |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| The one initiating the connection | An `ssh` client, a private key kept on that machine, and a command to connect.                           |
| The one receiving the connection  | A running `sshd`, an account allowed to log in, and the client's public key authorized for that account. |

The nine combinations are three client systems times three target systems. The connection command barely changes; most differences are on the target. To connect in both directions, configure each machine as a target in turn. Keep the private key on the machine that initiates the connection. Do not copy it to the target.

First, make sure the client can reach the target over the network. On a local network, use the target's private IP address. Across networks, you need a VPN, a reachable public address, or appropriate network forwarding. SSH configuration cannot make an unreachable address reachable.

To find a local address, run `ipconfig` on a Windows target or `hostname -I` on Ubuntu/Debian. On a Mac, check the active connection under System Settings → Network. If several addresses appear, use one the client can actually reach.

## Start the SSH server on the target

### Windows

Open an **elevated PowerShell on the target Windows machine** and check its OpenSSH components:

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
```

If `OpenSSH.Server~~~~0.0.1.0` is `NotPresent`, install it. Skip this command if it is already `Installed`:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0
```

Start the service and make it start automatically:

```powershell
Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
Get-Service sshd
```

Installation normally creates an inbound firewall rule named `OpenSSH-Server-In-TCP`. Check that it exists and is enabled:

```powershell
Get-NetFirewallRule -Name OpenSSH-Server-In-TCP
```

If the rule is missing, create one for TCP port 22. If it exists but is disabled, enable it:

```powershell
New-NetFirewallRule -Name OpenSSH-Server-In-TCP -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

```powershell
Enable-NetFirewallRule -Name OpenSSH-Server-In-TCP
```

Run only the command that matches the result of your check. The server configuration lives at `C:\ProgramData\ssh\sshd_config`; changes require a restart of `sshd`. Windows has no Unix-style `root` account, and `PermitRootLogin` does not apply. Use an existing Windows administrator account when you need elevated access. Microsoft's [installation guide](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse) and [server configuration guide](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh-server-configuration) document these defaults.

### macOS

On the target Mac, open System Settings → General → Sharing → Remote Login and turn it on. In its detailed settings, select “Only these users” and add the account you intend to use. The panel also shows an SSH command for reaching the Mac. Enable “Allow full disk access for remote users” only if the remote task needs access to files protected by macOS privacy controls. See [Apple's Remote Login guide](https://support.apple.com/guide/mac-help/allow-a-remote-computer-to-access-your-mac-mchlp1066/mac).

I normally log in with my regular or administrator account and use `sudo` for administrative commands. The Mac root account is disabled by default; direct root login is covered below.

### Ubuntu and Debian

On the **target Linux machine**, install the server and check that the service is running:

```bash
sudo apt update
sudo apt install openssh-server
sudo systemctl enable --now ssh
sudo systemctl status ssh --no-pager
```

If UFW is enabled, allow SSH through it. If UFW is not installed or enabled, check the firewall you actually use and any cloud inbound rules:

```bash
sudo ufw status
sudo ufw allow OpenSSH
```

Run the second command only when UFW is enabled and SSH is not already allowed. The main server configuration is `/etc/ssh/sshd_config`, which may include files under `/etc/ssh/sshd_config.d/`. On Ubuntu in particular, those files are usually loaded before the rest of the main file. Later, `sshd -T` will show the effective setting. See the [Ubuntu OpenSSH guide](https://ubuntu.com/server/docs/how-to/security/openssh-server/) and [Debian Reference](https://www.debian.org/doc/manuals/debian-reference/ch06.en.html).

## Make the first connection from the client

On macOS, `ssh` is normally available in Terminal. On Windows, run `ssh -V` in PowerShell. If the client is missing, install it from an elevated PowerShell:

```powershell
Add-WindowsCapability -Online -Name OpenSSH.Client~~~~0.0.1.0
```

On Ubuntu or Debian, install the client if the `ssh` command is missing:

```bash
sudo apt install openssh-client
```

Now run this on the **machine initiating the connection**. Here `alice` is an account on the target, and the IP address belongs to the target:

```bash
ssh alice@192.168.1.20
```

The first connection shows the target's host-key fingerprint. It identifies the machine you are connecting to; it is separate from the user key you will generate next. You can compare it with the corresponding host public key on the target itself. If the prompt shows ED25519, run the Windows command or the macOS/Linux command, respectively:

```powershell
ssh-keygen -lf "$env:ProgramData\ssh\ssh_host_ed25519_key.pub"
```

```bash
ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub
```

Accept the host key only after the fingerprints match, then enter the target account's password. If this first connection times out or is refused, check the service, address, and firewall before working on user keys.

## Generate a key on each client

Run this on the **machine initiating the connection**. The command is the same on all three systems:

```bash
ssh-keygen -t ed25519 -C "my-laptop"
```

With the default filename, Windows normally saves the private key at `C:\Users\<username>\.ssh\id_ed25519`; macOS/Linux use `~/.ssh/id_ed25519`. The file ending in `.pub` is the public key. If the default private-key file already exists, find out whether you use it before overwriting it. Each client can have its own key pair, with every public key added to the target.

You can protect the private key with a passphrase. Here, “passwordless login” means the target account no longer asks for its password. The client may still ask for the private-key passphrase. To avoid entering it repeatedly, load the key into `ssh-agent`. The [Ubuntu key guide](https://ubuntu.com/server/docs/how-to/security/openssh-server/) also recommends Ed25519.

On a Windows client, first start the `ssh-agent` service from an elevated PowerShell:

```powershell
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
```

Then return to a normal PowerShell under the account you use day to day and add its private key:

```powershell
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"
```

On a macOS or Linux client, run:

```bash
ssh-add ~/.ssh/id_ed25519
```

If Linux reports that it cannot contact an agent, run `eval "$(ssh-agent -s)"` in the current terminal and then run `ssh-add` again. That starts an agent for this shell; there is no need to remove the key's passphrase. Microsoft's [Windows key guide](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement) and the [OpenSSH `ssh-add` manual](https://man.openbsd.org/ssh-add.1) cover the commands.

Print the public key and copy its **entire single line**. On Windows PowerShell:

```powershell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

On macOS and Linux:

```bash
cat ~/.ssh/id_ed25519.pub
```

Never paste the private key, the file without `.pub`, onto the target or into a blog post, chat, or repository.

## Install the public key for the target account

Run the following commands **locally on the target**. Replace `ssh-ed25519 AAAA... my-laptop` with the **full line** printed above. Append additional public keys as separate lines; do not overwrite existing ones.

### The target is macOS, Ubuntu, or Debian

Open a terminal as the regular account you intend to log in to, then run:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

Here `~` must be the **target account's home directory**. Running the commands as a different account will authorize the wrong account. If a Linux client already has `ssh-copy-id`, it can instead run `ssh-copy-id -i ~/.ssh/id_ed25519.pub alice@192.168.1.20`. The manual method works from any of the three client systems.

### The target is a standard Windows account

Open PowerShell **as the Windows account you intend to log in to**, then run:

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$dir = Join-Path $env:USERPROFILE '.ssh'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content -LiteralPath (Join-Path $dir 'authorized_keys') -Value $key -Encoding ascii
```

A standard account's key file is in its profile, for example `C:\Users\alice\.ssh\authorized_keys`. Use that account's PowerShell session: `$env:USERPROFILE` points to whoever is running it.

### The target is a Windows administrator account

By default, an account in the local Administrators group uses the shared file `C:\ProgramData\ssh\administrators_authorized_keys`, rather than `authorized_keys` in its own profile. Run this from an **elevated PowerShell on the target Windows machine**:

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$path = Join-Path $env:ProgramData 'ssh\administrators_authorized_keys'
Add-Content -LiteralPath $path -Value $key -Encoding ascii
icacls.exe $path /inheritance:r /grant '*S-1-5-32-544:F' /grant 'SYSTEM:F'
icacls.exe $path
```

`S-1-5-32-544` identifies the built-in Administrators group, regardless of the display language. Inspect the last command's output: only Administrators and SYSTEM should have access to this file. Remove any other explicit permissions left from an earlier setup. Because administrator accounts use the same file by default, a key added there is available to those accounts. Microsoft's [key management guide](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement) explains the special location and ACL.

Open a new terminal on the client and connect again. If you have several private keys, specify this one:

```powershell
ssh -i "$env:USERPROFILE\.ssh\id_ed25519" alice@192.168.1.20
```

```bash
ssh -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

Use the first command in Windows PowerShell and the second on macOS/Linux. You should no longer be asked for the target account's password.

## When direct root login is required

Direct root login needs three things: the target's SSH server must allow root, root must have the client's public key, and the client must have the matching private key. For routine work, I log in under my own account and use `sudo`. If direct root login is necessary, use public-key authentication.

### Root on Ubuntu and Debian

Ubuntu disables root password login by default, but that does not necessarily prevent public-key login. The account state and effective SSH configuration decide whether it works. [Ubuntu's user-management guide](https://ubuntu.com/server/docs/how-to/security/user-management/) distinguishes a locked password from SSH public-key authentication. Debian/OpenSSH commonly defaults `PermitRootLogin` to `prohibit-password`, which permits keys for root but rejects its password. Check the current machine rather than assuming its defaults. See the [Debian manual](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html).

Check the target Linux machine first:

```bash
sudo sshd -T | grep '^permitrootlogin '
```

If it says `prohibit-password`, no change is needed for key-based root login. If it says `no`, set this in the configuration that actually takes effect:

```text
PermitRootLogin prohibit-password
```

Add the client's public key to **root's own** authorized-keys file, not the regular account's file:

```bash
sudo install -d -m 700 /root/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' | sudo tee -a /root/.ssh/authorized_keys > /dev/null
sudo chmod 600 /root/.ssh/authorized_keys
```

If you changed the SSH configuration, validate it before restarting the service, then check the effective value again:

```bash
sudo sshd -t
sudo systemctl restart ssh
sudo sshd -T | grep '^permitrootlogin '
```

Finally, test `ssh root@192.168.1.20` from the client. You do not need to set a remotely guessable root password just to use a public key.

### Root on macOS

Apple disables the Mac root account by default and recommends an administrator account with `sudo`. If direct root access is necessary, open Directory Utility on the target Mac, unlock it, then choose Edit → Enable Root User and set a root password. You can disable the account there when the task is done. See [Apple's root-account guide](https://support.apple.com/en-us/102367).

Next, make sure Remote Login permits root. If it is restricted to “Only these users,” add root to the allowed list. If root cannot be selected in the interface, run this in an administrator terminal on the target Mac:

```bash
sudo dseditgroup -o edit -a root -t user com.apple.access_ssh
sudo dseditgroup -o checkmember -m root com.apple.access_ssh
```

Add the client's public key to root's home directory, normally `/var/root` on a Mac:

```bash
sudo install -d -m 700 -o root -g wheel /var/root/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' | sudo tee -a /var/root/.ssh/authorized_keys > /dev/null
sudo chown root:wheel /var/root/.ssh/authorized_keys
sudo chmod 600 /var/root/.ssh/authorized_keys
sudo sshd -T | grep '^permitrootlogin '
```

If the effective value is `no`, set `PermitRootLogin prohibit-password` in the configuration that takes effect. Check it with `sudo sshd -t`, turn Remote Login off and on again, then test `ssh root@target-address` from another machine. Both the Remote Login allowlist and `sshd` configuration can block root. When direct access is no longer needed, remove the membership you added with `sudo dseditgroup -o edit -d root -t user com.apple.access_ssh` and disable root in Directory Utility.

## Verify keys before disabling password authentication

Keep the working session open and test from a **second terminal**. Force the client to try only public-key authentication, so a fallback to the account password cannot make a failed key setup look successful:

```bash
ssh -o PreferredAuthentications=publickey -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

In Windows PowerShell, replace the path after `-i` with `"$env:USERPROFILE\.ssh\id_ed25519"`. An `Enter passphrase for key` prompt asks for the **local private-key passphrase**. If the server rejects the key, this command fails rather than falling back to a password. If an ordinary `ssh` attempt falls back to `alice@... password:`, public-key login has not succeeded.

Only after a fresh session works should you consider disabling account-password login on the target. On macOS and Linux, set these values in the effective SSH server configuration:

```text
PasswordAuthentication no
KbdInteractiveAuthentication no
```

The OpenSSH version bundled with Windows does not support `KbdInteractiveAuthentication`; set only `PasswordAuthentication no` there. Put the Windows setting before any `Match` block in `C:\ProgramData\ssh\sshd_config`. On Ubuntu/Debian, account for the order of included configuration files.

On Linux, run `sudo sshd -t` before `sudo systemctl restart ssh`. On a Mac, run `sudo sshd -t`, then turn Remote Login off and back on in System Settings. On Windows, run `sshd.exe -t` and `Restart-Service sshd` in an elevated PowerShell. After any change, test another new connection before closing the old one. Microsoft's [supported configuration options](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh-server-configuration) and the [Ubuntu configuration guide](https://ubuntu.com/server/docs/how-to/security/openssh-server/) provide the details.

## Look up any of the nine directions

In this table, `WIN_IP`, `MAC_IP`, and `LINUX_IP` are target addresses. `win_user`, `mac_user`, and `linux_user` are **accounts on the target**. Each column uses the same connection syntax: configure that target first, then generate a key on the client named in the row and install its public key.

| Client system   | Connect to Windows    | Connect to macOS      | Connect to Ubuntu / Debian |
| --------------- | --------------------- | --------------------- | -------------------------- |
| Windows         | `ssh win_user@WIN_IP` | `ssh mac_user@MAC_IP` | `ssh linux_user@LINUX_IP`  |
| macOS           | `ssh win_user@WIN_IP` | `ssh mac_user@MAC_IP` | `ssh linux_user@LINUX_IP`  |
| Ubuntu / Debian | `ssh win_user@WIN_IP` | `ssh mac_user@MAC_IP` | `ssh linux_user@LINUX_IP`  |

For example, to connect from Linux to a Windows administrator account, generate a key on Linux, start `sshd` on Windows, put the Linux public key in the target's `administrators_authorized_keys`, then run `ssh administrator-name@WIN_IP` on Linux. In the opposite direction, to connect from Windows to Linux as root, generate the key on Windows, start the Linux SSH server, add the Windows public key to `/root/.ssh/authorized_keys`, check `PermitRootLogin`, and run `ssh root@LINUX_IP` on Windows.

## Where to look when a connection fails

- **`Connection timed out`**: Check the IP address, VPN or route, whether the target is awake, and local or cloud firewall rules. A Mac may also be asleep.
- **`Connection refused`**: The address is reachable, but nothing is accepting connections on port 22. Check `Get-Service sshd` on Windows, `systemctl status ssh` on Linux, or the Remote Login switch on a Mac.
- **The target still asks for its password, or you see `Permission denied (publickey)`**: Add `-vvv` on the client to see which key it offered. On the target, check that the public key is complete and in the right account's file. For a Windows administrator, inspect the special file and its ACL. On macOS/Linux, check permissions on `~/.ssh` and `authorized_keys`. On a Mac, also check the Remote Login allowlist.
- **Root is rejected**: Check `permitrootlogin` in the target's `sshd -T` output, root's own public-key file, and whether the Mac root account is enabled. A regular Linux user's `authorized_keys` does not authorize root.
- **`REMOTE HOST IDENTIFICATION HAS CHANGED`**: Determine whether the target was reinstalled, its address was reassigned, or its host key changed, then verify the new fingerprint. Do not bypass the host-key check.

For public-key failures, the most useful client command is:

```bash
ssh -vvv -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

In Windows PowerShell, replace the path after `-i`. In the debug output, first find the key the client offered, then whether the server accepted it. Editing `authorized_keys` again will not fix a connection timeout.

The next time I switch systems, I need to answer two questions: **Which machine initiates the connection? What system and account am I connecting to?** From there, the sequence is the same: start the target's server, generate a client key, authorize its public key for the target account, and verify a new session.
