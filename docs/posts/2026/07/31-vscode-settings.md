---
title: 我开源了我的 VS Code 配置
date: 2026-07-31
tags:
  - 开源
  - VS Code
  - 开发工具
  - AI 编程
description: 我开源了一套面向 AI 辅助开发和代码审查的轻量 VS Code 配置，让 Codex 负责主要编码，让编辑器回归阅读 diff、审查实现和少量修改。
outline: deep
aside: true
---

# 我开源了我的 VS Code 配置

<!-- DESC SEP -->

我开源了一套面向 AI 辅助开发和代码审查的轻量 VS Code 配置：让 Codex 负责主要编码，让编辑器回归阅读 diff、审查实现和少量修改。

<!-- DESC SEP -->

## 当编辑器不再负责大部分编码

以前配置编辑器，我关心的是怎样更快地补全、生成和保存代码。现在我的主要工作流变了：大部分实现交给 Codex，我在 VS Code 里阅读 diff、检查调用链，并做少量收尾修改。

角色变化之后，一些原本方便的默认行为反而会制造摩擦。打开文件只是想看一眼，自动保存或保存时格式化却顺手改了它；审查 diff 时忽略了空白差异，真正提交的内容就可能和眼前看到的不一样；编辑器里同时出现几套 AI 入口，也只是在争夺注意力。

所以我整理并开源了这套配置：

- **GitHub 仓库**：[Sanjeever/vscode-settings](https://github.com/Sanjeever/vscode-settings)

它不是一套“装得越多越好”的全家桶，而是我当前工作方式的一份可读、可审查、可复用的公开快照。

## 为代码审查保留控制权

这套配置最重要的选择不是主题或字体，而是尽量避免编辑器在审查期间替我修改工作区。

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

我关闭了 VS Code 内置的 AI 功能，因为主要编码已经在 Codex 中完成，编辑器无需再提供一套平行的对话入口。自动保存和保存时格式化也默认关闭：需要格式化时仍然可以主动执行，但一次代码审查不应该因为打开并保存文件，平白多出一批无关 diff。

diff 编辑器开启自动换行，并且不忽略行首或行尾的空白变化。前者让长行更容易阅读，后者确保我看到的差异更接近 Git 真正记录的内容。关闭 Git 自动抓取则减少后台状态变化，让更新远端信息成为一个明确动作。

另一方面，minimap、inlay hints 和 sticky scroll 仍然保留。审查并不只是盯着红绿两色的补丁，还需要理解文件结构、类型信息和当前所处的作用域。这些功能对阅读代码依然有用。

## 语言能力够用，但不重复安装

配置覆盖了我常用的技术栈：Java、Maven、Spring Boot、Vue、React、Node.js、JavaScript、TypeScript、Go、Python、Rust、Dart 和 Flutter。

选择扩展时，我尽量区分“主动选择的工具”和“已经由 VS Code 或其他扩展提供的能力”。例如：

- React、Node.js、JavaScript 和 TypeScript 使用 VS Code 内置语言服务；
- Python 使用官方扩展及其附带的 Pylance、Debugger 和 Environments，Ruff 负责诊断与格式化；
- Python Environments 自动发现项目中的 `.venv`，有 uv 时优先用 uv 管理环境和安装包；
- Rust 使用 rust-analyzer，调试交给 CodeLLDB；
- Flutter 扩展会自动安装 Dart，因此推荐列表不再重复列出 Dart。

仓库没有预设 JDK、Maven、Rust、Flutter SDK、终端或字体的本机路径。语言工具通过项目配置、环境变量或 `PATH` 查找，项目自己的格式化与检查规则也应留在 `pyproject.toml`、`Cargo.toml` 等项目文件中，而不是塞进一份全局编辑器配置。

常见的生成目录和缓存也从文件监视或搜索中排除，包括 `node_modules`、`target`、`dist`、`build`、`.venv` 和各类 Python 工具缓存。它们仍然存在于项目中，只是不再占据日常搜索结果或触发没有必要的后台扫描。

外观方面，我使用 Vitesse Dark Soft、JetBrains Mono、Catppuccin Mocha 文件图标、Carbon 产品图标和 JetBrains 快捷键。Goto Alias、File Nesting Updater、Smart Clicks 与 Where Am I 则分别补足定义跳转、文件嵌套、文本选择和项目识别这些日常细节。

## 为什么用 Git 仓库，而不只用 Settings Sync

Settings Sync 很适合在自己的设备之间同步状态，但公开仓库解决的是另一件事：它让我能够检查每次配置变化，也让其他人可以只取走其中有用的部分。

为了让仓库适合公开，我没有复制整个 VS Code 用户目录。API Key、Token、SSH 主机、本机代理、绝对路径、`argv.json`、`globalStorage`、`workspaceStorage` 和扩展缓存都不在其中。仓库只保留三类内容：

1. 可公开的 `settings.json`；
2. 主动选择的扩展推荐列表；
3. Windows 和 macOS 的安装脚本。

这也是 Settings Sync 与这个仓库的分工：前者继续服务个人设备间的日常同步，后者发布经过检查、能够公开审阅的配置快照。

## 安装与边界

先克隆仓库：

```bash
git clone https://github.com/Sanjeever/vscode-settings.git
cd vscode-settings
```

Windows 使用 PowerShell 7：

```powershell
pwsh -File .\scripts\install.ps1
```

macOS 需要先从 VS Code 命令面板执行 `Shell Command: Install 'code' command in PATH`，然后运行：

```bash
bash ./scripts/install.sh
```

两个脚本都会先把现有用户设置备份为带时间戳的文件，再用仓库中的配置**完整替换** `settings.json`，最后安装推荐扩展。它们不会替换 `keybindings.json`、`argv.json`、SSH 配置或其他用户数据，但推荐扩展中包含 JetBrains 快捷键扩展。

如果你已经有一套长期维护的配置，最稳妥的用法不是直接运行脚本，而是先阅读 `.vscode/settings.json` 和 `.vscode/extensions.json`，挑选适合自己的部分。当前自动安装脚本只覆盖 Windows 和 macOS；Linux 用户需要手动复制设置并安装扩展。

这套配置也不试图成为所有人的标准答案。它服务的是一种很具体的工作方式：Agent 负责产生主要改动，人在编辑器中理解和审查结果。工作流不同，自动保存、格式化、AI 入口乃至扩展选择都可能有完全不同的答案。

我把它开源，不是希望每个人得到一模一样的 VS Code，而是希望这份配置能成为一个足够清楚的起点：知道每个开关为什么存在，也知道哪些东西不应该被公开。
