---
title: 我开源了我的 VS Code 配置
date: 2026-07-31
tags:
  - 开源
  - VS Code
  - 开发工具
  - AI 编程
description: 我开源了一套面向代码审查与轻量修改的 VS Code 配置，把主要编码交给 Codex，让编辑器专注于读 diff 和查调用链。
outline: deep
aside: true
---

# 我开源了我的 VS Code 配置

<!-- DESC SEP -->

我开源了一套面向代码审查与轻量修改的 VS Code 配置，把主要编码交给 Codex，让编辑器专注于读 diff 和查调用链。

<!-- DESC SEP -->

## 当编辑器不再负责大部分编码

以前配编辑器，心思都在怎么更快地补全、生成和保存代码上。现在日常习惯变了：成块的实现交给 Codex，打开 VS Code 多半是为了看 diff、顺调用链，再动手改几处收尾的细节。

角色一变，从前觉得顺手的默认行为反而开始添乱。看代码时随手敲了两个字，自动保存立刻写进磁盘；保存时自动格式化又顺带改了几十行缩进。要是 diff 视图再默认折叠空白字符差异，或者侧边栏塞满好几套 AI 聊天入口，界面就显得吵闹。

我把现在自用的配置整理成了一个公开仓库：

- **GitHub 仓库**：[Sanjeever/vscode-settings](https://github.com/Sanjeever/vscode-settings)

## 审查时不让编辑器替我动手

这套配置最核心的改动，是关掉那些会在阅读期间悄悄改动工作区的开关：

```json
{
  "chat.disableAIFeatures": true,
  "files.autoSave": "off",
  "editor.formatOnSave": false,
  "diffEditor.wordWrap": "on",
  "diffEditor.ignoreTrimWhitespace": false,
  "git.autofetch": false
}
```

主编码循环已经在 Codex 里完成，所以我关掉了 VS Code 内置的 AI 入口。自动保存和保存时格式化也一并关闭——需要格式化时可以随时手动触发，但打开文件看一眼再保存，不该平白造出一堆无关的 diff。

diff 视图开启了自动换行，并保留首尾空白差异，确保眼前看到的改动和 Git 实际记录的一致。同时保留了 minimap、inlay hints 和 sticky scroll，翻阅长文件时更容易看清类型和当前所处的作用域。

## 扩展与语言支持

配置覆盖了我平时常写的几门语言：Java、Spring Boot、Vue、React、TypeScript、Go、Python、Rust 和 Flutter。

挑选扩展时尽量不叠床架屋：

- JavaScript 与 TypeScript 直接用 VS Code 内置服务；
- Python 用官方扩展配 Ruff，环境优先交给 `uv` 和项目内的 `.venv`；
- Rust 用 `rust-analyzer` 配 `CodeLLDB`；
- Flutter 扩展会自动带上 Dart，列表里不再重复声明。

仓库里不写死任何本机的 JDK、SDK 或字体路径，也不把 `node_modules`、`target`、`dist`、`.venv` 放进文件监听和全局搜索里。主题用的是 Vitesse Dark Soft，搭配 JetBrains Mono 字体、Catppuccin Mocha 图标和 JetBrains 快捷键。

## 为什么不用 Settings Sync 就够了

Settings Sync 适合在自己的几台电脑之间同步状态，但 Git 仓库能留下每次改动的记录，也方便别人只挑走有用的几行。

仓库里剔除了所有密钥、SSH 主机、本机路径和缓存，只保留三样东西：脱敏后的 `settings.json`、精选扩展列表，以及 Windows 和 macOS 的一键安装脚本。

## 安装方式

克隆仓库后，可以按平台运行安装脚本：

```bash
git clone https://github.com/Sanjeever/vscode-settings.git
cd vscode-settings
```

Windows（PowerShell 7）：

```powershell
pwsh -File .\scripts\install.ps1
```

macOS（需先在命令面板执行 `Shell Command: Install 'code' command in PATH`）：

```bash
bash ./scripts/install.sh
```

脚本会先将你现有的设置备份为带时间戳的文件，再写入新配置并安装扩展。如果你手里已经有维护多年的 `settings.json`，直接翻看仓库里的 `.vscode/settings.json`，挑几条合用的抄过去会更稳妥。
