---
title: When Code Changes, What Happens to the Docs?
date: 2026-10-22
tags:
  - AI
  - Software Engineering
  - Vibe Coding
description: Outdated documentation can carry errors into the next implementation. Maintaining it means identifying which constraints still hold and tracing changes to the descriptions they affect.
outline: deep
aside: true
---

# When Code Changes, What Happens to the Docs?

<!-- DESC SEP -->

The code has changed, but old instructions can still shape a coding agent's next implementation. When maintaining project documentation, I care most about deciding which descriptions have become outdated and which constraints should still hold.

<!-- DESC SEP -->

Suppose a report endpoint originally returned a file directly. As data volume grows, exports move to background tasks: return a task ID first, then download the file once it is ready. The code has changed, but the README and integration example still describe the old behavior. In the next session, a coding agent follows that example to build another page and could save the task ID as a “report file.”

This growing separation between evolving code and existing descriptions is **documentation drift**. Old instructions enter a new session's context and influence the next implementation, giving errors a path to spread.

## Are the docs wrong, or is the implementation?

“Keep the docs consistent with the code” still requires judgment. If the move to background tasks is an agreed change, the old integration instructions need updating. But if the specification requires all matching rows and the code exports only the current page, changing the docs to say “exports the current page” could turn a bug into a new requirement.

In [Intent and Code](/en/posts/2026/10/21-intent-spec-impl), I discussed `Intent → Spec → Impl`. The specification states requirements; the implementation provides concrete behavior. When they disagree, we need to establish which decisions have changed and which promises still apply.

**Code tells us what is implemented now; established constraints help us judge whether that implementation is correct.** I choose evidence according to the question: inspect the implementation and relevant tests to check the actual response; trace the agreed specification and subsequent changes to judge whether the export includes the right rows. Tests and schemas also need scrutiny of what they actually check. They cannot establish that the requirements themselves are correct.

In [The Origins of Software Engineering](https://jyywiki.cn/GSE/2026/lect5.md), jyy distinguishes concrete behavior from the requirements that behavior must satisfy, and reminds us to preserve what remains undecided. Here, that means separating choices an agent fills in to complete an implementation from requirements that have been agreed. If the repository cannot resolve an important disagreement, preserve the evidence and take it to someone with the authority to decide.

## Keep the decision and the conditions behind it

Knowing what was chosen is not enough to judge whether a constraint still applies.

Consider the export again. Writing “use background tasks” tells the next developer what the current approach is. Recording the growing data volume, excessive synchronous request times, and continuing requirement to export all matching rows explains why the approach was chosen and which requirements remain. If synchronous processing later becomes fast enough, there is a basis for reconsidering the decision.

[Requirements and Architecture (1)](https://jyywiki.cn/GSE/2026/lect6.md) discusses how a current result can compress facts, rules, and approval processes. Keep only the result, and its origins become hard to explain. Documentation has a similar problem: once the reason for moving exports to background tasks is deleted, even an accurate account of the current code cannot recover that reasoning.

Michael Nygard's [architecture decision records, or ADRs](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), preserve the context, status, and consequences of important decisions. When a decision is superseded, keep its record and identify the replacement. A project may not need a dedicated ADR directory, but its decisions and the conditions behind them should be findable.

This also sets a boundary for simplifying docs. Internal call sequences can be left to the code when describing them adds no explanatory value. The constraints a choice addresses and the tradeoffs it makes deserve a record. Otherwise, the next change begins with another round of guesswork.

## Reduce what needs manual synchronization

Useful knowledge also has a maintenance cost. Repeat the same API response type in the README, reference docs, integration example, and AGENTS.md, and each copy becomes another place to miss during a change.

[Requirements and Architecture (2)](https://jyywiki.cn/GSE/2026/lect7.md) offers a useful idea: preserve facts and rules, then compute the results that can be derived from them. Maintenance can then focus on whether the computation and its dependencies are correct, reducing the need to synchronize multiple copies of state.

Applied to documentation, I would first look for repeated information with a clear source. If task statuses and response fields already have a shared definition, reference material can be generated from it. If integration examples are executable, they can be included in API checks to catch an example that still saves the response as a file.

But a generated parameter table can accurately describe an API that violates its requirements. The promise to export all matching rows and the reason for choosing background tasks still need independent records against which to judge the implementation.

The remaining material also needs clear ownership. I prefer the README to provide entry points for running and developing the project, detailed docs to hold contracts, usage, and design context, and AGENTS.md to state working constraints and point to relevant material. Link to existing explanations to reduce copies of volatile facts. API inputs, outputs, error semantics, and deployment steps should remain concrete: simplifying docs must preserve the information readers need to complete their tasks.

## Include the relevant docs in a complete change

Even with fewer copies, a change can affect several places. Finding them starts with describing how behavior changed.

“Changed the export service” points to a group of source files. “The endpoint now returns a task ID instead of a file; callers must check its status and download the file when it is ready” provides clues about return types, status queries, and the download flow. API contracts, callers, examples, and usage instructions may all depend on the old behavior.

[Version Control (2)](https://jyywiki.cn/GSE/2026/lect4.md) describes the links between requirements, design, implementation, and verification as traceability. Keeping files in one repository and recording their history in Git does not automatically explain which example depends on which contract. Impact analysis for documentation follows those links when something changes.

In the hypothetical project above, a search for the old endpoint and terminology could be a starting point.

```bash
rg -n 'exportReport|/api/reports/export|returns the file directly|synchronous export' .
```

Each match needs judgment. A current integration example needs rewriting; a historical decision record may need to remain, marked as superseded. Other descriptions may use different wording, requiring further investigation through callers and documentation links. Start with the intended behavior change, then check against the final result so that a revised implementation does not get reviewed against an outdated plan.

[Version Control](https://jyywiki.cn/GSE/2026/lect3.md) discusses an atomic change as a complete modification organized around a clear intent, one that can be explained and verified. I want documentation included in that scope. When the background task implementation is ready, review its contracts, integration examples, and usage instructions together, checking whether current instructions still lead callers to depend on the old behavior.

For AGENTS.md, a short rule can capture this expectation.

```text
Documentation consistency

- When completing a change, describe the final changes to behavior,
  interfaces, or constraints. Follow relevant calls and documentation
  links to check whether contracts, examples, comments, and usage
  instructions still hold.
- Resolve conflicts between implementation and agreed requirements using
  the requirements and context of the change. Do not turn a behavioral
  deviation directly into a new requirement.
- Preserve important decisions and their rationale. Reduce duplicate
  copies of volatile facts.
- Keep the review proportional to the task's impact. Update documentation
  according to whether its content is affected.
```

If outdated material has already accumulated, I would first give the agent a dedicated maintenance task: verify important facts, address duplication and contradictions, then put these principles into AGENTS.md. Keep an existing structure that works, and check that the review has not erased design rationale or left broken links. Subsequent tasks can review their own impact, keeping a broad cleanup from becoming a fixed burden on every change.

An agent can still miss material or misunderstand a design, and important disagreements still need human judgment. Whether this approach reduces later misuse needs to be tested through continued changes.

The next session does not need to reconstruct our entire conversation. It should be able to find the current requirements, important boundaries, and reasons behind those choices.

::: details Documentation maintenance task to adapt for your coding agent

```md
Review and improve this project's documentation. Make the necessary
changes directly and preserve the user's existing work.
Include the README, docs, AGENTS.md, relevant comments, examples, and
configuration guides.

Read the project entry points and relevant code. Check important facts
against implementation, configuration, and tests. Address stale claims,
duplication, and contradictions. Keep an existing structure that works.

Distinguish current implementation from agreed requirements. Resolve
conflicts by tracing requirements and the context of changes. Preserve
and report important unresolved disagreements, continuing work that does
not depend on them. Keep important decisions, their assumptions, and
rationale. Mark superseded decisions accordingly.

Reduce copies of volatile facts and link to them from other entry points.
Consider which reference material can be generated from definitions and
which examples can be checked. Adopt these approaches according to the
project's actual needs and maintenance costs.

Add incremental maintenance principles suited to the project to AGENTS.md:
understand the final behavior change, follow relevant calls and docs to
check affected contracts, examples, comments, and usage instructions, and
update content according to semantic impact. Keep the review proportional
to the task.

Review the final diff for lost design context, duplication, and broken
links. When checking commands, configuration, or behavior, use verification
that supplies the relevant evidence. Report the actual changes,
verification results, and disagreements that still need human judgment.
```

:::
