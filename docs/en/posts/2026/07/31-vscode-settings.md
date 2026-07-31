---
title: I Open-Sourced My VS Code Setup
date: 2026-07-31
tags:
  - Open Source
  - VS Code
  - Developer Tools
  - AI Coding
description: I open-sourced a lightweight VS Code setup for AI-assisted development and code review, with Codex doing most of the coding and the editor focused on diffs, implementation review, and small edits.
outline: deep
aside: true
---

# I Open-Sourced My VS Code Setup

<!-- DESC SEP -->

I open-sourced a lightweight VS Code setup for AI-assisted development and code review, with Codex doing most of the coding and the editor focused on diffs, implementation review, and small edits.

<!-- DESC SEP -->

## When the Editor No Longer Does Most of the Coding

I used to configure my editor around faster completion, generation, and saving. My workflow has since changed: Codex now handles most implementation work, while I use VS Code to read diffs, trace calls, and make small finishing edits.

That change in roles makes some convenient defaults counterproductive. I may open a file only to inspect it, then have auto-save or format-on-save modify it. Hiding whitespace changes can make the diff on screen differ from what Git will actually record. Multiple AI entry points inside the editor add another layer of distraction without improving the review.

That is why I collected and published this setup:

- **GitHub repository**: [Sanjeever/vscode-settings](https://github.com/Sanjeever/vscode-settings)

It is not an everything-included extension pack. It is a readable, reviewable, and reusable snapshot of how I work today.

## Keeping Control During Code Review

The most important choices in this setup are not the theme or font. They are the settings that stop the editor from changing the workspace on my behalf while I am reviewing it.

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

I disable VS Code's built-in AI features because the main coding loop already happens in Codex. I do not need a parallel chat surface in the editor. Auto-save and format-on-save are off as well. Formatting is still available as an explicit action, but reviewing and saving a file should not create unrelated diff noise.

The diff editor wraps long lines and does not ignore changes to leading or trailing whitespace. The first makes changes easier to read; the second keeps the visible diff closer to what Git will record. Disabling automatic Git fetching also turns remote updates into a deliberate action instead of a background state change.

I still keep the minimap, inlay hints, and sticky scroll. Code review is more than staring at red and green patches: I also need the file structure, type information, and current scope. Those features remain useful when the editor is primarily a reading environment.

## Enough Language Support, Without Duplicate Extensions

The setup covers the stacks I regularly use: Java, Maven, Spring Boot, Vue, React, Node.js, JavaScript, TypeScript, Go, Python, Rust, Dart, and Flutter.

When choosing extensions, I distinguish between tools I selected directly and capabilities already supplied by VS Code or another extension. For example:

- React, Node.js, JavaScript, and TypeScript use VS Code's built-in language services.
- Python uses the official extension and its Pylance, Debugger, and Environments dependencies, while Ruff handles diagnostics and formatting.
- Python Environments discovers a project's `.venv` and prefers uv for environment and package management when uv is available.
- Rust uses rust-analyzer, with CodeLLDB for debugging.
- The Flutter extension installs Dart as a dependency, so Dart is not repeated in the recommendation list.

The repository does not hard-code local paths for JDKs, Maven, Rust, Flutter SDKs, terminals, or fonts. Language tools are discovered through project configuration, environment variables, or `PATH`. Project-specific formatting and linting rules belong in files such as `pyproject.toml` and `Cargo.toml`, not in a global editor setup.

Common generated directories and caches are excluded from file watching or search, including `node_modules`, `target`, `dist`, `build`, `.venv`, and several Python tool caches. They remain part of the project; they simply stop crowding everyday search results or triggering unnecessary background scans.

For appearance, I use Vitesse Dark Soft, JetBrains Mono, Catppuccin Mocha file icons, Carbon product icons, and JetBrains keybindings. Goto Alias, File Nesting Updater, Smart Clicks, and Where Am I cover smaller daily needs around definition navigation, file nesting, text selection, and project identification.

## Why a Git Repository Instead of Settings Sync Alone

Settings Sync works well for keeping my own machines aligned. A public repository solves a different problem: it gives me a history I can review and lets other people take only the parts that are useful to them.

I did not copy the entire VS Code user directory into Git. The repository excludes API keys, tokens, SSH hosts, local proxies, absolute paths, `argv.json`, `globalStorage`, `workspaceStorage`, and extension caches. It contains only three categories of files:

1. A public-safe `settings.json`.
2. A recommendation list of extensions I chose directly.
3. Installation scripts for Windows and macOS.

The two approaches therefore have separate jobs. Settings Sync continues to handle day-to-day synchronization between personal devices; this repository publishes a reviewed snapshot that is safe to inspect in public.

## Installation and Boundaries

Start by cloning the repository:

```bash
git clone https://github.com/Sanjeever/vscode-settings.git
cd vscode-settings
```

On Windows, use PowerShell 7:

```powershell
pwsh -File .\scripts\install.ps1
```

On macOS, first run `Shell Command: Install 'code' command in PATH` from the VS Code Command Palette, then execute:

```bash
bash ./scripts/install.sh
```

Both scripts back up the existing user settings to a timestamped file, **replace** `settings.json` in full, and then install the recommended extensions. They do not replace `keybindings.json`, `argv.json`, SSH configuration, or other user data, although the recommendation list does include the JetBrains keybindings extension.

If you already maintain a long-lived setup, the safest approach is not to run the installer immediately. Read `.vscode/settings.json` and `.vscode/extensions.json` first, then copy the parts that fit your workflow. The automated installers currently cover Windows and macOS only; Linux users need to copy the settings and install extensions manually.

This setup is not meant to be a universal answer. It serves a specific workflow: an agent produces most changes, and a person uses the editor to understand and review the result. With a different workflow, auto-save, formatting, AI surfaces, and extension choices may all deserve different defaults.

I published it not because everyone should end up with the same VS Code, but because a good configuration should be a clear starting point: you should know why each switch exists, and which parts should never be made public.
