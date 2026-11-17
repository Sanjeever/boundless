---
title: SSH Setup Across Systems
date: 2026-09-30
tags:
  - SSH
  - Windows
  - macOS
  - Linux
description: A practical workflow for all nine SSH connection directions between Windows, macOS, Ubuntu, and Debian—covering sshd setup, public keys, and administrator or root access.
outline: deep
aside: true
---

# SSH Setup Across Systems

<!-- DESC SEP -->

A practical workflow for all nine SSH connection directions between Windows, macOS, Ubuntu, and Debian—covering `sshd` setup, public keys, and administrator or root access.

<!-- DESC SEP -->

Whenever I set up SSH between Windows, macOS, and Linux, the syntax is rarely what trips me up—it is the direction and the platform quirks: which machine holds the public key, why a Windows administrator ignores `~/.ssh/authorized_keys`, or which layer is blocking `root` on macOS and Ubuntu.

Once you separate the **client initiating the connection** from the **target receiving it**, all nine cross-platform combinations follow the exact same four steps.

| Role | Job |
| --- | --- |
| **Client (initiating)** | Generates and keeps the private key; runs `ssh user@ip` |
| **Target (receiving)** | Runs `sshd`, opens port 22 in the firewall, and stores the client’s public key under the target account |

## Step 1: Start the SSH Server on the Target

### Windows (10 / 11 / Server 2019+)

In an **elevated PowerShell on the target Windows machine**, install and start OpenSSH Server (see [Microsoft’s installation guide](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_install_firstuse)):

```powershell
Get-WindowsCapability -Online | Where-Object Name -like 'OpenSSH*'
Add-WindowsCapability -Online -Name OpenSSH.Server~~~~0.0.1.0

Start-Service sshd
Set-Service -Name sshd -StartupType Automatic
```

Make sure the inbound firewall rule for TCP port 22 exists and is enabled:

```powershell
Get-NetFirewallRule -Name OpenSSH-Server-In-TCP
New-NetFirewallRule -Name OpenSSH-Server-In-TCP -DisplayName 'OpenSSH Server (sshd)' -Enabled True -Direction Inbound -Protocol TCP -Action Allow -LocalPort 22
```

### macOS

Open **System Settings → General → Sharing → Remote Login**, turn it on, and make sure the target user account is on the allowed list (see [Apple’s Remote Login guide](https://support.apple.com/guide/mac-help/allow-a-remote-computer-to-access-your-mac-mchlp1066/mac)).

### Ubuntu / Debian

On the **target Linux machine**, install and enable `openssh-server` (see the [Ubuntu OpenSSH docs](https://ubuntu.com/server/docs/how-to/security/openssh-server/)):

```bash
sudo apt update
sudo apt install openssh-server
sudo systemctl enable --now ssh
```

If UFW is active, allow SSH through:

```bash
sudo ufw allow OpenSSH
```

## Step 2: Generate a Key on the Client

On the **machine initiating the connection**, generate an Ed25519 key pair (same command across Windows, macOS, and Linux):

```bash
ssh-keygen -t ed25519 -C "my-laptop"
```

If you set a passphrase on the private key, load it into `ssh-agent` so you don’t have to type it on every login.

Windows client (enable the service from an elevated PowerShell first):

```powershell
Set-Service ssh-agent -StartupType Automatic
Start-Service ssh-agent
ssh-add "$env:USERPROFILE\.ssh\id_ed25519"
```

macOS / Linux client:

```bash
ssh-add ~/.ssh/id_ed25519
```

Print the `.pub` public key line so you can copy it to the target (never copy the private key without `.pub`):

```powershell
# Windows PowerShell
Get-Content "$env:USERPROFILE\.ssh\id_ed25519.pub"
```

```bash
# macOS / Linux
cat ~/.ssh/id_ed25519.pub
```

## Step 3: Authorize the Public Key on the Target

Run the matching block **locally on the target machine**, replacing `ssh-ed25519 AAAA... my-laptop` with your full `.pub` line.

### Target: macOS, Ubuntu, or Debian Standard Account

Logged in as the target user:

```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Target: Windows Standard Account

In a PowerShell session running as that standard user:

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$dir = Join-Path $env:USERPROFILE '.ssh'
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Add-Content -LiteralPath (Join-Path $dir 'authorized_keys') -Value $key -Encoding ascii
```

### Target: Windows Administrator Account (The Classic Trap)

If the target Windows user belongs to the local `Administrators` group, OpenSSH **ignores** `~/.ssh/authorized_keys` by default and reads `C:\ProgramData\ssh\administrators_authorized_keys` instead—and rejects the file if its ACL is too permissive (see [Microsoft’s key management docs](https://learn.microsoft.com/en-us/windows-server/administration/openssh/openssh_keymanagement)).

Run this in an **elevated PowerShell on the target Windows machine**:

```powershell
$key = 'ssh-ed25519 AAAA... my-laptop'
$path = Join-Path $env:ProgramData 'ssh\administrators_authorized_keys'
Add-Content -LiteralPath $path -Value $key -Encoding ascii
icacls.exe $path /inheritance:r /grant '*S-1-5-32-544:F' /grant 'SYSTEM:F'
```

Using SID `*S-1-5-32-544` targets the built-in Administrators group regardless of the OS display language.

## Step 4: Direct Root Login (When Needed)

Logging in as a regular user and running `sudo` is usually simpler. Prefer public keys when you need direct `root` access; if you need password login, the steps below cover that too.

### Root on Ubuntu / Debian

Run the configuration commands below on the **target Ubuntu / Debian machine**. First, confirm that `/etc/ssh/sshd_config` includes this line near the beginning. It is normally present by default:

```text
Include /etc/ssh/sshd_config.d/*.conf
```

OpenSSH uses the first value read for most options, and loads configuration snippets in filename lexical order. The examples use `00-root-login.conf` so it is read before common files such as `50-cloud-init.conf`. You can also edit the main file with `sudoedit /etc/ssh/sshd_config`, but check whether an earlier snippet already sets the same option (see the [Debian `sshd_config` manual](https://manpages.debian.org/trixie/openssh-server/sshd_config.5.en.html)).

#### Public-Key Login (Recommended)

Check the effective setting first:

```bash
sudo sshd -T | grep '^permitrootlogin '
```

`prohibit-password`, the common default, allows public-key login for root while disabling password and keyboard-interactive authentication for root. To change the setting to this value, write a configuration snippet. The `tee` command below overwrites any existing file at that path:

```bash
sudo mkdir -p /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/00-root-login.conf > /dev/null <<'EOF'
PermitRootLogin prohibit-password
EOF
sudo sshd -t && sudo systemctl restart ssh
```

Then install the client's public key into `/root/.ssh/authorized_keys`, replacing the entire example key line:

```bash
sudo install -d -m 700 /root/.ssh
printf '%s\n' 'ssh-ed25519 AAAA... my-laptop' | sudo tee -a /root/.ssh/authorized_keys > /dev/null
sudo chmod 600 /root/.ssh/authorized_keys
```

Keep your current connection open and test from **another terminal on the client**, replacing the example IP with the target address:

```bash
ssh -o PreferredAuthentications=publickey -i ~/.ssh/id_ed25519 root@192.168.1.20
```

#### Password Login

For root password login, set these two options in the snippet. This command overwrites any existing file at that path:

```bash
sudo mkdir -p /etc/ssh/sshd_config.d
sudo tee /etc/ssh/sshd_config.d/00-root-login.conf > /dev/null <<'EOF'
PermitRootLogin yes
PasswordAuthentication yes
EOF
```

`PermitRootLogin yes` permits root login. The `PasswordAuthentication yes` setting here is global, so it also enables password authentication for other accounts that meet the login requirements.

Set a password for root, then validate the configuration and restart the service. The `&&` ensures that the restart runs only if validation succeeds:

```bash
sudo passwd root
sudo sshd -t && sudo systemctl restart ssh
```

Check that both options are read as intended:

```bash
sudo sshd -T | grep -E '^(permitrootlogin|passwordauthentication) '
```

Expected output:

```text
permitrootlogin yes
passwordauthentication yes
```

Keep your current connection open and test password login from **another terminal on the client**, replacing the example IP with the target address:

```bash
ssh -o PreferredAuthentications=password -o PubkeyAuthentication=no root@192.168.1.20
```

If the values are correct but login still fails, check additional restrictions such as `AllowUsers`, `DenyUsers`, or `Match`. When the configuration contains `Match` blocks, use `sshd -T -C` with the actual connection parameters to check the applicable settings (see the [Debian `sshd` manual](https://manpages.debian.org/trixie/openssh-server/sshd.8.en.html)).

### Root on macOS

macOS disables `root` by default (see [Apple’s root user guide](https://support.apple.com/en-us/102367)). If you must enable it:

1. Enable the Root User in **Directory Utility**.
2. Add `root` to the SSH access group: `sudo dseditgroup -o edit -a root -t user com.apple.access_ssh`.
3. Install the public key in `/var/root/.ssh/authorized_keys` (`root:wheel`, mode `600`) and confirm `sudo sshd -T | grep '^permitrootlogin '` is not `no`.

## Verification and Troubleshooting

Keep your current session open and test public-key login from a second terminal on the client:

```bash
ssh -o PreferredAuthentications=publickey -i ~/.ssh/id_ed25519 alice@192.168.1.20
```

Once key login succeeds, you can disable password authentication on the target by setting `PasswordAuthentication no` in the effective configuration, validating with `sshd -t`, and restarting the service. On Ubuntu / Debian, if you used `00-root-login.conf` above, change the setting in that file so an earlier value does not take precedence.

When a connection fails, the error message tells you which layer to check:

- **`Connection timed out`**: Check the IP address, routing/VPN, firewall rules, or whether a target Mac went to sleep.
- **`Connection refused`**: `sshd` is not listening—check the service status on the target.
- **`Permission denied (publickey)`**: Run `ssh -vvv` on the client to see which key was offered, then check file locations and permissions on the target (especially `administrators_authorized_keys` ACLs on Windows and `700`/`600` modes on Unix).
