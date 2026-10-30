---
title: 在 Claude Code 里用 OpenCode Go
date: 2026-07-09
tags:
  - Claude Code
  - OpenCode
  - OpenCode Go
  - 踩坑
description: 记录在 Claude Code v2.1.205 接入 OpenCode Go 时踩到的两个坑：BASE_URL 多写的 /v1 与鉴权头格式。
outline: deep
aside: true
---

# 在 Claude Code 里用 OpenCode Go

<!-- DESC SEP -->

记录在 Claude Code v2.1.205 接入 OpenCode Go 时踩到的两个坑：BASE_URL 多写的 `/v1` 与鉴权头格式。

<!-- DESC SEP -->

## 为什么想把 OpenCode Go 接到 Claude Code

[OpenCode Go](https://opencode.ai/docs/zh-cn/go) 是 OpenCode 推出的模型订阅服务，在它自家的 TUI 里接入很顺手：`/connect` 选 `OpenCode Go`，贴上 API Key，`/models` 就能拉出列表。

不过我平时顺手的 CLI 还是 Claude Code。麻烦在于，Claude Code 原生只认 Anthropic 的 Messages API，而 OpenCode Go 里大多数模型走的是 OpenAI 兼容的 `chat/completions`。

翻看当时的模型列表，有 **6 个模型同时提供了 Anthropic 格式的 `/v1/messages` 端点**：

| 模型 | 模型 ID | 端点 |
|---|---|---|
| MiniMax M3 | minimax-m3 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.7 | minimax-m2.7 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.5 | minimax-m2.5 | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Max | qwen3.7-max | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Plus | qwen3.7-plus | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.6 Plus | qwen3.6-plus | `https://opencode.ai/zen/go/v1/messages` |

以为把端点填进去就能跑，结果连踩了两个坑，而且界面报错全都指错了方向。

## 坑一：报“模型不存在”，其实是 URL 多了 `/v1`

起初我照着官方端点原样填进配置：

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

一启动，Claude Code 报：

```text
There's an issue with the selected model (qwen3.7-max). It may not exist
or you may not have access to it. Run /model to pick a different model.
```

用 `curl` 测了一圈 `/zen/go/v1/models` 和 `/zen/go/v1/messages`，模型在，流式返回也正常。直到跑了 `claude -p "hi" --debug` 把真实请求抓出来，才看到病根：

```text
post https://opencode.ai/zen/go/v1/v1/messages?beta=true failed with status 404
```

路径变成了 `/zen/go/v1/v1/messages`——多了一截 `/v1`。

Claude Code 会自动在 `ANTHROPIC_BASE_URL` 后面拼接 `/v1/messages`。打到不存在的路径后，对端返回了站点的 404 HTML 页面，被客户端笼统地展示成了“模型不存在或无权限”。

把末尾的 `/v1` 去掉即可：

```json
"ANTHROPIC_BASE_URL": "https://opencode.ai/zen/go"
```

## 坑二：报 `Missing API key`，其实是鉴权头不对

路径改对后，报错换成了 401：

```text
✻ 401 Missing API key. · Retrying in 22s · attempt 7/10
```

查阅 Claude Code 的[环境变量文档](https://code.claude.com/docs/en/env-vars)，两个鉴权变量发出的请求头并不一样：

| 环境变量 | 发送的请求头 |
|---|---|
| `ANTHROPIC_API_KEY` | `x-api-key: ...` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer ...` |

我配的是 `ANTHROPIC_AUTH_TOKEN`，客户端只发 `Authorization: Bearer`；而 OpenCode Go 网关只认 `x-api-key`。用 `curl` 对比一眼就能看清：

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

把环境变量名改成 `ANTHROPIC_API_KEY`，交互模式下首次启动确认使用该 Key，会话就顺利接通了。

## 可用配置

最终放进 `~/.claude/settings.json` 的完整配置：

```json
{
  "env": {
    "ANTHROPIC_API_KEY": "sk-你的 OpenCode Go API key",
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

[Claude Code 模型配置文档](https://code.claude.com/docs/en/model-config)里还提供了 `CLAUDE_CODE_SUBAGENT_MODEL` 以及一组 `*_MODEL_NAME` 显示名称变量，需要细分主模型与子代理模型时可以按需加上。

## 小结

回看这两个坑，终端面上的报错一个怪模型、一个怪缺 Key，都没直接说出 URL 拼接和请求头格式的差异。遇到第三方兼容网关连不上时，先跑一行：

```bash
claude -p "hi" --debug 2> debug.log
```

看一眼实际发出去的 URL 和状态码（更多参数见 [CLI 参考文档](https://code.claude.com/docs/en/cli-reference)），往往比来回换模型省事得多。至于列表里只提供 `chat/completions` 的模型（如 GLM、Kimi、DeepSeek、MiMo），就得靠协议转换层中转，不能直接填进这套配置了。
