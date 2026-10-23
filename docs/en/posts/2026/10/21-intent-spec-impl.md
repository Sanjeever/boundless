---
title: Intent and Code
date: 2026-10-21
tags:
  - AI
  - Software Engineering
  - Vibe Coding
description: A report export illustrates Intent, Spec, and Impl, the gaps between goals, specifications, and implementations, and how to make requirements and acceptance criteria clear.
outline: deep
aside: true
---

# Intent and Code

<!-- DESC SEP -->

AI can speed up implementation. Turning an idea into useful software still takes alignment between goals, requirements, and acceptance criteria. A report export offers a way to understand Intent, Spec, and Impl.

<!-- DESC SEP -->

Suppose I ask AI to add an export feature to a report.

The button appears quickly, and clicking it downloads a file. But the file contains only the current page of data. I need to reconcile sales totals at the end of the month, which requires every row matching the filters, including the later pages.

The program runs and the feature looks plausible, yet the result falls short. Three concepts help explain the mismatch: Intent, Spec, and Impl.

**[Intent](https://dictionary.cambridge.org/dictionary/english/intent)** describes the goal we want to reach or the problem we want to solve. Here, the goal is to reconcile monthly sales with less manual work; exporting a file is one way to get there.

**Spec**, short for [Specification](https://dictionary.cambridge.org/dictionary/english/specification), turns the goal into behavior and constraints we can check: export every row matching the current filters, keep monetary amounts to two decimal places, and make the total agree with the report. Without a clear data scope and monetary rules, “export succeeded” can mean different things.

**Impl** stands for [Implementation](https://dictionary.cambridge.org/us/dictionary/english/implementation): the code, configuration, and processing that fulfill the specification. Here, it means reusing the filtered query, handling pagination, generating a file, and making it available for download. Different implementations can satisfy the same specification. Acceptance checks whether the agreed behavior holds.

Following the development process gives us `Intent → Spec → Impl`. A goal becomes explicit requirements, then a working program.

[jyy's Generative Software Engineering lecture notes](https://jyywiki.cn/GSE/2026/lect1.md) discuss the gaps between these three layers. Each arrow involves choices, and each can introduce a mismatch.

Moving from Intent to Spec means translating a goal into requirements. If “make sales reconciliation easier” becomes “download a file,” the specification may leave out the data scope and aggregation rules. The code could satisfy every stated requirement while the user still has to move between pages and combine the results manually.

Moving from Spec to Impl means turning requirements into an executable program. If the specification already says “all rows,” but the code retains the list endpoint's default pagination, the mismatch is in the implementation.

These problems call for different fixes. The first requires revising or extending the specification. The second requires changing the implementation. When a result falls short, identifying where the mismatch occurred is usually more useful than asking AI to “try again.”

In vibe coding, AI can fill in gaps quickly. Leave out the data scope, and it may keep pagination. Say nothing about monetary precision, and it may choose for us. Each choice can look reasonable while the combined result drifts away from the goal.

That makes a little more context worthwhile when handing AI a task.

Start with the use case. “I need to reconcile monthly sales without copying data page by page.” Then ask AI to outline the key behavior, constraints, and acceptance examples, and identify which decisions need clarification or an experiment. Agree on the important tradeoffs before implementation.

[GitHub's introduction to Spec Kit](https://github.blog/ai-and-ml/generative-ai/spec-driven-development-with-ai-get-started-with-a-new-open-source-toolkit/) emphasizes that specifications should keep guiding planning, implementation, and verification as the project evolves. The same idea applies to small tasks. Write down the requirements and how to check them, and keep that record as a reference for later changes.

A specification can develop gradually. When an interaction is uncertain, build a small prototype. Update the requirements when trying it reveals an omission. AI can help clarify intent, draft specifications, and run checks. People still need to confirm the important tradeoffs and judge whether the result is useful.

Acceptance needs to look in both directions. We can check whether the file contains every row. Whether that file makes sales reconciliation straightforward requires trying it in the actual workflow. Passing tests means passing the current checks, which may themselves leave requirements uncovered.

Before giving a coding agent its next task, ask three questions.

> What problem am I trying to solve?
> What would count as complete?
> What evidence would confirm it?
