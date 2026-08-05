---
title: 分清硬链接、符号链接、Junction 与快捷方式
date: 2026-08-05
tags:
  - 文件系统
  - Windows
  - macOS
  - 命令行
  - 开发工具
description: 从 Claude Code 复用 Codex 项目配置的实际需求出发，分清硬链接、符号链接、Junction 与快捷方式，并给出跨平台选择和安全删除方法。
outline: deep
aside: true
---

# 分清硬链接、符号链接、Junction 与快捷方式

<!-- DESC SEP -->

为了让 Claude Code 复用项目里的 `AGENTS.md` 和 `.agents/skills`，我需要的不是一个能双击打开的快捷方式，而是开发工具能够透明访问的文件系统链接。本文从这个实际问题出发，讲清硬链接、符号链接、Junction 与快捷方式该怎么选。

<!-- DESC SEP -->

我多数项目用 Codex 开发，仓库里已经有 `AGENTS.md` 和
`.agents/skills`。如果还要为 Claude Code 复制一套项目指令和 skills，
两份配置迟早会产生差异。

看起来只要创建一个“快捷方式”就够了，但 Windows 至少有硬链接、
符号链接、Junction 和 `.lnk` 四种相似的机制。它们有的共享文件数据，
有的保存目标路径，有的只有资源管理器认识。选错以后，人能点开，
Git、命令行或开发工具却未必能正常访问。

## 先给结论

开发场景通常可以按下面的顺序选择。

| 需求                         | 推荐方式              | 原因                                 |
| ---------------------------- | --------------------- | ------------------------------------ |
| 项目内引用另一个文件或目录   | 符号链接              | 文件和目录都能用，也能由 Git 保存    |
| Windows 本机映射一个目录     | Junction              | 不需要符号链接创建权限，但只适合目录 |
| 多个文件名必须共享同一份数据 | 硬链接                | 所有名称指向同一份文件数据           |
| 给用户提供一个双击入口       | `.lnk` / Finder Alias | 由桌面环境负责打开目标               |

这里最重要的判断不是命令，而是工具能否把链接路径当成真实路径访问。
符号链接、硬链接和 Junction 对文件系统访问是透明的；Windows `.lnk`
和 Finder Alias 则需要桌面环境解析。代码、配置、Docker 挂载和 IDE
工作区需要前一种能力，不能用桌面快捷方式代替。

对本文开头的需求，`CLAUDE.md` 应通过 Claude Code 的导入语法读取
`AGENTS.md`，`.claude/skills` 则使用指向 `.agents/skills` 的相对符号
链接。前者是应用层引用，后者才是文件系统链接。

## 链接到底指向什么

四种机制可以归纳成三种心智模型。

```text
硬链接：              多个文件名 → 同一份文件数据
符号链接 / Junction： 一个入口   → 另一个路径
快捷方式 / Alias：    桌面程序   → 读取快捷方式文件 → 打开目标
```

### 硬链接：一份数据，多个名字

硬链接不是“一个文件指向另一个文件”，而是多个文件名共同指向同一份
文件数据。

```text
report.txt ─┐
            ├── 同一份文件内容
backup.txt ─┘
```

修改其中任意一个名称下的内容，其他名称看到的内容也会变化。删除一个
名称只会减少一个入口；只有最后一个硬链接也被删除后，文件数据才会被
释放。

Windows PowerShell 创建硬链接：

```powershell
New-Item -ItemType HardLink -Path .\backup.txt -Target .\report.txt
```

macOS 使用 `ln`，不加 `-s`：

```bash
ln report.txt backup.txt
```

硬链接只适用于文件，不能跨文件系统或磁盘卷，也不适合用作独立备份。
它解决的是“多个名字共享同一份数据”，不是“从一个路径跳到另一个
路径”。

### 符号链接：保存目标路径

符号链接是一个特殊文件，其中保存着目标路径。访问链接时，文件系统会
继续解析这个路径；目标被移动、改名或删除后，链接就会悬空。

Windows PowerShell 可以分别为文件和目录创建符号链接：

```powershell
New-Item -ItemType SymbolicLink `
  -Path .\config.json `
  -Target D:\app\config\config-prod.json

New-Item -ItemType SymbolicLink `
  -Path C:\workspace\.claude `
  -Target $HOME\.claude
```

Windows 创建符号链接通常需要以管理员身份运行终端，或者启用开发者
模式。这个权限只影响“创建”操作，不影响之后通过链接访问目标。

macOS 的文件和目录使用同一个命令：

```bash
ln -s ~/.claude ~/workspace/.claude
```

符号链接的目标既可以是绝对路径，也可以是相对路径。相对目标以链接
所在目录为基准，因此适合项目内保持固定相对位置的文件；链接用户目录
或固定系统位置时，绝对路径通常更直观。

### Junction：Windows 的本地目录映射

Junction 是 Windows 提供的目录重定向机制。它只能链接目录，适合把
一个本地目录映射到另一个本地目录，创建时通常不需要管理员权限或
开发者模式。

```powershell
New-Item -ItemType Junction `
  -Path C:\workspace\.codex `
  -Target $HOME\.codex
```

如果目标是文件、网络 UNC 路径，或者链接本身需要随 Git 跨平台保存，
应使用符号链接。Junction 更适合只在 Windows 本机存在的目录映射。

### 快捷方式：给人点击，不给程序寻址

Windows `.lnk` 和 macOS Finder Alias 都由桌面环境解析。用户双击后，
资源管理器或 Finder 会打开目标；命令行程序读取 `config.lnk` 时，得到的
却是快捷方式文件本身。

因此它们适合应用入口和常用目录，不适合代码、配置文件、Docker 挂载
或 IDE 工作区。判断标准很简单：如果消费者是程序而不是人，就不要用
桌面快捷方式。

## 实战：让 Claude Code 复用 Codex 的项目配置

现在回到最初的问题。这里需要建立两个不同层次的引用关系：

```text
CLAUDE.md        --Claude Code 导入语法--> AGENTS.md
.claude/skills   --文件系统符号链接------> .agents/skills
```

### 用 `CLAUDE.md` 导入 `AGENTS.md`

Claude Code 读取 `CLAUDE.md`，并支持用 `@路径` 导入其他文件。项目根
目录的 `CLAUDE.md` 只需要一行：

```markdown
@AGENTS.md
```

在 Git Bash 或 macOS 中创建：

```bash
printf '@AGENTS.md' > CLAUDE.md
```

PowerShell 等价命令：

```powershell
Set-Content `
  -Path .\CLAUDE.md `
  -Value '@AGENTS.md' `
  -Encoding utf8NoBOM `
  -NoNewline
```

这里保留普通文件比符号链接更灵活：以后如果需要追加 Claude Code
专属指令，可以直接写在导入语句之后，同时避免复制 `AGENTS.md` 的
内容。

### 把 skills 目录链接到同一份内容

`.claude/skills` 需要让 Claude Code 透明地看到 `.agents/skills`，因此
使用相对符号链接。

Git Bash 或 macOS：

```bash
mkdir -p .claude
ln -s ../.agents/skills .claude/skills
```

PowerShell 7.1 及以上版本支持为目录创建相对目标的符号链接：

```powershell
New-Item -ItemType Directory -Path .\.claude -Force | Out-Null

New-Item -ItemType SymbolicLink `
  -Path .\.claude\skills `
  -Target ..\.agents\skills
```

相对目标 `../.agents/skills` 以 `.claude/skills` 所在目录为基准。整个
仓库移动到别处以后，两者的相对关系不变，链接仍然有效。

### 让 Git 保留符号链接

在 Windows 上先检查当前仓库的配置：

```bash
git config --get core.symlinks
```

如果输出为 `false`，在创建和暂存链接前启用它：

```bash
git config core.symlinks true
```

`core.symlinks` 决定 Git 是把符号链接检出为真正的链接，还是写成一个
只包含目标路径的普通文本文件。它不会授予 Windows 创建符号链接的
权限；管理员终端或开发者模式仍然是另一项前提。

创建完成后，可以分别检查文件系统和 Git 看到的类型：

```powershell
Get-Item .\.claude\skills | Select-Object LinkType, Target
```

```bash
git add AGENTS.md CLAUDE.md .agents .claude
git ls-files -s .claude/skills
```

`git ls-files` 输出开头的模式应为 `120000`，表示 Git 暂存的是符号链接，
而不是链接目标下的一组普通文件。确认无误后再提交：

```bash
git commit -m "chore: share agent configuration"
```

## 删除链接时先确认对象

删除符号链接或 Junction 时，只删除链接对象本身，不需要递归清空目录。

Windows PowerShell：

```powershell
Get-Item .\.claude\skills | Select-Object LinkType, Target
Remove-Item .\.claude\skills
```

macOS 或 Git Bash：

```bash
ls -ld .claude/skills
rm .claude/skills
```

不要在没有确认对象类型时，对链接目录使用带尾随 `/` 的递归删除命令。
先查看它指向哪里，再用非递归命令删除链接本身，意图更清楚，也能避免
把“删除入口”写成“清空目录”。

硬链接则没有“原文件”和“链接文件”的主次之分。删除任意一个名称都
只会减少一个入口，剩余名称仍然访问同一份数据。

## 最后记住这三句话

- 硬链接是多个名字共享同一份文件数据。
- 符号链接和 Junction 是从一个路径重定向到另一个路径。
- 快捷方式和 Alias 依赖桌面环境，只适合给人点击。

开发项目里如果没有特殊限制，优先从符号链接开始。只有当需求明确落在
“同卷文件共享”“Windows 本机目录映射”或“桌面双击入口”时，再分别
选择硬链接、Junction 或快捷方式。
