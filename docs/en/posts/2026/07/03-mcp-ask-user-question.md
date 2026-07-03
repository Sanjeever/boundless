---
title: 'mcp-ask-user-question: Giving Codex the AskUserQuestion Experience'
date: 2026-07-03
tags:
  - Open Source
  - MCP
  - Codex
  - Claude Code
  - Tools
description: Tired of typing answers to Agent questions in Codex, I built a portable AskUserQuestion-compatible MCP server.
outline: deep
aside: true
---

# mcp-ask-user-question: Giving Codex the AskUserQuestion Experience

<!-- DESC SEP -->

Tired of typing answers to Agent questions in Codex, I built a portable AskUserQuestion-compatible MCP server.

<!-- DESC SEP -->

## The Motivation, Up Front

Over the last stretch, I have gravitated toward developing with **grill-me / grilling**.

It used to be called `grill-me`, but has since moved to [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) (`grill-me` is now only a stub pointing at `/grilling`). I really like the core idea: before actually building anything, the Agent should interrogate me one thing at a time, forcing the fuzzy "roughly like this" in my head into a firm "exactly like this".

The SKILL.md is deliberately sparse, but a few requirements hit exactly what matters to me:

- Ask one question at a time, and wait for my answer before moving on. A wall of questions at once is just overwhelming.
- For every question, give its recommended answer instead of dumping all the decision cost onto me.
- If a question can be answered by exploring the codebase, explore the codebase instead.
- Until I confirm "we have a shared understanding", do not start implementing.

The value of this flow is that it eliminates disagreement before mistakes happen. The Agent stops "writing from its own guess" and starts "showing its understanding for a check" first. That is much cheaper than rebuilding after the fact.

## But Codex Has No AskUserQuestion

The experience of this flow varies wildly across tools.

In **Claude Code** and **OpenCode**, the Agent has a built-in `AskUserQuestion` tool. It can pop up a structured question — with a header, options, a recommended choice — and I just click once to reply. The round trip is fast and barely breaks my train of thought.

In **Codex**, that tool does not exist.

When the Agent wants to ask me, it can only print the question as a text dump in the conversation, and I have to type the answer back. For a grilling-style flow that lives on "one targeted follow-up after another", the experience is broken:

- Options cannot be clicked. I have to type them out, and I get them wrong.
- Structured signals like recommended item, header, and multiSelect collapse into one indistinguishable text blob.
- The question-and-answer rhythm collapses into "read — think — type" slog.

So I started wondering: can I give Codex the same tool back, and make the behavior align?

That is where **mcp-ask-user-question** comes from.

## It Is Not About Whether You Can Ask, but How Smoothly

In theory Codex can already ask; the question is sitting right there in text.

What is missing is not the ability to ask, but the friction between asking and answering. The real benefit of AskUserQuestion is turning "confirm with the user" into one lightweight, structured interaction: options laid out, recommendation labeled, one click and you move on. In a high-frequency grilling flow, that friction difference becomes huge — one exchange you do not feel, but twenty in a row is the difference between pleasant and painful.

mcp-ask-user-question does exactly one thing: put that tool back as an MCP server.

- **GitHub Repository**: [Sanjeever/mcp-ask-user-question](https://github.com/Sanjeever/mcp-ask-user-question)

## Design Principle: Native Interaction First, Fallbacks Must Be Explicit

This project is where I am strict about "default behavior".

The server's default provider is `auto`, and `auto` **only uses MCP's native elicitation** — the input/confirmation UI that the client can already show natively. It does not silently open a terminal, a browser, or a desktop dialog.

Fallback paths exist, but I require them to be turned on explicitly:

| Provider | Status | Behavior |
|---|---|---|
| auto | stable | Uses MCP form elicitation when the client advertises support. |
| elicitation | stable | Requires MCP form elicitation. |
| terminal | experimental | Reads from the attached TTY. Writes prompts outside stdout so MCP stdio is not corrupted. |
| desktop | planned | Reserved for a future release. |
| web | planned | Reserved for a future release. |

Why this split? "Asking the user" is inherently a decision about which interface gets to disturb a person. I do not want a "portable server" to silently decide, on the user's behalf, which dialog to pop up. `auto` only goes native; fallbacks must be named by you — that is a boundary, not a default.

## Tool Shape: Aligned With Claude Code

The server exposes exactly one tool: `AskUserQuestion`.

Its input is compatible with the shape of `AskUserQuestion` in Claude Code:

```json
{
  "questions": [
    {
      "question": "Which state management library should we use?",
      "header": "State mgmt",
      "options": [
        {
          "label": "Zustand (Recommended)",
          "description": "Lightweight, minimal boilerplate, great with TypeScript"
        },
        {
          "label": "Redux Toolkit",
          "description": "Full-featured, larger ecosystem, more boilerplate"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

A few constraints:

- `questions`: 1 to 4.
- `options`: 2 to 4.
- `header`: at most 12 characters.
- Do not include `Other`; the server adds it automatically.
- `preview` is accepted on options, but native MCP clients may render it differently or not at all.

The return value is structured, not a text dump:

- `answered`: includes `answers`, recording which option was selected for each question.
- `cancelled`: the user bailed out mid-way.
- `declined`: the user refused to answer this question.

Multi-question calls are all-or-nothing — if a later question is cancelled or declined, earlier answered ones are not returned either. That is deliberate: do not let the Agent guess on partial residue.

## Using It Inside Codex

Run it directly with `npx`:

```bash
npx -y mcp-ask-user-question
```

Add it to Codex:

```bash
codex mcp add ask-user-question -- npx -y mcp-ask-user-question
```

Or edit `~/.codex/config.toml`:

```toml
[mcp_servers.ask-user-question]
command = "npx"
args = ["-y", "mcp-ask-user-question"]

[mcp_servers.ask-user-question.env]
ASK_USER_PROVIDER = "auto"
```

One trap must be called out: **Codex needs to explicitly allow MCP elicitation**, otherwise tool calls will get back `declined` without ever showing a prompt. Turn `mcp_elicitations` on inside the granular `approval_policy`:

```toml
approval_policy = { granular = {
  sandbox_approval = true,
  rules = true,
  mcp_elicitations = true,
  request_permissions = true,
  skill_approval = true
} }
```

For a one-off test:

```bash
codex -c 'approval_policy={granular={sandbox_approval=true,rules=true,mcp_elicitations=true,request_permissions=true,skill_approval=true}}'
```

And one even sharper trap: **do not use `codex --yolo` when you need this tool to ask questions.** `--yolo` bypasses approvals and sandboxing, and Codex treats MCP elicitation as an interactive approval prompt — in yolo mode those requests can be auto-declined before you ever see the form.

If what you want is "let files and commands run freely, but user questions still pop up", then widen the sandbox while keeping elicitation interactive:

```bash
codex --sandbox danger-full-access -c 'approval_policy={granular={sandbox_approval=true,rules=true,mcp_elicitations=true,request_permissions=true,skill_approval=true}}'
```

## A Few Boundary Notes

I did not add a silent fallback "to make it look smoother":

- When a client does not support elicitation, `auto` does not secretly swap to terminal mode. Whether to switch is something you name in the config.
- The server does not auto-launch any GUI. desktop / web providers are planned, not secretly available.
- Failure states are distinct: `cancelled` means the user walked away; `declined` means the user refused this question. The Agent can distinguish "does not want to answer" from "do not ask me this".

That matches what I held firm on in the Codex Quota post: when something is wrong, say clearly what is wrong. Do not pretend everything is fine.

## Why It Deserves Its Own Post

It really is small — a few lines of config and it runs.

But it sits exactly on the point I have been caring about most lately: **before the Agent acts, does it come ask me first.** grilling settles what to ask and at what pace. AskUserQuestion settles the shape and friction of asking. mcp-ask-user-question settles "bringing this capability back inside the Codex client".

These three pieces together are what make development feel continuous: the Agent actively follows up, the follow-up has structure, and regardless of which CLI I use, I get asked the same way and answer with the same motion.

For me, that is extending the grilling route from "only in Claude Code / OpenCode" to "Codex too".

- **GitHub Repository**: [Sanjeever/mcp-ask-user-question](https://github.com/Sanjeever/mcp-ask-user-question)

If you also use Codex day to day and want the Agent to learn "ask first, then write", give it a try.