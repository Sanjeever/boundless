---
title: When Code Changes, What Happens to the Docs?
date: 2026-10-22
tags:
  - AI
  - Software Engineering
  - Vibe Coding
description: Reducing documentation drift in projects developed with coding agents by clarifying sources of truth, preserving design rationale, and maintaining documentation according to semantic changes.
outline: deep
aside: true
---

# When Code Changes, What Happens to the Docs?

<!-- DESC SEP -->

An implementation can meet its requirements today while later changes pull the code, specification, and documentation apart. I ask coding agents to review existing docs, then put principles for incremental maintenance based on semantic changes into AGENTS.md, leaving reliable project knowledge for the next session.

<!-- DESC SEP -->

In [Intent and Code](/en/posts/2026/10/21-intent-spec-impl), I discussed `Intent → Spec → Impl`. A goal becomes requirements we can check, then a working program. Each step can introduce a mismatch.

Suppose the report export now works correctly and downloads every row matching the filters. As the project grows, so does the data volume. Exporting becomes a background task: submit a request, receive a task ID, and download the file once it is ready.

The code has changed, but the README still says that a successful request returns the file directly. The example still saves the response as a file. A coding agent in a new session reads that example while adding exports to another page. Following it could produce a “report file” containing a task ID.

This is a hypothetical example, but it shows how outdated documentation can feed into later implementations. The old instructions look authoritative, giving the error a path into the next task.

I call this growing separation between evolving code and existing descriptions **documentation drift**. It can appear in READMEs and design documents, as well as comments, examples, and configuration guides. I pay particular attention to it in projects developed over time with coding agents. Each new session needs to gather context again, and the material we leave behind helps shape its next decisions.

That is why I usually give the agent a dedicated documentation maintenance task: address accumulated problems and put principles for future maintenance into AGENTS.md. The first thing to clarify is how to handle conflicting information.

## First, decide which source can answer the question

“Keep the documentation consistent with the code” sounds reasonable, but applying it can hide a problem.

Consider the export again. If the docs describe a synchronous file response and an approved change has moved the implementation to background tasks, the old usage instructions need updating. But if the specification requires all matching rows and the code exports only the current page, changing the docs to say “exports the current page” turns a possible bug into a new requirement.

Both conflicts look like disagreement between prose and code. They call for different responses.

We need to identify the **source of truth**. I start by distinguishing the kinds of questions being asked.

| Question                                                                            | Main sources                                                                           |
| ----------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Which internal function or data structure does the current implementation use?      | Implementation code                                                                    |
| What are the current configuration defaults, and how does the API actually respond? | Configuration definitions, implementation, and tests that verify the relevant behavior |
| What input should the API accept, and what guarantees should it provide?            | The agreed contract or schema, together with the implementation and contract tests     |
| Why is the system designed this way, and which boundaries should hold?              | Agreed specifications, design documents, and architecture decision records             |
| How should users run, use, and deploy the project?                                  | Instructions checked against the actual workflow                                       |

These sources still need scrutiny. A schema that is not used for validation can diverge from the API. A test with an incorrect assertion can accept incorrect behavior. Whether a design document still applies depends on the status of its decisions and subsequent changes.

**Code tells us what is implemented now; established constraints help us judge whether that implementation is correct.** When they conflict, trace the original rationale, requirement changes, and supporting evidence. An intentional design change should be reflected in the docs. An unintended deviation in behavior needs fixing. If the repository cannot resolve an important tradeoff, take the disagreement to someone who can make that decision.

In [Documenting Architecture Decisions](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), Michael Nygard describes the dilemma facing someone who inherits a decision without its rationale: blindly accept it or blindly reverse it. He proposes architecture decision records, or ADRs, that retain context, the decision, its status, and its consequences. When a decision is superseded, keep the old record and identify its replacement.

This is why I ask agents to preserve design context. Rewriting every document to match the current code could erase the very evidence needed to judge whether the code has departed from its requirements.

## Leave fewer facts that need repeated synchronization

Once the sources are clear, the next concern is duplicated maintenance.

The [DRY principle in The Pragmatic Programmer](https://pragprog.com/tips/) calls for each piece of knowledge to have one clear, authoritative representation within a system. That concern about duplicated knowledge also applies to documentation.

Suppose the default retry count appears in the code, README, configuration example, and AGENTS.md. Changing it means finding all four places. Miss one, and readers can get different answers. I would rather let the configuration definition establish the default, have the reference explain the option, and link to it from other entry points. Examples that need to show a concrete value should be included in the impact review when that value changes.

Some descriptions can simply be reduced.

```diff
- TaskQueue uses a LinkedList to store tasks.
+ TaskQueue maintains an ordered queue of pending tasks.
```

If readers only need to understand the module's responsibility, the second sentence is enough. The underlying data structure can change while that responsibility remains, leaving the documentation valid.

But removing a detail can also lose useful information when it reflects an important constraint. Imagine a queue that frequently needs to cancel tasks at arbitrary positions. The cost of removal may have influenced the choice of data structure. In that case, record the cancellation requirement, cost constraints, and rationale. If the access pattern later changes, someone taking over can judge whether to revisit the choice.

[Google's code review guide](https://google.github.io/eng-practices/review/reviewer/looking-for.html#comments) makes a related distinction: comments generally supply reasoning that the code cannot express directly, while documentation for classes, modules, and functions should also explain their purpose, usage, and behavior.

So “repeat fewer implementation details” should not become “only document why.” API inputs, outputs, and error semantics, the meaning of configuration options, and necessary deployment steps deserve concrete descriptions. Ask whom the information serves, where it should be maintained, and how a change will reveal that it needs attention.

## Give README, docs, and AGENTS.md clear roles

Mixing documentation responsibilities can create more duplication.

I prefer to keep the README as an entry point. Readers should learn what the project is, its main capabilities, and how to run it or contribute, then follow links to detailed material. How a particular class is assembled or which internal functions call each other usually does not belong there.

[Diátaxis](https://diataxis.fr/) distinguishes tutorials, how-to guides, technical reference, and explanation according to readers' needs. It offers a useful perspective when organizing docs: is someone learning, completing a task, looking up precise information, or trying to understand a design?

For the export feature, integrating a minimal example, looking up task status fields, and understanding why exports run asynchronously are different reading needs. The material can link between them. Whether it needs separate files depends on length and the effort required to find it. A small project might handle all three in sections of one document.

As for AGENTS.md, its [official description](https://agents.md/#why-agents-md) presents it as a predictable place for coding agents to find project context and instructions, complementing the README written for people.

In my approach, it also defines how to handle documentation impact. The agent needs to know which constraints to respect, where to find supporting material, and what counts as complete. If a dedicated document already explains a design, link to it. Repeatedly copying that content gives AGENTS.md another version of the same information to keep up to date.

## Review accumulated problems, then guide future changes

When outdated material has accumulated, I ask the agent to perform a focused documentation review. It covers the README, docs, AGENTS.md, comments, examples, and configuration guides, looking for duplication, stale claims, contradictions, and missing design rationale.

The broad scope addresses the existing backlog. The agent reads the material, verifies important facts against code, tests, and configuration, then decides what to remove, merge, rewrite, or preserve. If the structure is clear enough, keep it. Finding a few problems does not require redesigning the whole documentation tree.

I give the agent two requirements together: reduce volatile implementation descriptions and preserve constraints and design context with lasting value. The first keeps documentation from chasing local implementation changes. The second prevents the review from stripping away useful detail.

A completed review only addresses the problems identified at that point. The next feature can change an API, configuration, or deployment process and introduce new mismatches. I therefore also ask the agent to put principles for subsequent tasks into AGENTS.md.

For example, this can serve as a starting point, adapted to the project.

```text
Documentation consistency

Use code as the source for current implementation details. Use agreed
design material as the source for explicit architecture constraints,
design decisions, and behavioral contracts. Resolve conflicts in light
of the context of the change.

When completing a change with semantic impact:
- Understand which behavior, interface, constraint, architecture, or
  implementation assumption changed in the final result.
- Find documentation, comments, tests, examples, and configuration that
  may describe those concepts.
- Update material that would become false, misleading, or inconsistent.
- Decide whether documentation needs updating based on semantic impact,
  rather than whether a source file changed.
- Prefer stable concepts, behavior, boundaries, constraints, and rationale.

Keep the review proportional to the task's impact. Reading every document
for every task is unnecessary.
```

[Write the Docs describes Docs as Code](https://www.writethedocs.org/guide/docs-as-code/) as using tools such as version control and code review for documentation and integrating it into development workflows. Making documentation impact part of an agent's completion criteria is how I want to apply that idea.

Keeping Markdown and code in one repository makes it easier to edit and review them together. Deciding which passages need changing still requires understanding the change.

## Use semantic changes to find affected knowledge

“Changed the export service” is not specific enough. A more useful description is: “The export endpoint now returns a task ID instead of a file. Callers must check the task status and download the file when it is ready.”

That description provides search clues. The API docs may describe the return type, a frontend example may assume it receives a file, and usage instructions may promise an immediate download. All can be affected without mentioning the service's class name.

This is what I mean by **impact analysis** in documentation maintenance: understand the change, then find existing knowledge that depends on the old behavior. I use **context routing** to describe locating the material needed for the task this way: choose reading entry points based on the problem, then gather context as needed.

An agent can inspect changes with `git diff`, check the working tree with `git status --short`, and use `rg` to search for endpoint paths, configuration options, old terminology, and descriptions of behavior. These commands supply clues; the task determines how to use them. New, untracked files also need to be read, since an ordinary diff will not include everything.

For example, in the hypothetical project above, this search could help locate descriptions of the old export contract.

```bash
rg -n 'exportReport|/api/reports/export|returns the file directly|synchronous export' .
```

Each result needs judgment. A historical decision record may need to remain, while a current integration example needs rewriting. Other passages may use different wording, requiring further exploration through callers and documentation links. Matching a term makes a passage worth inspecting; it does not by itself justify changing it.

Changes that look similar can also have different impacts.

| Change                                                                | What to investigate                                                                                                     |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Replace the queue's internal data structure while preserving behavior | Whether implementation descriptions are stale and the original rationale still applies                                  |
| Move from synchronous export to background tasks                      | API contracts, calling examples, interaction flows, and relevant timeout and status configuration                       |
| Change export scope from all matching rows to the current page        | Whether this violates the agreed specification and whether there is evidence of an approved requirement change          |
| Rename an internal function                                           | Whether docs actually reference the symbol; a purely internal rename may require no reader-facing documentation changes |

An initial impact analysis can identify useful material while clarifying the task. After implementation, review the final changes again, since they may differ from the original plan. The process can look like this:

```text
Identify the behavior and constraints intended to change
    → Find relevant context
    → Implement the change
    → Review consistency against the final result
```

The [Documentation section of Google's review guide](https://google.github.io/eng-practices/review/reviewer/looking-for.html#documentation) offers a concrete criterion: when a change affects how users build, test, interact with, or release code, check that the associated documentation is updated. A requirement tied to impact is easier to apply than a general reminder to “keep the docs in sync.”

Before completing a task, I want the agent to be able to answer three questions.

> What behavior, interface, constraint, architecture, or implementation assumption changed?
>
> Where else in the repository are those concepts described?
>
> Are the code, documentation, tests, examples, and configuration still consistent?

Consistency here includes implementation respecting constraints that remain valid, as well as instructions matching the actual workflow. Unchanged docs may be appropriate because the task did not affect them. A large documentation update can still miss the most important contract. The review needs to examine the substance.

## What to leave for the next session

For a small project, clear entry points, a few links, and these principles are usually enough. If multiple subsystems make finding material substantially harder, consider a lightweight mapping from code directories to their architecture docs. The mapping needs maintenance too. I would add it when the reduction in search effort justifies that cost.

Read the final diff once more. Did a deleted paragraph contain important design rationale? Did moving a document leave two copies of a default value? Will a rule added to AGENTS.md make the next small change require a full review process? The documentation review itself can introduce problems.

I cannot conclude that a maintenance prompt will eliminate documentation drift. An agent can miss relevant material or misunderstand a design, and important disagreements still need human judgment. What I want is a concrete expectation: when delivering a feature, also check whether it has left the project with incorrect instructions or descriptions.

The next session does not need to reconstruct our entire conversation. It should be able to find the current requirements, important boundaries, and reasons behind those choices.

::: details Documentation maintenance task to adapt for your coding agent

The task below puts these principles into a reusable prompt. Before running it, identify which working-tree changes belong to existing work.

```md
Review and improve this project's documentation. Make the necessary changes
directly.

Include README.md, `docs/**`, AGENTS.md, architectural explanations in code
comments, examples, configuration guides, development instructions, and
other text material with lasting maintenance value.

The goal is to reduce documentation drift and help future coding agent
sessions find reliable project knowledge. Keep the work simple and
appropriate to the project's size.

## Understand the project first

Read the existing AGENTS.md, README, and relevant documentation. Learn the
main code directories and modules. Check important facts against code,
configuration, and tests. Look for obvious duplication, stale information,
and contradictions.

Preserve the user's existing changes. Do not delete, move, or rewrite
content based only on a filename or search match.

## Identify sources of truth

- Use code for current implementation details.
- Use actual configuration definitions and code for options and defaults.
- Assess actual API behavior using code, schemas, tests, and what they
  actually validate.
- Use agreed specifications and design material for behavioral contracts,
  architecture constraints, and design decisions.
- Check usage and deployment instructions against the actual workflow.

When code and documentation conflict, first determine whether the document
describes an implementation or establishes a constraint to follow.
Correct stale implementation descriptions. Do not remove explicit design
constraints merely because the code differs. Resolve conflicts using
change history, code, tests, and context.

If an important design disagreement cannot be resolved from the
repository, preserve the relevant material and report it in the result.
Continue work that does not depend on that decision.

## Reduce duplication and volatile information

Check whether references to class names, method names, internal calls, and
data structures serve a useful reading purpose. Remove or replace them
with stable descriptions when they are readily available in code and add
no explanatory value.

When an implementation choice has design significance, preserve its
context, constraints, rationale, and consequences. Do not lose that
evidence while simplifying the docs.

Prefer maintaining each changeable fact in one place, with links from
other locations. Keep reference material and how-to guides accurate and
concrete where they need to show behavior, parameters, or steps.

## Clarify documentation responsibilities

Use the README mainly for the project's purpose, core capabilities,
structural overview, and entry points for running and developing it.
Put details in suitable locations and keep them reachable through links.

Address duplication, stale claims, unclear responsibilities, and
contradictions in docs. Keep an existing structure that works. Do not
create many small documents merely to complete a formal structure.

Distinguish historical decisions from current instructions. Preserve
superseded decisions that retain value, marking their status and linking
to their replacements.

## Update AGENTS.md for future tasks

Organize goals, principles, boundaries, sources of truth, and completion
criteria around the actual project. Preserve implementation autonomy.
Avoid requiring every task to read all documentation or run unrelated
checks.

Add documentation consistency principles suited to this project:

- After a change with semantic impact, understand which behavior,
  interface, constraint, architecture, or implementation assumption
  changed in the final result.
- Find documentation, comments, tests, examples, and configuration that
  may describe those concepts.
- Update content that would become false, misleading, or inconsistent.
- Do not mechanically change documentation because a source file changed.
- Intentionally resolve conflicts between implementation and explicit
  architecture constraints or design decisions, using available evidence.
- Prefer stable concepts, behavior, boundaries, constraints, and rationale.
- Keep the review proportional to the task's impact.

Use git diff, git status --short, rg, or other suitable tools. The point
is to understand the relationship between changes and project knowledge.

Add a lightweight code-to-documentation mapping only if the project needs
it to reduce the effort of finding material across subsystems.

## Complete and review the work

Choose verification proportional to the changes. Documentation work does
not automatically require a full build or test suite. When checking a
command, configuration, or behavior, choose a method that supplies the
relevant evidence.

Review consistency across the final changes, including new and moved
files:

1. Do current descriptions still contain obvious stale claims or
   contradictions?
2. Did the review introduce duplicate information or broken links?
3. Were valid constraints mistakenly rewritten to match the implementation?
4. Was design context with lasting value deleted?
5. Has AGENTS.md become too procedural or copied too much volatile detail?
6. Will the new rules apply to future tasks, beyond the current state?

Report the actual changes, verification results, and important unresolved
decisions requiring human judgment. Do not claim to have proved that the
entire repository is free of documentation drift.
```

:::
