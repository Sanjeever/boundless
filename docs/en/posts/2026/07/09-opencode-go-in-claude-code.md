---
title: Using OpenCode Go in Claude Code
date: 2026-07-09
tags:
  - Claude Code
  - OpenCode
  - OpenCode Go
  - Troubleshooting
description: Two traps I hit when wiring OpenCode Go into Claude Code v2.1.205—an extra /v1 in BASE_URL and the wrong auth header.
outline: deep
aside: true
---

# Using OpenCode Go in Claude Code

<!-- DESC SEP -->

Two traps I hit when wiring OpenCode Go into Claude Code v2.1.205—an extra `/v1` in `BASE_URL` and the wrong auth header.

<!-- DESC SEP -->

## Why Wire OpenCode Go into Claude Code

[OpenCode Go](https://opencode.ai/docs/zh-cn/go) is OpenCode’s model subscription service. Inside OpenCode’s own TUI it works out of the box: run `/connect`, pick `OpenCode Go`, paste your API key, and `/models` lists everything.

My daily CLI, though, is still Claude Code. Claude Code natively speaks Anthropic’s Messages API, while most models on OpenCode Go expose OpenAI-compatible `chat/completions` endpoints.

Checking the catalog at the time, **six models also exposed an Anthropic-compatible `/v1/messages` endpoint**:

| Model | Model ID | Endpoint |
|---|---|---|
| MiniMax M3 | minimax-m3 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.7 | minimax-m2.7 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.5 | minimax-m2.5 | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Max | qwen3.7-max | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Plus | qwen3.7-plus | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.6 Plus | qwen3.6-plus | `https://opencode.ai/zen/go/v1/messages` |

Dropping the endpoint straight into my config looked simple enough, until two small traps sent the error messages pointing in the wrong direction.

## Trap One: “Model Does Not Exist” Was a Duplicate `/v1`

I started by copying the documented base path verbatim:

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

Claude Code immediately complained:

```text
There's an issue with the selected model (qwen3.7-max). It may not exist
or you may not have access to it. Run /model to pick a different model.
```

Testing `/zen/go/v1/models` and `/zen/go/v1/messages` with `curl` worked fine. Running `claude -p "hi" --debug` finally revealed the actual request:

```text
post https://opencode.ai/zen/go/v1/v1/messages?beta=true failed with status 404
```

The path had become `/zen/go/v1/v1/messages`—an extra `/v1`.

Claude Code automatically appends `/v1/messages` to `ANTHROPIC_BASE_URL`. Hitting the doubled path returned the site’s generic 404 HTML page, which the client surfaced as “model does not exist or you may not have access to it.”

Trimming `/v1` from the base URL fixed the path:

```json
"ANTHROPIC_BASE_URL": "https://opencode.ai/zen/go"
```

## Trap Two: `Missing API key` Was the Wrong Auth Header

With the URL fixed, the error shifted to a 401:

```text
✻ 401 Missing API key. · Retrying in 22s · attempt 7/10
```

As documented in Claude Code’s [environment variable reference](https://code.claude.com/docs/en/env-vars), the two auth variables send different HTTP headers:

| Variable | Header Sent |
|---|---|
| `ANTHROPIC_API_KEY` | `x-api-key: ...` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer ...` |

Because I had set `ANTHROPIC_AUTH_TOKEN`, Claude Code only sent `Authorization: Bearer`. OpenCode Go’s gateway expects `x-api-key` and rejects Bearer tokens with `401 Missing API key`:

```bash
# Authorization: Bearer -> 401
curl -sS -w "\nHTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "Authorization: Bearer sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"qwen3.7-max","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}'

# x-api-key -> 200
curl -sS -w "\nHTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "x-api-key: sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"qwen3.7-max","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}'
```

Switching the variable name to `ANTHROPIC_API_KEY`—and confirming the key prompt on first interactive launch—brought the session online.

## Working Configuration

Here is the complete `~/.claude/settings.json`:

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

```text
▐▛███▜▌   Claude Code v2.1.205
▝▜█████▛▘  qwen3.7-max with high effort
❯ 你好
  Thought for 6s
● 你好！有什么可以帮你的吗？
```

Claude Code’s [model configuration docs](https://code.claude.com/docs/en/model-config) also list `CLAUDE_CODE_SUBAGENT_MODEL` and `*_MODEL_NAME` display variables if you want separate subagent routing or custom labels.

## Takeaway

Neither terminal error pointed directly to the culprit—one blamed the model name for a 404, and the other blamed a missing key for a header mismatch. Whenever a third-party gateway refuses to connect, running:

```bash
claude -p "hi" --debug 2> debug.log
```

to inspect the outgoing URL and status code (see the [CLI reference](https://code.claude.com/docs/en/cli-reference)) saves a lot of guesswork. Models on OpenCode Go that only speak `chat/completions` (such as GLM, Kimi, DeepSeek, and MiMo) still require a protocol translation proxy in between.
