---
title: I Open-Sourced My VS Code Setup
date: 2026-07-31
tags:
  - Open Source
  - VS Code
  - Developer Tools
  - AI Coding
description: I open-sourced a lightweight VS Code setup tailored for reading diffs, tracing call chains, and making small edits alongside Codex.
outline: deep
aside: true
---

# I Open-Sourced My VS Code Setup

<!-- DESC SEP -->

I open-sourced a lightweight VS Code setup tailored for reading diffs, tracing call chains, and making small edits alongside Codex.

<!-- DESC SEP -->

## When the Editor Steps Back from Writing Most of the Code

I used to tune my editor around writing code faster—autocompletion, snippets, and format-on-save. Lately my daily loop looks different: Codex writes the bulk of the implementation, while I open VS Code to read diffs, trace call chains, and make small finishing touches.

Once the editor’s job shifts from drafting to reviewing, old conveniences start getting in the way. Type a quick test character while reading and auto-save writes it straight to disk; save a file and format-on-save rewrites twenty unrelated lines. Hide whitespace changes in the diff view, or crowd the sidebar with extra AI chat panels, and it becomes harder to see what actually changed.

So I cleaned up my current configuration and published it on GitHub:

- **GitHub Repository**: [Sanjeever/vscode-settings](https://github.com/Sanjeever/vscode-settings)

## Keeping the Workspace Still During Review

The most important settings here are not the theme or font, but the switches that stop the editor from mutating files behind my back:

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

Because my main coding loop lives in Codex, VS Code’s built-in AI features are turned off. Auto-save and format-on-save are off too—I can still format explicitly whenever I want, without turning a quick file inspection into accidental diff noise.

The diff editor wraps long lines and shows leading and trailing whitespace changes so the screen matches what Git records. Meanwhile, the minimap, inlay hints, and sticky scroll stay on; reading code takes more than staring at red and green lines, and seeing types and enclosing scopes at a glance helps.

## Language Support Without Redundancy

The setup covers the stacks I work with regularly: Java, Spring Boot, Vue, React, TypeScript, Go, Python, Rust, and Flutter.

Extensions are kept lean:

- JavaScript and TypeScript rely on VS Code’s built-in language service.
- Python pairs the official extension with Ruff, delegating virtual environments and packages to `.venv` and `uv`.
- Rust uses `rust-analyzer` and `CodeLLDB`.
- Flutter pulls in Dart automatically, so Dart isn’t listed twice.

No machine-specific SDK paths or fonts are hardcoded, and build or cache folders (`node_modules`, `target`, `dist`, `.venv`) are excluded from search and file watching. Visually, it runs Vitesse Dark Soft with JetBrains Mono, Catppuccin Mocha file icons, and JetBrains keybindings.

## Why a Git Repo Alongside Settings Sync

Settings Sync is great for keeping my own machines identical, while a Git repository leaves a clean commit history and lets others grab individual settings without adopting the whole bundle.

Secrets, SSH hosts, local paths, and caches are stripped out. The repo holds just three things: a clean `settings.json`, the curated extension list, and install scripts for Windows and macOS.

## Installing

Clone the repository and run the script for your platform:

```bash
git clone https://github.com/Sanjeever/vscode-settings.git
cd vscode-settings
```

On Windows (PowerShell 7):

```powershell
pwsh -File .\scripts\install.ps1
```

On macOS (after running `Shell Command: Install 'code' command in PATH` from the Command Palette):

```bash
bash ./scripts/install.sh
```

Both scripts back up your existing `settings.json` with a timestamp before replacing it and installing the extensions. If you already have a long-lived config of your own, browsing `.vscode/settings.json` and copying over the lines you like is the gentler route.
