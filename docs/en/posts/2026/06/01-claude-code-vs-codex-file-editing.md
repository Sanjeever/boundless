---
title: How Codex and Claude Code Edit Files
date: 2026-06-01
tags:
  - Essay
  - AI
  - Programming
  - Tools
description: Codex describes changes as patches while Claude Code replaces exact strings, and the two editing models trade off context matching and failure modes in distinct ways.
outline: deep
aside: true
---

# How Codex and Claude Code Edit Files

<!-- DESC SEP -->

Codex describes changes as patches while Claude Code replaces exact strings, and the two editing models trade off context matching and failure modes in distinct ways.

<!-- DESC SEP -->

From a distance, Claude Code and Codex do the same job: read code, make edits, and run commands. Look closely at the moment an edit hits the disk, though, and they take different paths—Codex speaks in patches, while Claude Code uses exact string replacement or full-file writes.

## Codex: Thinking in Patches

Codex centers its editing around `apply_patch`, which accepts a unified-diff-like patch to add, delete, update, or move files. OpenAI’s [Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) shows its standard shape:

```text
*** Begin Patch
*** Update File: path/to/file.ext
@@
-old content
+new content
*** End Patch
```

This format sits close to `git diff`. Deleted and added lines are visible right in the tool call, and small edits across several files—or a rename paired with a code change—fit naturally inside a single patch.

The trade-off is sensitivity to surrounding lines. Give it too little context in a file full of repetitive blocks, and the patch cannot tell which one to touch; mix tabs, non-ASCII text, or mismatched line endings, and the context check fails. When that happens, Codex usually drops back to `rg` or a file read to re-anchor itself before trying again.

## Claude Code: Thinking Like a Text Editor

Claude Code separates local edits from full writes with two tools: `Edit` and `Write`.

`Edit` performs exact string replacement: pass a file path, `old_string`, and `new_string`. As long as `old_string` appears once in the file and matches every space, tab, and newline, the swap happens cleanly. The [official tools reference](https://code.claude.com/docs/en/tools-reference#edit-tool-behavior) pairs this with read-before-edit checks.

The mental model is familiar—it works like Find and Replace in an editor, nudging the model to read the actual file before touching it rather than editing from memory.

Its strictness cuts both ways: miss one trailing space, or target a snippet that appears twice without setting `replace_all`, and the call fails immediately. Creating a new file or replacing an entire file belongs to `Write`.

## Where the Two Paths Diverge

Placed side by side, the two models differ in four practical ways:

1. **Readability at call time**: `apply_patch` reads like a code review diff; `Edit` reads like an editor command (“replace this block with that block”).
2. **Multi-file changes**: A single patch can thread small edits across several files at once, whereas `Edit` works file by file, site by site.
3. **Failure modes**: Patches fail when context is too thin or has drifted; `Edit` fails when `old_string` is not unique or whitespace is slightly off.
4. **Full rewrites**: `Write` makes overwriting a whole file effortless, which also makes it the easiest way to accidentally clobber existing work.

## Discipline Beyond the Tool

In the end, tool shape is only the first guardrail.

A patch can still rewrite half a file in one go, and an exact string match can still replace the wrong function if the model misunderstood the task.

What keeps a working tree clean is the habit behind the tool: read the surrounding code first, touch only the lines that matter, leave formatting alone, and inspect `git diff` when the dust settles.
