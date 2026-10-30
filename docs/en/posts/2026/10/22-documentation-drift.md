---
title: When Code Changes, What Happens to the Docs?
date: 2026-10-22
tags:
  - AI
  - Software Engineering
  - Vibe Coding
description: When code moves forward while old docs stay behind, stale examples quietly feed bugs into a coding agent’s next implementation.
outline: deep
aside: true
---

# When Code Changes, What Happens to the Docs?

<!-- DESC SEP -->

When code moves forward while old docs stay behind, stale examples quietly feed bugs into a coding agent’s next implementation.

<!-- DESC SEP -->

Suppose a report endpoint originally streamed a file directly back to the caller. Six months later, as data volume grows tenfold, exports move to a background job: the endpoint now returns a `taskId` first, and the caller polls until the file is ready to download.

The code is merged and deployed, but the README and integration snippet still show the old synchronous call. In the next session, a coding agent reads that outdated example to build a new page—and dutifully saves the JSON `taskId` response to disk as an `.xlsx` file.

That gap between evolving code and frozen prose is **documentation drift**. When humans and AI agents share a repository, stale docs are more than an eyesore: they enter the next context window and actively seed new bugs.

## Are the Docs Stale, or Is the Code Wrong?

When documentation and code disagree, the reflex is to update the docs to match the code. Before doing that, it pays to pause and ask: did the design legitimately change, or did the implementation cut a corner?

Continuing the example from [Intent and Code](/en/posts/2026/10/21-intent-spec-impl): if the team deliberately moved exports to background jobs, updating the integration guide is the right call. But if the spec required exporting *all* matching rows and the code accidentally exported only the first page, rewriting the docs to say “exports the current page only” canonizes a bug as a feature.

As [jyy notes in *The Origins of Software Engineering*](https://jyywiki.cn/GSE/2026/lect5.md), **code tells you what the system does today, while agreed specifications tell you whether that behavior is right**. Check code and tests to verify response shapes; check requirements and commit history to verify whether a promise still holds.

## Record the Decision and the Reason Behind It

Docs that only describe *how* the code works go stale fast; docs that record *why* a choice was made stay useful for years.

A single sentence beside the export docs—“Switched to async jobs because synchronous exports timed out past 100k rows; must still include all filtered rows”—captures both the constraint and the invariant (the core idea behind [jyy’s *Requirements and Architecture (1)*](https://jyywiki.cn/GSE/2026/lect6.md) and Michael Nygard’s [Architecture Decision Records](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions)).

Six months later, anyone reading that line can tell which part is an implementation mechanism (`async jobs`) and which part is a non-negotiable promise (`all filtered rows`). Line-by-line descriptions of internal helper calls, on the other hand, can be deleted—the code already speaks for itself.

## Keep Fewer Copies to Synchronize by Hand

If the same API response schema is copied into `README.md`, `docs/api.md`, an example file, and `AGENTS.md`, every future change is an invitation to miss one of the four.

Borrowing the rule from [*Requirements and Architecture (2)*](https://jyywiki.cn/GSE/2026/lect7.md): store a volatile fact in one place and link or derive it everywhere else.

- **Clear division of labor**: Let `README.md` cover getting started, `docs/` hold contracts and design rationale, and `AGENTS.md` define working rules and pointers.
- **Executable examples**: When integration snippets are tested alongside the code, a breaking API change fails the check immediately instead of waiting to mislead the next reader.

## Fold Doc Updates into the Same Atomic Change

Whenever a change alters external behavior, follow the [traceability trail](https://jyywiki.cn/GSE/2026/lect4.md) with `rg` before wrapping up:

```bash
rg -n 'exportReport|/api/reports/export|returns the file directly|synchronous export' .
```

Updating the code, tests, and affected documentation in a single [atomic change](https://jyywiki.cn/GSE/2026/lect3.md) is far less painful than staging a massive documentation cleanup twice a year.

A few lines in `AGENTS.md` are enough to make that habit stick:

```text
Documentation Consistency
- When changing behavior, interfaces, or configuration, use rg to find and update affected docs, examples, and comments.
- If implementation and agreed requirements conflict, check the context of the requirement instead of documenting a bug as expected behavior.
- Record the rationale behind key decisions and avoid duplicating volatile facts across multiple files.
```

The next session does not need a transcript of every conversation we had today—just a clean entry point, the constraints that still hold, and the reasons we chose them.

::: details Prompt: Handing a Documentation Audit to a Coding Agent

```md
Please review and clean up this project's documentation (README, docs, AGENTS.md, comments, and examples):

1. Verify factual claims against the current code, configuration, and tests, fixing stale, duplicated, or contradictory descriptions.
2. Distinguish intentional design evolution from implementation bugs; if code and requirements conflict, surface the discrepancy rather than rewriting the docs to excuse a bug.
3. Preserve the rationale and assumptions behind important architectural decisions while removing redundant prose that merely narrates internal function calls.
4. Eliminate duplicate copies of volatile facts by linking to a single source of truth.
5. Add a concise documentation-hygiene rule to AGENTS.md so future behavior or interface changes update affected docs in the same pass.
```

:::
