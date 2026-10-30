---
title: Hard Links, Symlinks, Junctions, and Shortcuts
date: 2026-08-05
tags:
  - Filesystem
  - Windows
  - macOS
  - Command Line
  - Dev Tools
description: Starting from reusing a Codex project setup in Claude Code, here is how hard links, symlinks, Junctions, and desktop shortcuts actually differ.
outline: deep
aside: true
---

# Hard Links, Symlinks, Junctions, and Shortcuts

<!-- DESC SEP -->

Starting from reusing a Codex project setup in Claude Code, here is how hard links, symlinks, Junctions, and desktop shortcuts actually differ.

<!-- DESC SEP -->

Most of my repositories already carry `AGENTS.md` and `.agents/skills` for Codex. When I open the same project in Claude Code, duplicating those files into a second directory guarantees they will drift apart within a week.

It sounds like a job for a simple “shortcut,” yet Windows alone has four mechanisms that look similar from a distance: hard links, symbolic links, Junctions, and `.lnk` files. Some share raw file data, some store a path, and some only make sense to Explorer. Pick the wrong one and double-clicking works fine while Git and CLI tools hit a wall.

## Which One to Reach For

For development work, the dividing line is whether a program can open the link path as if it were the real thing:

| Need | Choice | Why |
| --- | --- | --- |
| Point to a file or folder inside a repo | Symbolic link | Works for files and folders, and travels cleanly through Git |
| Map a local folder on Windows | Junction | Needs no admin privilege or Developer Mode, for local folders only |
| Give multiple filenames the exact same data | Hard link | Every name points straight to the same underlying file data |
| Give a human an icon to double-click | `.lnk` / Finder Alias | Resolved by the desktop shell, not by CLI tools or libraries |

Whenever the consumer is Git, a compiler, Docker, or an IDE, you need one of the first three filesystem links—never a desktop shortcut.

## Three Mental Models

```text
Hard link:          multiple names → the same file data
Symlink / Junction: one path       → redirects to another path
Shortcut / Alias:   desktop shell  → reads shortcut file → opens target
```

### Hard Links: One File, Multiple Names

A hard link does not point one filename at another filename; it binds an equal filename to the same underlying data on disk.

```powershell
# Windows PowerShell
New-Item -ItemType HardLink -Path .\backup.txt -Target .\report.txt
```

```bash
# macOS / Linux
ln report.txt backup.txt
```

Delete one name and the data stays put until the last link is removed. Hard links only work for files on the same volume, though, and editors that save by writing a temp file and renaming it will quietly sever the link.

### Symbolic Links: Storing a Target Path

A symlink is a tiny special file that holds a target path. Programs reading the symlink follow that path transparently; if the target is moved or deleted, the symlink dangles.

```powershell
# Windows PowerShell (requires Developer Mode or an elevated shell)
New-Item -ItemType SymbolicLink -Path .\config.json -Target D:\app\config\config-prod.json
New-Item -ItemType SymbolicLink -Path C:\workspace\.claude -Target $HOME\.claude
```

```bash
# macOS / Linux
ln -s ~/.claude ~/workspace/.claude
```

Symlinks work for both files and directories and accept relative paths. Inside a repository, a relative target keeps working no matter where the repo is cloned.

### Junctions: Local Folder Redirection on Windows

A Junction is a Windows-specific directory link. It only targets local directories, with the nice perk that creating one requires no special permissions:

```powershell
New-Item -ItemType Junction -Path C:\workspace\.codex -Target $HOME\.codex
```

For local machine folder mappings that stay outside Git, a Junction is often the most frictionless choice on Windows.

## In Practice: Sharing a Codex Setup with Claude Code

To share my Codex configuration with Claude Code, the two pieces live at different layers:

```text
CLAUDE.md        --Claude Code @import--> AGENTS.md
.claude/skills   --relative symlink-----> .agents/skills
```

### Importing `AGENTS.md` from `CLAUDE.md`

Claude Code supports `@path` imports out of the box, so `CLAUDE.md` in the project root only needs a single line:

```markdown
@AGENTS.md
```

Keeping `CLAUDE.md` as a regular file is handier than symlinking it—if I ever need a note specific to Claude Code, I can append it right below the import.

### Linking the `skills` Directory

For `.claude/skills`, Claude Code needs to traverse into `.agents/skills` transparently, which calls for a relative symlink.

On macOS or Linux:

```bash
mkdir -p .claude
ln -s ../.agents/skills .claude/skills
```

On Windows ([PowerShell 7.1+](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item#example-7-create-a-symbolic-link-to-a-file-or-folder)):

```powershell
New-Item -ItemType Directory -Path .\.claude -Force | Out-Null
New-Item -ItemType SymbolicLink -Path .\.claude\skills -Target ..\.agents\skills
```

Watch out for Git Bash on Windows: unless `MSYS=winsymlinks:nativestrict` is enabled, `ln -s` defaults to copying the directory instead of creating a real symlink (see the [MSYS symlinks docs](https://www.msys2.org/docs/symlinks/)). Running `New-Item` in PowerShell avoids that trap.

### Keeping the Symlink Intact in Git

On Windows, make sure [`core.symlinks`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coresymlinks) is enabled before staging:

```bash
git config core.symlinks true
git add AGENTS.md CLAUDE.md .agents .claude
git ls-files -s .claude/skills
```

When `git ls-files -s` prints mode `120000`, Git has recorded the symlink itself rather than a duplicate tree of files.

## Removing Links Safely

To remove a symlink or Junction, delete the link entry itself without recursive flags or a trailing slash:

```powershell
# PowerShell
Remove-Item .\.claude\skills
```

```bash
# macOS / Linux (no trailing slash)
rm .claude/skills
```

Check the entry with `Get-Item` or `ls -ld` first, remove the pointer, and the target directory stays untouched.
