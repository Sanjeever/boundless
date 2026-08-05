---
title: Hard Links, Symlinks, Junctions, and Shortcuts
date: 2026-08-05
tags:
  - Filesystem
  - Windows
  - macOS
  - Command Line
  - Dev Tools
description: Starting from a real need to reuse a Codex project setup in Claude Code, this post explains hard links, symlinks, Junctions, shortcuts, and how to choose safely across platforms.
outline: deep
aside: true
---

# Hard Links, Symlinks, Junctions, and Shortcuts

<!-- DESC SEP -->

To let Claude Code reuse a project's `AGENTS.md` and `.agents/skills`, I needed more than a shortcut I could double-click. I needed a filesystem link that development tools could follow transparently. This post uses that problem to explain when to choose a hard link, symlink, Junction, or desktop shortcut.

<!-- DESC SEP -->

I use Codex for most projects, so my repositories already contain `AGENTS.md`
and `.agents/skills`. Copying both into a separate Claude Code setup would leave
two versions that would eventually drift apart.

This sounds like a job for a “shortcut,” but Windows alone offers several
similar-looking mechanisms: hard links, symbolic links, Junctions, and `.lnk`
files. Some share file data, some store a target path, and some only make sense
to Explorer. Pick the wrong one and a person may be able to open it while Git,
the command line, or another development tool cannot.

## The Short Answer

For development work, choose by what you need the link to do.

| Need                                                 | Use                   | Why                                                                 |
| ---------------------------------------------------- | --------------------- | ------------------------------------------------------------------- |
| Reference another file or directory inside a project | Symbolic link         | Works for both files and directories, and Git can store it          |
| Map one local Windows directory to another           | Junction              | Needs no symlink creation privilege, but only works for directories |
| Give several file names the same data                | Hard link             | Every name resolves to the same file data                           |
| Give a user something to double-click                | `.lnk` / Finder Alias | The desktop environment opens the target                            |

The important question is not which command looks familiar. It is whether a
tool can treat the link path as the target path. Symlinks, hard links, and
Junctions are transparent to filesystem access. Windows `.lnk` files and Finder
Aliases need the desktop environment to resolve them. Code, configuration,
Docker mounts, and IDE workspaces need the former behavior.

For the setup in this post, `CLAUDE.md` uses Claude Code's import syntax to read
`AGENTS.md`, while `.claude/skills` is a relative symlink to `.agents/skills`.
The first is an application-level reference; only the second is a filesystem
link.

## What Each Link Actually Points To

The four mechanisms reduce to three useful mental models.

```text
Hard link:          several names → the same file data
Symlink / Junction: one entry      → another path
Shortcut / Alias:  desktop app    → reads shortcut file → opens target
```

### Hard Links: One File, Several Names

A hard link is not “one file pointing to another file.” It is another file name
for the same underlying file data.

```text
report.txt ─┐
            ├── the same file content
backup.txt ─┘
```

Edit the content through either name and the other sees the change. Removing
one name only removes one entry; the data is freed after the final hard link is
gone.

Create one in Windows PowerShell:

```powershell
New-Item -ItemType HardLink -Path .\backup.txt -Target .\report.txt
```

On macOS, use `ln` without `-s`:

```bash
ln report.txt backup.txt
```

Hard links work for files, cannot cross filesystems or volumes, and are not
independent backups. They solve “several names for the same data,” not “jump
from one path to another.”

### Symbolic Links: Storing a Target Path

A symlink is a special file that stores a target path. When a program accesses
the link, the filesystem continues resolving that path. If the target is moved,
renamed, or deleted, the link dangles.

Windows PowerShell can create symlinks to both files and directories:

```powershell
New-Item -ItemType SymbolicLink `
  -Path .\config.json `
  -Target D:\app\config\config-prod.json

New-Item -ItemType SymbolicLink `
  -Path C:\workspace\.claude `
  -Target $HOME\.claude
```

Creating a symlink on Windows normally requires an elevated terminal or
Developer Mode. That privilege is needed to create the link, not to access its
target afterward.

On macOS, files and directories use the same command:

```bash
ln -s ~/.claude ~/workspace/.claude
```

A symlink target may be absolute or relative. Relative targets resolve from the
directory containing the link, so they work well for paths that keep the same
relationship inside a project. Absolute targets are often clearer for a home
directory or a fixed system location.

### Junctions: Local Directory Mapping on Windows

A Junction is a Windows directory redirection mechanism. It only works for
directories and is useful for mapping one local directory to another. Creating
one normally requires neither elevation nor Developer Mode.

```powershell
New-Item -ItemType Junction `
  -Path C:\workspace\.codex `
  -Target $HOME\.codex
```

Use a symlink when the target is a file or a network UNC path, or when the link
itself needs to travel through Git across platforms. Junctions are best kept as
local Windows directory mappings.

### Shortcuts: For People to Click, Not Programs to Resolve

Windows `.lnk` files and macOS Finder Aliases are interpreted by the desktop
environment. Explorer or Finder opens the target when a user double-clicks the
shortcut. A command-line program reading `config.lnk`, however, receives the
shortcut file itself.

That makes shortcuts useful for application launchers and favorite folders, but
not for code, configuration, Docker mounts, or IDE workspaces. If the consumer
is a program rather than a person, do not use a desktop shortcut.

## Reusing a Codex Project Setup in Claude Code

The original problem needs two references at different layers:

```text
CLAUDE.md        --Claude Code import syntax--> AGENTS.md
.claude/skills   --filesystem symlink---------> .agents/skills
```

### Import `AGENTS.md` from `CLAUDE.md`

Claude Code reads `CLAUDE.md` and supports `@path` imports. The project-root
`CLAUDE.md` only needs one line:

```markdown
@AGENTS.md
```

Create it in Git Bash or on macOS:

```bash
printf '@AGENTS.md' > CLAUDE.md
```

The PowerShell equivalent is:

```powershell
Set-Content `
  -Path .\CLAUDE.md `
  -Value '@AGENTS.md' `
  -Encoding utf8NoBOM `
  -NoNewline
```

Keeping this as a regular file is more flexible than using a symlink. You can
append Claude-specific instructions later without copying the contents of
`AGENTS.md`.

### Point Both Skills Directories at the Same Content

Claude Code must see the real content inside `.agents/skills` when it reads
`.claude/skills`, so this relationship uses a relative symlink.

In Git Bash or on macOS:

```bash
mkdir -p .claude
ln -s ../.agents/skills .claude/skills
```

PowerShell 7.1 and later support relative targets for directory symlinks:

```powershell
New-Item -ItemType Directory -Path .\.claude -Force | Out-Null

New-Item -ItemType SymbolicLink `
  -Path .\.claude\skills `
  -Target ..\.agents\skills
```

The target `../.agents/skills` resolves from the directory containing
`.claude/skills`. Moving the whole repository preserves that relationship, so
the link continues to work.

### Make Sure Git Preserves the Symlink

On Windows, inspect the repository setting first:

```bash
git config --get core.symlinks
```

If it prints `false`, enable symlink handling before creating and staging the
link:

```bash
git config core.symlinks true
```

`core.symlinks` controls whether Git checks out a real symlink or a small plain
file containing the target path. It does not grant Windows permission to create
symlinks; an elevated terminal or Developer Mode remains a separate
prerequisite.

After creating the link, inspect what the filesystem and Git see:

```powershell
Get-Item .\.claude\skills | Select-Object LinkType, Target
```

```bash
git add AGENTS.md CLAUDE.md .agents .claude
git ls-files -s .claude/skills
```

The `git ls-files` output should begin with mode `120000`, which means Git has
staged a symlink instead of ordinary files from the target directory. Once that
looks right, commit the setup:

```bash
git commit -m "chore: share agent configuration"
```

## Inspect Before Removing a Link

Removing a symlink or Junction only requires removing the link object. There is
no need to recursively clear a directory.

In Windows PowerShell:

```powershell
Get-Item .\.claude\skills | Select-Object LinkType, Target
Remove-Item .\.claude\skills
```

On macOS or in Git Bash:

```bash
ls -ld .claude/skills
rm .claude/skills
```

Do not aim a recursive removal command at a linked directory with a trailing
slash before confirming what the path is. Inspect the target, then remove the
link itself with a non-recursive command. That makes the intent clear and keeps
“remove this entry” distinct from “empty this directory.”

Hard links have no original-versus-copy hierarchy. Removing any one name only
removes that entry; the remaining names still access the same data.

## Three Things to Remember

- A hard link gives the same file data several names.
- A symlink or Junction redirects one path to another path.
- A shortcut or Alias relies on the desktop environment and is meant for people
  to click.

For development projects, start with a symlink unless you have a specific
constraint. Reach for a hard link, Junction, or desktop shortcut only when the
requirement is specifically shared file data on one volume, local Windows
directory mapping, or a double-clickable desktop entry.
