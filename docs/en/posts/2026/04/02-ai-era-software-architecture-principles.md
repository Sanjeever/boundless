---
title: Software Architecture in the AI Era
date: 2026-04-02
tags:
  - Essay
  - Programming
  - AI
  - Architecture
description: When AI is a daily collaborator, good architecture is no longer the one with the most layers, but the one with the shortest path from reading to local verification.
outline: deep
aside: true
---

# Software Architecture in the AI Era

<!-- DESC SEP -->

When AI is a daily collaborator, good architecture is no longer the one with the most layers, but the one with the shortest path from reading to local verification.

<!-- DESC SEP -->

## From “Specification First” to “Understanding First”

Many familiar architectural patterns grew up around large human organizations: strict layering, premature abstraction, template-driven decomposition, and extension points for futures that may never arrive.

At a certain organizational scale those habits had their reasons, yet they often left behind a familiar tax: a small, direct change stretched into a long reading expedition.

To add a single field, you march through `controller`, `service`, `assembler`, `domain`, `repository`, `dto`, `mapper`, `converter`, and `facade`. Each layer keeps its own near-identical copy of the field; miss one mapping along the way, and the data quietly falls out of sync.

Whether the person making the edit is a human or an AI agent, the relevant context has to fit in working memory first. Putting understanding first simply means every layer should earn its keep by reducing cognitive load, rather than making the reader play detective across pass-through wrappers.

## Four Everyday Yardsticks

### How Many Files Does One Change Touch?

When a concrete requirement lands, how many files does it take to read, edit, and verify the change?

Touching a dozen files makes sense when they guard real protocol, permission, or storage boundaries. When they merely hand the same parameter down a bucket brigade under slightly different names, keeping them synchronized is pure busywork.

### Do Names Speak the Domain Directly?

Directories like `auth`, `order`, `invoice`, and `comment` tell a collaborator where to start looking.

When a codebase is mostly `common`, `base`, `shared`, `engine`, and `support`, nobody can tell which drawer holds order validation without opening half the project first.

### Is the Middle Layer Doing Real Work?

Projects rarely become painful because they have layers; they become painful because they have idle layers—code that only forwards calls, re-wraps arguments, and renames fields on the way through.

Every layer deserves one plain question: if we deleted it, what real safeguard would we lose? Isolating an external API, enforcing permissions, or providing a clean test seam is real work. Acting as a megaphone is a sign to merge.

### Can You Make a Safe Edit with Local Context?

When a module has clear inputs and outputs and few hidden global rules, both humans and AI agents can work inside it with confidence. When any one-line edit might trip an invisible wire three directories away, everyone slows to a crawl.

Maintainability shows up most clearly when you can verify a change locally, then trace its outward effects along explicit interfaces.

## Avoiding the Opposite Extreme

Keeping things simple does not mean dumping the whole application into a single file.

Multi-tenant isolation, plugin systems, shared cross-client protocols, and independent deployment carry genuine complexity of their own. Those problems still call for modular boundaries; what we can gladly leave behind is the ceremonial scaffolding built only to make a codebase look “enterprise.”
