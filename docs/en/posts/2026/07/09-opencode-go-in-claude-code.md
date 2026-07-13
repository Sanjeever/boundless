---
title: Using OpenCode Go in Claude Code
date: 2026-07-09
tags:
  - Claude Code
  - OpenCode
  - OpenCode Go
  - Troubleshooting
description: OpenCode Go can serve as a backend for Claude Code, but two config traps — the /v1 on BASE_URL and the auth header — will only ever surface as "model does not exist".
outline: deep
aside: true
---

# Using OpenCode Go in Claude Code

<!-- DESC SEP -->

OpenCode Go can serve as a backend for Claude Code, but two config traps — the /v1 on BASE_URL and the auth header — will only ever surface as "model does not exist".

<!-- DESC SEP -->

## What OpenCode Go Is, and Why I Wanted It in Claude Code

[OpenCode Go](https://opencode.ai/docs/zh-cn/go) is OpenCode's own low-cost subscription: $5 for the first month, then $10 per month, in exchange for stable access to a curated set of open-source coding models. Models are hosted in the US, EU, and Singapore for steady global reach, with a zero-retention policy and no training on your data.

Inside OpenCode's own TUI it is a first-class citizen: run `/connect`, pick `OpenCode Go`, paste the API key, and `/models` lists everything.

But my daily driver CLI is still Claude Code. The problem: Claude Code natively only speaks Anthropic's Messages API, while most models on Go expose an OpenAI-compatible `chat/completions` endpoint. The two protocols are not interchangeable.

The good news is that **6 models on Go also expose an Anthropic-format `/v1/messages` endpoint**:

| Model | Model ID | Endpoint |
|---|---|---|
| MiniMax M3 | minimax-m3 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.7 | minimax-m2.7 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.5 | minimax-m2.5 | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Max | qwen3.7-max | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Plus | qwen3.7-plus | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.6 Plus | qwen3.6-plus | `https://opencode.ai/zen/go/v1/messages` |

Only these 6 can be fed directly to Claude Code. The others (GLM, Kimi, DeepSeek, MiMo) only expose `chat/completions`, which Claude Code cannot consume natively. Bridging them means standing up a protocol-translation layer in between, which is out of scope here.

What this post records is: **even for the 6 models that should just work, I hit two config traps — and the error messages lied to me the whole way through.**

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

That request hit a path that does not exist and came back as the **404 HTML page** of the opencode site itself (`<title>404 - Page Not Found</title>`), not a JSON error. Claude Code could not parse it and translated every non-200 into the generic "model does not exist or you have no access."

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

Claude Code has two variables for the key, and they map to two different HTTP headers:

| Variable | Header sent |
|---|---|
| `ANTHROPIC_API_KEY` | `x-api-key: ...` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer ...` |

I had written `ANTHROPIC_AUTH_TOKEN`, so Claude Code sent only `Authorization` and **never sent `x-api-key`**. OpenCode Go's gateway wants `x-api-key`, and answers `Authorization: Bearer` with a 401 Missing API key.

`curl` makes it obvious:

```bash
# Authorization only — 401
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "Authorization: Bearer sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" -d '{}'

# x-api-key only — 200
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "x-api-key: sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" -d '{}'
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

## A Few Environment Variables That Do Nothing

While setting up, I copied a bunch of variables with `_NAME` suffixes, plus a `FABLE` and a `REASONING` one. After checking the [Claude Code docs](https://code.claude.com/docs/en/model-config), it turns out **Claude Code does not read any of them.**

| Variable | Read? | Note |
|---|---|---|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | Yes | Controls which model the `opus` alias maps to |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | Yes | Controls the `sonnet` alias |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | Yes | Controls the `haiku` alias and background tasks |
| `CLAUDE_CODE_SUBAGENT_MODEL` | Yes | Controls which model subagents use |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME` | No | No `_NAME` suffixed variant exists |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME` | No | Same |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME` | No | Same |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | No | The `fable` alias has no env override |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME` | No | Does not exist |
| `ANTHROPIC_REASONING_MODEL` | No | Does not exist |

Leaving them in does not break anything, but they are pure self-comfort. Better to drop them and keep the config clean.

## Why the Errors Stay So Misleading

Looking back, both traps produced untrustworthy messages:

- Trap one was a 404, but the prompt said "model does not exist or no access";
- Trap two only sent `Authorization`, but the prompt said "Missing API key" — the gateway wants a different kind of key, so "missing" is not strictly wrong, but it points the user in the wrong direction.

The root cause is that **Claude Code funnels every non-200 response into one generic line**, without distinguishing 404 from 401, or JSON from HTML. That is fine against the native Anthropic backend, where errors are already structured JSON. But against a third-party gateway whose 404 is an HTML page, this error-translation layer disguises "wrong path" as "wrong model".

There is nothing for me to fix here — collapsing errors into one message is the client's design choice. But for the user it means **the first reaction to this kind of prompt should not be swapping models — it should be capturing the actual request.**

The way to capture it:

```bash
claude -p "hi" --debug 2> debug.log
```

`-p` runs non-interactively, and `--debug` prints the SDK-layer request URL, status code, and response body. You can see at a glance which path was hit and what came back. That is far faster than cycling through model names against the "model does not exist" prompt.

## One Boundary Note

OpenCode Go is not Anthropic, and the models are not Claude. The two systems only agree on the shape of the `messages` interface; they are not equivalent in capability:

- There is no OpenCode-Go-backed guarantee of extra tool-use features or long-context windows — capability is whatever those 6 models bring themselves;
- The other Go models (GLM, Kimi, DeepSeek, MiMo) only expose `chat/completions` and **cannot** be fed directly to Claude Code — that is out of scope here;
- This is a third-party gateway, not Anthropic. If something breaks, file it with OpenCode, not Anthropic.

But for "I want Claude Code's interaction model with cheap open-source models for daily tasks", these 6 are enough, and the config is not complicated. Once you clear the two traps, the experience is continuous.

The config is not complicated. What it does is fold "the config is wrong" and "the backend is broken" into the same sentence. That is the only reason this post exists.
