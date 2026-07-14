---
title: 在 Claude Code 里用 OpenCode Go
date: 2026-07-09
tags:
  - Claude Code
  - OpenCode
  - OpenCode Go
  - 踩坑
description: 记录 2026-07-09 在 Claude Code v2.1.205 接入 OpenCode Go 时遇到的两个坑：BASE_URL 的 /v1 与鉴权头。
outline: deep
aside: true
---

# 在 Claude Code 里用 OpenCode Go

<!-- DESC SEP -->

本文记录我在 2026-07-09、Claude Code v2.1.205 中接入 OpenCode Go 时遇到的两个坑：BASE_URL 的 `/v1` 和鉴权头。模型、价格、端点与客户端行为都可能变化；动手前请先核对官方文档。

<!-- DESC SEP -->

## OpenCode Go 是什么，为什么想接到 Claude Code

[OpenCode Go](https://opencode.ai/docs/zh-cn/go) 是 OpenCode 自家的一条低成本订阅：首月 5 美元，之后每月 10 美元，换来一组精选开源编程模型的稳定访问。模型托管在美国、欧盟和新加坡，主打全球稳定接入，没有数据保留、不拿去训练。

它在 OpenCode 自己的 TUI 里当然是一等公民：`/connect` 选 `OpenCode Go`，粘 API key，`/models` 就能看到清单。

但我日常主用的 CLI 还是 Claude Code。问题来了：Claude Code 原生只认 Anthropic 的 Messages API，而 OpenCode Go 的模型列表里大部分走的是 OpenAI 兼容的 `chat/completions`。这两套协议不通用。

在当时的 OpenCode Go 模型列表中，有 **6 个模型同时提供 Anthropic 格式的 `/v1/messages` 端点**：

| 模型 | 模型 ID | 端点 |
|---|---|---|
| MiniMax M3 | minimax-m3 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.7 | minimax-m2.7 | `https://opencode.ai/zen/go/v1/messages` |
| MiniMax M2.5 | minimax-m2.5 | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Max | qwen3.7-max | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.7 Plus | qwen3.7-plus | `https://opencode.ai/zen/go/v1/messages` |
| Qwen3.6 Plus | qwen3.6-plus | `https://opencode.ai/zen/go/v1/messages` |

按当时的列表，本文只验证这 6 个模型。其它模型是否可用、是否仍只提供 `chat/completions`，请以当前 OpenCode 文档为准；若协议不兼容，需要在中途增加转换层，本文不覆盖。

本文要记的是：**就这 6 个能用的模型，我在配置时也踩了两个坑，而且报错信息全程在骗我。**

## 坑一：报"模型不存在"，其实是 URL 多了一个 `/v1`

我一开始按官方端点照搬，写成：

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

跑起来，Claude Code 给我一句：

```text
There's an issue with the selected model (qwen3.7-max). It may not exist
or you may not have access to it. Run /model to pick a different model.
```

第一反应是去查模型。`curl` 打 `/zen/go/v1/models`，模型列表里有 qwen3.7-max；打 `/zen/go/v1/messages`，streaming 也正常返回。后端一切看着都没问题，但 Claude Code 还在报同一句话。

直到我用 `claude -p "hi" --debug` 把真实请求抓出来，才看见这一行：

```text
post https://opencode.ai/zen/go/v1/v1/messages?beta=true failed with status 404
```

`/zen/go/v1` 后面跟了个 `/v1/messages`——**多了一个 `/v1`。**

原因很简单：Claude Code 会自动在 `ANTHROPIC_BASE_URL` 后面拼接 `/v1/messages`。所以 base URL 不能带 `/v1`，要么带，要么它带，两边只能带一个。我照着官方端点原样写，于是两边都带了。

那条打到不存在的路径上的 `/v1/v1/messages`，返回的是 opencode 网站自己的 **404 HTML 页**（`<title>404 - Page Not Found</title>`），不是 JSON 错误。Claude Code 收到这种非预期响应，没法解析，统一翻译成"模型不存在或没权限"。

修复就一行，把 base URL 末尾的 `/v1` 去掉：

```json
"ANTHROPIC_BASE_URL": "https://opencode.ai/zen/go"
```

让拼接交给 Claude Code 自己做。

## 坑二：报 "Missing API key"，其实是鉴权头不对

路径修对之后，错误变了：

```text
✻ 401 Missing API key. · Retrying in 22s · attempt 7/10
```

这次信息还算诚实——确实是鉴权不对。

Claude Code 有两套写 key 的环境变量，它们映射到两个不同的 HTTP 头：

| 环境变量 | 发送的头 |
|---|---|
| `ANTHROPIC_API_KEY` | `x-api-key: ...` |
| `ANTHROPIC_AUTH_TOKEN` | `Authorization: Bearer ...` |

我之前写的是 `ANTHROPIC_AUTH_TOKEN`，于是 Claude Code 只发 `Authorization`，**不发 `x-api-key`**。而 OpenCode Go 的网关认的是 `x-api-key`，对 `Authorization: Bearer` 直接回 401 Missing API key。

用 curl 验证特别清楚：

```bash
# 只带 Authorization —— 401
curl -s -o /dev/null -w "HTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "Authorization: Bearer sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" -d '{}'

# 只带 x-api-key —— 200
curl -s -o -w "HTTP %{http_code}\n" \
  https://opencode.ai/zen/go/v1/messages \
  -H "x-api-key: sk-..." \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" -d '{}'
```

修复同样是改名，把变量名换成 `ANTHROPIC_API_KEY`，值不变：

```json
"ANTHROPIC_API_KEY": "sk-..."
```

> 顺带一提：设置了 `ANTHROPIC_API_KEY` 之后，Claude Code 在交互模式下首次会提示你确认"用这个 key 而不是订阅"。没订阅的人直接确认即可。

## 一份能跑的完整配置

两个坑都填完，我用的是这个：

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

放进 `~/.claude/settings.json`。`model` 用 `opus` 别名，配合 `ANTHROPIC_DEFAULT_OPUS_MODEL`，实际打到 qwen3.7-max。

```text
▐▛███▜▌   Claude Code v2.1.205
▝▜█████▛▘  qwen3.7-max with high effort
❯ 你好
  Thought for 6s
● 你好！有什么可以帮你的吗？
```

通了。

## 几个没用的环境变量

配置时我顺手抄了一堆带 `_NAME` 后缀、和 `FABLE` / `REASONING` 字样的变量。查了 [Claude Code 官方文档](https://code.claude.com/docs/en/model-config)后确认：**它们 Claude Code 根本不读。**

| 变量 | 是否被读取 | 备注 |
|---|---|---|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 是 | 控制别名 `opus` 映射到哪个模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 是 | 控制别名 `sonnet` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 是 | 控制别名 `haiku`，以及后台子任务 |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 是 | 控制子代理用什么模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME` | 否 | 不存在 `_NAME` 后缀版 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME` | 否 | 同上 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME` | 否 | 同上 |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | 否 | `fable` 别名没有对应 env |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME` | 否 | 不存在 |
| `ANTHROPIC_REASONING_MODEL` | 否 | 不存在此变量 |

留它们不会出错，但纯属自我安慰，建议删掉，配置干净一点。

## 为什么报错一直这么 misleading

回头看，这两个坑的报错信息都不可信：

- 坑一明明是 404，但提示是"模型不存在或无权限"；
- 坑二明明只发了 `Authorization`，但提示是"Missing API key"——网关要的是另一种 key，说"missing"也不能算错，但对用户来说它把方向带偏了。

在我测试的 Claude Code v2.1.205 与该网关响应组合里，404/401 最终呈现为很接近的通用文案，且没有把 HTML 404 清楚地暴露出来。因此，接第三方网关时不应只相信界面提示，应该抓真实请求。不同客户端版本和网关实现的错误处理可能不同。

这件事我没什么好改的——前端客户端统一错误文案，是它自己的设计取舍。但对用户来说，**遇到这种报错的第一反应不应该是换模型，而是抓真实请求。**

抓真实请求的方式：

```bash
claude -p "hi" --debug 2> debug.log
```

`-p` 是非交互模式，`--debug` 把 SDK 层的请求 URL、状态码、响应体都打出来。一眼就能看到打的是哪条路径、回了什么。这比在"模型不存在"这句话上反复试配置快得多。

## 一点边界

OpenCode Go 不是 Anthropic，模型也不是 Claude。这两套协议只在 `messages` 这一层接口上对齐了形状，能力上并不等价：

- 没有 OpenCode Go 版的 tool use 增加、长上下文窗口保证等能力背书，能力取决于背后那 6 个模型本身；
- 这 6 个之外的 Go 模型（GLM、Kimi、DeepSeek、MiMo）只能走 `chat/completions`，**不能**直接喂给 Claude Code，本文不覆盖；
- 这是第三方网关，不是 Anthropic 官方，出问题找 OpenCode，不是找 Anthropic。

但对"想用 Claude Code 的交互体感、又想用便宜的开源模型跑日常任务"来说，这 6 个模型够用，配置也不复杂。两个坑过完之后，体验是连续的。

配置不复杂，但它把"配置写错"和"后端出问题"搅成同一种说法。这是这篇存在的全部理由。
