---
title: How Codex and Claude Code Edit Files
date: 2026-06-01
tags:
  - Essay
  - AI
  - Programming
  - Tools
description: Claude Code uses Edit/Write for precise string replacement, while Codex uses apply_patch to express patch diffs — two file-editing philosophies and the engineering orientations and editing disciplines behind them.
outline: deep
aside: true
---

# How Codex and Claude Code Edit Files

<!-- DESC SEP -->

After AI coding assistants truly entered everyday development, an easily overlooked but critical question emerges: how exactly do they edit files?

<!-- DESC SEP -->

On the surface, both Claude Code and Codex can "read code, modify code, run commands, fix problems." But if you look closely at how they edit files, you'll find the underlying operational models are not the same. Codex behaves more like a developer familiar with Git diffs, describing changes through patches; Claude Code behaves more like a cautious text editor, performing precise string replacements or full-file writes after reading the file.

This difference not only affects tool invocation patterns, but also the controllability of changes, the clarity of diffs, the troubleshooting path when things go wrong, and the trust developers place in AI modifications.

## Codex: Patch-Oriented Editing Centered on apply_patch

When Codex edits files, the core tool is `apply_patch`. It receives patch text resembling a unified diff, used to add, delete, update, or move files.

A typical structure looks like:

```text
*** Begin Patch
*** Update File: path/to/file.ext
@@
-old content
+new content
*** End Patch
```

The defining characteristic of this approach is that changes are inherently "diff-centric." Codex doesn't simply say "replace this string with that string" — it uses a patch to express "here's what changed." This makes it particularly well-suited for small to medium-scale precise modifications, such as refactoring a function, adding a test, adjusting a configuration, or creating a new file.

From a developer's perspective, the advantage of `apply_patch` is that it closely aligns with the mental model of Git diffs. The before and after content is presented side by side — which lines were deleted, which were added, all visible at a glance. This form naturally encourages "minimal diffs": only change what's relevant to the task, no unrelated formatting, no sweeping refactors.

That said, patch-based editing also has its own requirements. A patch must contain enough context; otherwise it may fail to match the target location or create ambiguity in files with many similar code blocks. If the file contains Chinese characters, tabs, special indentation, or invisible characters, the patch may also fail due to imperfect context matching. In such cases, Codex typically re-locates content via shell commands first, then generates a more precise patch.

Thus, Codex's common workflow is: first understand the project structure and code context using shell commands like `rg`, `rg --files`, `Get-Content`, `Get-ChildItem`, then apply precise modifications with `apply_patch`, and optionally run formatting, tests, or service commands to verify the result.

This workflow closely resembles a command-line developer's daily routine: search first, then read, then patch, then verify.

## Claude Code: A Text-Editing Model Centered on Edit and Write

Claude Code's file-editing approach draws a clearer distinction between two kinds of operations: partial modification and complete writing.

It primarily uses two tools: `Edit` and `Write`.

`Edit` performs precise string replacement. It requires a file path, the original string, and the new string. The most important rule here is: before calling `Edit`, you must have `Read` the file first; and `old_string` must match the file content exactly — including indentation, whitespace, and line endings.

This means Claude Code's partial editing is not based on "patch hunks" but on "exact text matching." It reads the file first, confirms the original text, then replaces one complete block of old text with a block of new text.

The advantage of this approach is that it's intuitive, strict, and controllable. As long as `old_string` is unique, the replacement behavior is unambiguous. It also naturally encourages the AI to look at the original file before modifying, rather than acting from memory or guesswork.

But the constraints are equally apparent: the original string must match exactly. If the file contains multiple identical fragments, you need to ensure uniqueness or explicitly use `replace_all`. If indentation, line endings, tabs, or special characters aren't handled properly, the replacement will fail. For complex files, Claude Code may need `cat -A`, PowerShell scripts, or other commands to verify invisible characters and precise formatting.

`Write`, on the other hand, is used for creating new files or completely overwriting existing ones. Creating a new file is straightforward; but to overwrite an existing file, you must also read the original content first. This reflects a core principle of Claude Code: read before you write.

From a tool-selection standpoint, Claude Code's logic is very clear: modify a few lines with `Edit`, create new files with `Write`, and rewrite an entire file also with `Write` — but only after `Read`. For replacing multiple identical strings, use `Edit` with `replace_all`.

## The Fundamental Differences

Codex's `apply_patch` leans toward a "patch mindset." It describes change fragments within a file, emphasizing the difference before and after modification. Claude Code's `Edit` / `Write` leans toward a "text editor mindset." It emphasizes reading the file first, then modifying specific strings or the entire content.

This leads to several notable differences.

First, Codex's modifications are more like Git diffs. The output is naturally suited for review — developers can directly see added and deleted lines. Claude Code's modifications are more like editor operations, focused on "replace this exact block of text with that block of text."

Second, Claude Code imposes a stronger "read before modify" requirement. Both `Edit` and overwrite-mode `Write` demand reading the file first. This reduces the risk of blind modifications and makes the editing process more dependent on the current file's real content.

Third, Codex feels natural when handling multi-file, small-scope changes. A single patch can update multiple files simultaneously and also add, delete, or move files. Claude Code can handle multiple files too, but its mental model leans more toward reading files one by one and replacing text position by position.

Fourth, the failure modes differ. Codex's patches may fail due to insufficient context or context drift; Claude Code's `Edit` may fail because `old_string` isn't unique or doesn't match exactly. Both rely on precise context — they just express that context differently.

## Which Approach Is Better?

There's no absolute answer to this question; it depends more on the type of task.

For small to medium-scale code changes, especially scenarios requiring clear diffs, Codex's `apply_patch` has a strong advantage. It naturally aligns with code review workflows and is well-suited for localized function modifications, test additions, configuration adjustments, and small cross-file changes.

For scenarios that heavily emphasize "read the original first, then replace precisely," Claude Code's `Edit` feels more solid. It mandates reading the file and requires exact old-text matching, which makes modification behavior more conservative and helps avoid erroneous changes.

For creating new files, both handle it well. Codex can express file creation via `Add File`; Claude Code can create files directly with `Write`.

For rewriting an entire file, Claude Code's `Write` is more direct but also demands more caution, since a full-file overwrite can easily produce a large diff. Codex can also perform large-scale modifications through patches, but readability declines when patches grow too big.

## Common Ground: What Really Matters Is Editing Discipline

Although their tool models differ, Claude Code and Codex share many principles when it comes to editing.

Both emphasize understanding context before modifying files. Both lean toward minimal diffs — no unsolicited refactoring, no arbitrary reformatting of unrelated code. Both should avoid destructive commands, such as executing `git reset --hard` or rolling back the user's existing changes without explicit authorization. Both must respect the user's in-progress work in the workspace, treating existing modifications as the user's assets rather than disposable temporary state.

This points to an important insight: the reliability of an AI coding assistant depends not only on model capability, but also on its editing discipline.

A good AI coding assistant shouldn't just be able to "get the code right" — it should also let the developer clearly see what was changed, why, whether it crossed any boundaries, and whether it preserved the user's existing work.

## Closing Thoughts

Claude Code and Codex's file-editing approaches represent two different engineering orientations.

Codex expresses modifications as patches through `apply_patch`, closer to Git diffs and the command-line developer's way of working. Claude Code decomposes modifications into precise replacements and full-file writes through `Edit` and `Write`, closer to a strict text-editor model.

The former emphasizes diff expression; the latter emphasizes precise matching after reading. The former suits patch-style, multi-file small-step modifications; the latter suits conservative, explicit, controllable text replacement.

But regardless of the approach, what truly determines the experience is not the tool's name, but the principles behind it: read before you write, minimal changes, avoid unrelated formatting, respect user modifications, and execute commands with care.

When evaluating an AI coding assistant, perhaps we should ask less often "can it modify code?" and more often "how does it modify code?" The latter often reveals more about whether it truly belongs in a real engineering workflow.
