---
title: How Codex and Claude Code Edit Files
date: 2026-06-01
tags:
  - Essay
  - AI
  - Programming
  - Tools
description: How patches and exact text replacement locate edits, handle changes across files, and fail when context does not match.
outline: deep
aside: true
---

# How Codex and Claude Code Edit Files

<!-- DESC SEP -->

Codex describes edits as patches; Claude Code uses exact text replacement or whole-file writes. How these approaches locate text, fail, and leave reviewable changes deserves a closer look.

<!-- DESC SEP -->

On the surface, both Claude Code and Codex can “read code, modify code, run commands, fix problems.” In the tool shapes observed when this post was written, however, they express edits differently: Codex describes changes as patches, while Claude Code uses precise text replacement or whole-file writes. Clients evolve, so this is a discussion of two editing models—not a permanent promise about any version.

## Codex: Patch-Oriented Editing Centered on apply_patch

The Codex setup observed here uses `apply_patch`, which receives patch text resembling a unified diff to add, delete, update, or move files. OpenAI's [Codex Prompting Guide](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide) also provides the format and implementation examples for this tool.

A typical structure looks like:

```text
*** Begin Patch
*** Update File: path/to/file.ext
@@
-old content
+new content
*** End Patch
```

`apply_patch` resembles Git diff: deleted and added lines are explicit in the patch, making its scope easy to inspect. But a patch can also rewrite most of a file. The format cannot guarantee a minimal diff; unrelated formatting and refactoring still have to be caught in the final changes.

That said, patch-based editing also has its own requirements. A patch must contain enough context; otherwise it may fail to match the target location or create ambiguity in files with many similar code blocks. If the file contains Chinese characters, tabs, special indentation, or invisible characters, the patch may also fail due to imperfect context matching. In such cases, Codex typically re-locates content via shell commands first, then generates a more precise patch.

Thus, Codex's common workflow is: first understand the project structure and code context using shell commands like `rg`, `rg --files`, `Get-Content`, `Get-ChildItem`, then apply precise modifications with `apply_patch`, and optionally run formatting, tests, or service commands to verify the result.

## Claude Code: A Text-Editing Model Centered on Edit and Write

Claude Code's file-editing approach draws a clearer distinction between two kinds of operations: partial modification and complete writing.

It primarily uses two tools: `Edit` and `Write`.

`Edit` performs precise string replacement: it takes a file path, the original string, and the replacement. Read the file first and make `old_string` exactly match it, including indentation, spaces, and line breaks. The newer [official tools reference](https://code.claude.com/docs/en/tools-reference#edit-tool-behavior) distinguishes matching and uniqueness requirements from read-before-edit checks that vary by model version.

The advantage of this approach is that it's intuitive, strict, and controllable. As long as `old_string` is unique, the replacement behavior is unambiguous. It also naturally encourages the AI to look at the original file before modifying, rather than acting from memory or guesswork.

But the constraints are equally apparent: the original string must match exactly. If the file contains multiple identical fragments, you need to ensure uniqueness or explicitly use `replace_all`. If indentation, line endings, tabs, or special characters aren't handled properly, the replacement will fail. For complex files, Claude Code may need `cat -A`, PowerShell scripts, or other commands to verify invisible characters and precise formatting.

`Write`, on the other hand, is used for creating new files or completely overwriting existing ones. Creating a new file is straightforward; before overwriting an existing file, read it first, because whole-file writes are especially likely to create large diffs or overwrite user work.

## The Fundamental Differences

Codex's `apply_patch` leans toward a "patch mindset." It describes change fragments within a file, emphasizing the difference before and after modification. Claude Code's `Edit` / `Write` leans toward a "text editor mindset." It emphasizes reading the file first, then modifying specific strings or the entire content.

This leads to several notable differences.

First, Codex's modifications are more like Git diffs. The output is naturally suited for review — developers can directly see added and deleted lines. Claude Code's modifications are more like editor operations, focused on "replace this exact block of text with that block of text."

Second, `Edit` takes the old text as an explicit parameter, so its caller needs the exact content. Patches need reliable context too. Tool constraints can help enforce reading before editing, but they cannot replace that discipline.

Third, Codex feels natural when handling multi-file, small-scope changes. A single patch can update multiple files simultaneously and also add, delete, or move files. Claude Code can handle multiple files too, but its mental model leans more toward reading files one by one and replacing text position by position.

Fourth, the failure modes differ. Codex's patches may fail due to insufficient context or context drift; Claude Code's `Edit` may fail because `old_string` isn't unique or doesn't match exactly. Both rely on precise context — they just express that context differently.

## Which Approach Is Better?

There's no absolute answer to this question; it depends more on the type of task.

For small additions and deletions across several files, `apply_patch` can express the entire change in one patch, making the combined scope visible at invocation.

For replacing a unique block of text, `Edit` has straightforward inputs. It fails when the original text does not match, but strict matching alone does not establish a lower overall error rate. Neither tool can decide whether the chosen target or the understanding of the requirement is correct.

For creating new files, both handle it well. Codex can express file creation via `Add File`; Claude Code can create files directly with `Write`.

For rewriting an entire file, Claude Code's `Write` is more direct but also demands more caution, since a full-file overwrite can easily produce a large diff. Codex can also perform large-scale modifications through patches, but readability declines when patches grow too big.

## Common Ground: What Really Matters Is Editing Discipline

Although their tool models differ, Claude Code and Codex share many principles when it comes to editing.

Whether or not a tool enforces it, both should follow the same editing discipline: understand context first, make the smallest relevant change, avoid unrelated refactors or formatting, never run destructive commands such as `git reset --hard` without explicit authorization, and treat existing worktree changes as user assets rather than temporary content to overwrite.

The diff on disk still needs review. Patch input and replacement arguments show what a tool was asked to change; they do not establish that it targeted the right location, preserved existing work, or met the requirement.
