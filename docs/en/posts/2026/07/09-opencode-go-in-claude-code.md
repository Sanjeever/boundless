---
title: Using OpenCode Go in Claude Code
date: 2026-07-09
tags:
  - Claude Code
  - OpenCode
  - OpenCode Go
  - Troubleshooting
description: 'Notes from connecting OpenCode Go to Claude Code v2.1.205 on July 9, 2026: the `/v1` in BASE_URL and the authentication header.'
outline: deep
aside: true
---

# Using OpenCode Go in Claude Code

<!-- DESC SEP -->

This post records two traps I hit while connecting OpenCode Go to Claude Code v2.1.205 on July 9, 2026: the `/v1` in BASE_URL and the authentication header. Models, prices, endpoints, and client behavior may change, so check the official docs before you start.

<!-- DESC SEP -->

## What OpenCode Go Is, and Why I Wanted It in Claude Code

[OpenCode Go](https://opencode.ai/docs/zh-cn/go) is OpenCode's model subscription service. The plan recorded here cost $5 for the first month and $10 per month thereafter. The service description at the time stated that models were hosted in the US, EU, and Singapore, with no data retention or training on user data. Those are provider statements, not findings independently verified in this post.

Inside OpenCode's own TUI it is a first-class citizen: run `/connect`, pick `OpenCode Go`, paste the API key, and `/models` lists everything.

But my daily driver CLI is still Claude Code. The problem: Claude Code natively only speaks Anthropic's Messages API, while most models on Go expose an OpenAI-compatible `chat/completions` endpoint. The two protocols are not interchangeable.

In the OpenCode Go model list at the time, **6 models also exposed an Anthropic-format `/v1/messages` endpoint**:

| Model | Model ID | Endpoint |
|---|---|---|
| MiniMax M3 | minimax-m3 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.7 | minimax-m2.7 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.5 | minimax-m2.5 | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Max | qwen3.7-max | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Plus | qwen3.7-plus | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.6 Plus | qwen3.6-plus | `https://opencode.ai/zen/go/v1/messages` |

This table records six compatible endpoints listed at the time. The actual session shown below uses qwen3.7-max; it does not establish tool-use or context capabilities for every model. Consult the current OpenCode docs for other models. An incompatible protocol requires a translation layer, which is outside this post's scope.

The lesson from this setup is specific: **endpoint compatibility is not enough; the base URL and authentication header must also match. I got both wrong, and the UI messages did not directly identify either cause.**

## Trap One: "Model Does Not Exist" Was Actually a Duplicate `/v1` in the URL

I started by copying the official endpoint verbatim:

```json
{
  "env": {
    "ANTHROPIC_BASE_URL": "https://opencode.ai/zen/go/v1",
    "ANTHROPIC_AUTH_TOKEN": "sk-...",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen3.7-max"
  },
  "model": "opus"
}
```

Claude Code fired back:

```text
There's an issue with the selected model (qwen3.7-max). It may not exist
or you may not have access to it. Run /model to pick a different model.
```

My first move was to check the model itself. `curl` against `/zen/go/v1/models` showed qwen3.7-max on the list; `/zen/go/v1/messages` returned a clean streaming response. The backend looked fine, yet Claude Code kept repeating the same line.

It was not until I ran `claude -p "hi" --debug` and pulled the actual request that this line showed up:

```text
post https://opencode.ai/zen/go/v1/v1/messages?beta=true failed with status 404
```

`/zen/go/v1` was followed by `/v1/messages` — **a duplicate `/v1`.**

The cause is straightforward: Claude Code auto-appends `/v1/messages` to `ANTHROPIC_BASE_URL`. So the base URL must not already contain `/v1`. Either you carry it or Claude Code does, not both. I had copied the official endpoint verbatim, so both sides carried it.

That request hit a nonexistent path and returned the opencode site's **404 HTML page** (`<title>404 - Page Not Found</title>`), not a JSON error. The UI displayed “model does not exist or you have no access.” This shows how this failure was presented, not how the client parsed it internally or how it handles every other error.

The fix is one line — drop the trailing `/v1` from the base URL:

```json
"ANTHROPIC_BASE_URL": "https://opencode.ai/zen/go"
```

Let Claude Code do the appending itself.

## Trap Two: "Missing API key" Was Actually the Wrong Auth Header

Once the path was fixed, the error changed:

```text
✻ 401 Missing API key. · Retrying in 22s · attempt 7/10
```

This one was at least honest about the category — auth was off.

Claude Code's [environment variable reference](https://code.claude.com/docs/en/env-vars) distinguishes two authentication headers:

| Variable | Header sent |
|---|---|
| `ANTHROPIC_API_KEY` | `x-api-key: ...` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer ...` |

I had written `ANTHROPIC_AUTH_TOKEN`, so Claude Code sent only `Authorization` and **never sent `x-api-key`**. OpenCode Go's gateway wants `x-api-key`, and answers `Authorization: Bearer` with a 401 Missing API key.

To compare authentication separately, use the following Bash requests with your own key and a model ID that is still available. These examples show the request structure: the same Messages body with different authentication headers. Model availability and account limits can also affect the result; take the status and error details from the actual response.

```bash
# Compare Authorization
curl -sS -w "\nHTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "Authorization: Bearer sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"qwen3.7-max","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}'

# Compare x-api-key
curl -sS -w "\nHTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "x-api-key: sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"qwen3.7-max","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}'
```

The fix is again a rename — swap the variable name to `ANTHROPIC_API_KEY`, value unchanged:

```json
"ANTHROPIC_API_KEY": "sk-..."
```

> One aside: once `ANTHROPIC_API_KEY` is set, Claude Code in interactive mode will prompt you the first time to confirm you want to use this key rather than a subscription. If you have no subscription, just confirm.

## A Full Config That Runs

With both traps filled, what I use looks like this:

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-your OpenCode Go API key",
    "ANTHROPIC_BASE_URL": "https://opencode.ai/zen/go",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "qwen3.7-max",
    "ANTHROPIC_DEFAULT_SONNET_MODEL": "qwen3.7-max",
    "ANTHROPIC_DEFAULT_HAIKU_MODEL": "qwen3.7-plus"
  },
  "model": "opus"
}
```

Drop it into `~/.claude/settings.json`. `model` uses the `opus` alias, which together with `ANTHROPIC_DEFAULT_OPUS_MODEL` actually routes to qwen3.7-max.

```text
▐▛███▜▌   Claude Code v2.1.205
▝▜█████▛▘  qwen3.7-max with high effort
❯ 你好
  Thought for 6s
● 你好！有什么可以帮你的吗？
```

It works.

## Model Mapping and Other Variables

**October 23, 2026 update:** The [Claude Code docs](https://code.claude.com/docs/en/model-config) now explicitly list variables such as `_NAME`, distinguishing model mapping from display names. The table describes their purposes in the current documentation; it does not establish that v2.1.205 supported every variable. The connection configuration above still records the July 9 setup.

| Variable | Purpose and version scope | Note |
|---|---|---|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Model mapping | Controls which model the `opus` alias maps to |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Model mapping | Controls the `sonnet` alias |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Model mapping | Controls the `haiku` alias |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Subagent model | Controls which model subagents use |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME` | Listed in newer docs | Sets a pinned model's display name, not its model ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME` | Listed in newer docs | Same; check support in the client version |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME` | Listed in newer docs | Same |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | Listed in newer docs | Maps `fable`; does not establish support in older clients |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME` | Listed in newer docs | Sets the pinned model's display name |
| `ANTHROPIC_REASONING_MODEL` | Purpose not confirmed here | Not used as a basis for this setup |

For this setup, start with the variables actually used in the full configuration above. With another client version, check which variables it supports and what they do.

## Why the Errors Stay So Misleading

Looking back, neither message was enough to locate the cause on its own:

- Trap one was a 404, but the prompt said "model does not exist or no access";
- Trap two only sent `Authorization`, but the prompt said "Missing API key" — the gateway wants a different kind of key, so "missing" is not strictly wrong, but it points the user in the wrong direction.

The messages pointed to a model and a key, but omitted what was needed to locate the faults: the actual request path and the header the gateway accepts. Checking those two details gets closer to the problem than repeatedly switching models.

The way to capture it:

```bash
claude -p "hi" --debug 2> debug.log
```

`-p` runs non-interactively. In this session, `--debug` exposed the request path and status shown above. Logged fields and file locations may vary by version; check the [CLI reference](https://code.claude.com/docs/en/cli-reference). Start with the actual URL, then the status code and whatever response information is available.

## One Boundary Note

OpenCode Go is not Anthropic, and the models are not Claude. The two systems only agree on the shape of the `messages` interface; they are not equivalent in capability:

- A successful `messages` request does not establish compatibility for tool use or long contexts; check these behaviors for the specific model;
- Models listed at the time with only `chat/completions` endpoints (GLM, Kimi, DeepSeek, MiMo) cannot use this configuration directly; protocol translation is outside the scope here;
- This is a third-party gateway, not Anthropic. If something breaks, file it with OpenCode, not Anthropic.

What this record establishes is that the qwen3.7-max session connected. The URL and authentication header were separate conditions. A new error after fixing the first was useful evidence that the request had reached the next stage.
