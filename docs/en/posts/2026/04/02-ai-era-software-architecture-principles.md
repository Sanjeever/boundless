---
title: Software Architecture in the AI Era
date: 2026-04-02
tags:
  - Essay
  - Programming
  - AI
  - Architecture
description: In the AI era, software architecture should prioritize low cognitive load, low context cost, and strong local modifiability instead of abstraction for abstraction’s sake.
outline: deep
aside: true
---

# Software Architecture in the AI Era

<!-- DESC SEP -->

In the AI era, software architecture should prioritize low cognitive load, low context cost, and strong local modifiability instead of abstraction for abstraction’s sake.

<!-- DESC SEP -->

## From “Specification First” to “Understanding First”

Many architecture optimizations in the past were fundamentally designed for large-scale human collaboration: strict layering, early abstraction, standardized template-based decomposition, and complex extension point design.
These approaches have value at certain team scales, but they can also leave a long trail of dependencies to understand before a straightforward change can begin.

To change one field, you first have to pass through controller, service, assembler, domain, repository, dto, mapper, converter, and facade.
If these layers each keep a separate representation of the field, every mapping must be checked. Missing one can leave the old and new representations inconsistent.

Different models, context windows, retrieval tools, and task types behave differently. What follows is a set of architecture review criteria: keep the context for a change concentrated, its boundaries clear, and its results verifiable. Whether this improves a particular Agent's success rate requires comparison on concrete tasks.

“Understanding first” does not declare scalability obsolete. It asks every layer of abstraction to reduce a real comprehension or change cost. A short modification path does not mean putting all code in one file; it means readers can find boundaries, verify outcomes, and understand impact without guessing their way across irrelevant layers.

## Four Evaluation Criteria

### 1) How Many Files Must You Understand for One Change?

For any requirement, can AI complete the whole loop of understanding, modification, and verification within a small set of files?
File count is a starting point for inspection, not a verdict. A dozen files may represent necessary protocol, authorization, and storage boundaries. If they merely forward the same field through successive layers, understanding and synchronizing those repeated representations becomes extra work.

### 2) Do Directories and Module Names Express Business Meaning Directly?

Names such as `auth`, `order`, `invoice`, and `comment` at least suggest a business area and a place to start looking.
With `common`, `base`, `shared`, `engine`, `support`, or `ext`, collaborators need to inspect the responsibilities inside before knowing whether the behavior they need belongs there.

A name should at least suggest where to look first. `shared` can be useful, but if it also hides order validation, readers must learn a private classification scheme before they can find the behavior.

### 3) Does the Middle Layer Provide Real Value?

In many projects, the problem is not “too many layers” itself, but too many “idle layers”: call forwarding, parameter wrapping, and renaming before passing things along.
Without an additional responsibility, they still make the person or Agent changing the code read and synchronize each step to check that nothing in the call chain was missed.

Every layer should answer the same question: what real complexity did I reduce?
Isolating an external interface, centralizing authorization, or providing an independent test boundary can justify a layer. A layer that only forwards calls without such a responsibility is a candidate for consolidation.

### 4) Does the Structure Allow Safe Changes After Local Understanding?

If a module is highly self-consistent, has clear inputs and outputs, and has few implicit conventions, both people and AI can work more reliably. Conversely, when any change can affect the whole system through hidden rules, every collaborator must become conservative and is more likely to make an incorrect edit.

Local verifiability is the part of maintainability I care about here: the person making a change can assess it through the module's inputs, outputs, and checks, then examine external effects along explicit interfaces.

## Preventing the Opposite Extreme

These principles do not mean “the simpler, the better,” but “as simple as possible while still meeting evolution needs.”

Some complexity is not invented by architects out of thin air; it is intrinsic to the business. For example:

- Multi-tenant isolation
- Plugin-based extensibility
- Shared protocols across multiple clients
- Large-scale parallel development
- Independent deployment and version governance

In these scenarios, modularization, boundary control, and layered governance are still necessary.
The difference is this: they should serve the reduction of real complexity, not the appearance of being “professional.”

## A More Practical Architecture Questioning Method

For every architecture decision, ask three questions first:

- Can this design shorten the modification path for a real requirement?
- Can this abstraction reduce cognitive load instead of creating new terms?
- Can this boundary let AI complete tasks stably within a local scope?

If all the answers are no, the design needs another concrete justification, such as the isolation or independent deployment requirements described above.

You can also apply those questions to one real requirement: which files must be read, which files must change, which tests prove the change has not crossed a boundary, and where to look when it fails. Record a few of these journeys and the project will tell you whether the problem is too many layers, vague names, or boundaries and tests that never close.
