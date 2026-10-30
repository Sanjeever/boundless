---
title: 分清硬链接、符号链接、Junction 与快捷方式
date: 2026-08-05
tags:
  - 文件系统
  - Windows
  - macOS
  - 命令行
  - 开发工具
description: 从 Claude Code 复用 Codex 项目配置的实际需求出发，理清硬链接、符号链接、Junction 与桌面快捷方式的边界与用法。
outline: deep
aside: true
---

# 分清硬链接、符号链接、Junction 与快捷方式

<!-- DESC SEP -->

从 Claude Code 复用 Codex 项目配置的实际需求出发，理清硬链接、符号链接、Junction 与桌面快捷方式的边界与用法。

<!-- DESC SEP -->

我平时用 Codex 写项目，仓库里大多已经有了一份 `AGENTS.md` 和 `.agents/skills`。切到 Claude Code 时，要是再复制一套项目指令和技能目录，两边迟早会各改各的。

直觉上建个“快捷方式”就能解决，但 Windows 下偏偏有硬链接、符号链接、Junction 和 `.lnk` 四种长得很像的机制。有的共享底层数据，有的保存目标路径，有的只归资源管理器管。选错了，鼠标双击能打开，Git 和命令行工具却读不出来。

## 先看怎么选

在开发场景里，按工具能不能把链接当成真实路径访问来挑就够了：

| 需求 | 推荐方式 | 原因 |
| --- | --- | --- |
| 项目内引用另一个文件或目录 | 符号链接 | 文件和目录都能用，且能被 Git 记录 |
| Windows 本机映射一个目录 | Junction | 无需管理员或开发者模式，但只支持本地目录 |
| 多个文件名共享同一份数据 | 硬链接 | 所有文件名直接指向同一块磁盘数据 |
| 放一个供人双击的桌面入口 | `.lnk` / Finder Alias | 由桌面环境解析，程序无法直接当路径读 |

如果消费者是 Git、编译器、Docker 或 IDE，就必须用前三种文件系统级别的链接，不能用桌面快捷方式。

## 三种心智模型

```text
硬链接：              多个文件名 → 同一份文件数据
符号链接 / Junction： 一个路径   → 指向另一个路径
快捷方式 / Alias：    桌面程序   → 读取快捷方式文件 → 打开目标
```

### 硬链接：一份数据，多个名字

硬链接不是“文件 A 指向文件 B”，而是两个平起平坐的文件名绑在同一份底层数据上。

```powershell
# Windows PowerShell
New-Item -ItemType HardLink -Path .\backup.txt -Target .\report.txt
```

```bash
# macOS / Linux
ln report.txt backup.txt
```

删掉其中一个名字，数据还在；只有最后一个硬链接也被删掉，磁盘空间才会释放。不过它只能用于同卷的文件，不能链接目录，而且有些编辑器保存时会“新建文件再替换原名”，无意间扯断硬链接关系。

### 符号链接：保存目标路径

符号链接是一个记着目标路径的特殊文件。程序顺着它读过去，看到的就是目标本身；要是目标被移走或删掉，链接就会悬空。

```powershell
# Windows PowerShell（通常需开启开发者模式或管理员权限）
New-Item -ItemType SymbolicLink -Path .\config.json -Target D:\app\config\config-prod.json
New-Item -ItemType SymbolicLink -Path C:\workspace\.claude -Target $HOME\.claude
```

```bash
# macOS / Linux
ln -s ~/.claude ~/workspace/.claude
```

符号链接既能指向文件也能指向目录，还支持相对路径。项目内部互指时用相对路径，整个仓库搬家也不会断。

### Junction：Windows 的本地目录映射

Junction 是 Windows 特有的目录重定向，只能绑本地目录，好处是创建时不挑权限：

```powershell
New-Item -ItemType Junction -Path C:\workspace\.codex -Target $HOME\.codex
```

只要不跨机器、不进 Git，在本机把一个大目录挂载到另一处时，Junction 往往比符号链接省心。

## 实战：让 Claude Code 复用 Codex 配置

回到最初的需求，两处复用正好落在两个不同的层次上：

```text
CLAUDE.md        --应用层 @导入------> AGENTS.md
.claude/skills   --文件系统符号链接--> .agents/skills
```

### 用 `CLAUDE.md` 导入 `AGENTS.md`

Claude Code 原生支持 `@路径` 导入。项目根目录的 `CLAUDE.md` 只需写一行：

```markdown
@AGENTS.md
```

用普通文件存这行导入比建符号链接更灵活——日后想补几句 Claude Code 专属的叮嘱，直接往后追加就行。

### 用相对符号链接共享 `skills`

`.claude/skills` 需要让工具直接看到 `.agents/skills` 里的文件，这里用相对符号链接最合适。

在 macOS 或 Linux 下：

```bash
mkdir -p .claude
ln -s ../.agents/skills .claude/skills
```

在 Windows [PowerShell 7.1+](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/new-item#example-7-create-a-symbolic-link-to-a-file-or-folder) 下：

```powershell
New-Item -ItemType Directory -Path .\.claude -Force | Out-Null
New-Item -ItemType SymbolicLink -Path .\.claude\skills -Target ..\.agents\skills
```

要注意的是，在 Windows 的 Git Bash 里直接跑 `ln -s`，默认往往只是把目录深拷贝了一份（见 [MSYS 符号链接说明](https://www.msys2.org/docs/symlinks/)），除非额外配置了 `MSYS=winsymlinks:nativestrict`。在 Windows 上建链接，直接用 PowerShell 更稳妥。

### 让 Git 正确记录符号链接

Windows 上提交前，先确认仓库开启了 [`core.symlinks`](https://git-scm.com/docs/git-config#Documentation/git-config.txt-coresymlinks)：

```bash
git config core.symlinks true
git add AGENTS.md CLAUDE.md .agents .claude
git ls-files -s .claude/skills
```

如果 `git ls-files -s` 输出的权限位是 `120000`，就说明 Git 存下的确实是一条符号链接，而不是把里面的文件又存了一遍。

## 安全删除链接

删符号链接或 Junction 时，只删入口本身，千万别顺手加上递归参数或末尾斜杠：

```powershell
# PowerShell
Remove-Item .\.claude\skills
```

```bash
# macOS / Linux（注意末尾不要带 /）
rm .claude/skills
```

先用 `Get-Item` 或 `ls -ld` 看清它是不是链接，再干脆地摘掉入口，原目录里的东西就毫发无损。
