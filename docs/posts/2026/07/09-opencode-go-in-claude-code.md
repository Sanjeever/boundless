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

[OpenCode Go](https://opencode.ai/docs/zh-cn/go) 是 OpenCode 的模型订阅服务。本文记录的方案是首月 5 美元，之后每月 10 美元；当时的服务说明称，模型托管在美国、欧盟和新加坡，不保留数据、不用于训练。这些是服务方的说明，不是本文独立验证的结果。

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

这张表记录当时列出的 6 个兼容端点；下文展示的实际会话使用 qwen3.7-max，不能据此推定每个模型的工具调用与上下文能力。其它模型是否可用，请以当前 OpenCode 文档为准；若协议不兼容，需要增加转换层，本文不覆盖。

本文要记的是：**端点兼容还不够，base URL 和鉴权头也必须对上。我在这两处踩了坑，界面提示却没有直接指出原因。**

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

那条打到不存在路径上的请求，返回的是 opencode 网站的 **404 HTML 页**（`<title>404 - Page Not Found</title>`），不是 JSON 错误。界面最后显示了“模型不存在或没权限”。这能说明本次错误被笼统呈现，不能说明客户端内部怎样解析了响应，或所有错误都会得到同一提示。

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

下面保留当时记录的 curl 片段，用来说明两种鉴权头的区别。它不是完整的成功请求示例：请求体只有 `{}`，中文片段的第二条命令还缺少 `-o` 的输出目标。因此，注释中的 200 不能由这段命令本身证明；复现时需要有效 key、完整 Messages 请求体和正确的命令参数。

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

## 模型映射和其他变量

配置时我顺手抄了一堆带 `_NAME` 后缀、和 `FABLE` / `REASONING` 字样的变量。这里需要分清模型映射与显示名称。[Claude Code 官方文档](https://code.claude.com/docs/en/model-config)在较新版本中明确列出了 `_NAME` 等变量，把它们一概判为“不读取”并不准确。下面区分用途，前面的接入配置仍对应本文记录的 v2.1.205。

| 变量 | 用途与版本范围 | 备注 |
|---|---|---|
| `ANTHROPIC_DEFAULT_OPUS_MODEL` | 模型映射 | 控制别名 `opus` 映射到哪个模型 |
| `ANTHROPIC_DEFAULT_SONNET_MODEL` | 模型映射 | 控制别名 `sonnet` |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL` | 模型映射 | 控制别名 `haiku` |
| `CLAUDE_CODE_SUBAGENT_MODEL` | 子代理模型 | 控制子代理用什么模型 |
| `ANTHROPIC_DEFAULT_OPUS_MODEL_NAME` | 较新文档列出 | 设置固定模型的显示名称，不改变模型 ID |
| `ANTHROPIC_DEFAULT_SONNET_MODEL_NAME` | 较新文档列出 | 同上，按客户端版本核对支持情况 |
| `ANTHROPIC_DEFAULT_HAIKU_MODEL_NAME` | 较新文档列出 | 同上 |
| `ANTHROPIC_DEFAULT_FABLE_MODEL` | 较新文档列出 | 控制 `fable` 映射，不能据此推定旧版本支持 |
| `ANTHROPIC_DEFAULT_FABLE_MODEL_NAME` | 较新文档列出 | 对应固定模型的显示名称 |
| `ANTHROPIC_REASONING_MODEL` | 本文未确认用途 | 不作为这次接入的配置依据 |

对这次接入，先保留完整配置里实际使用的变量即可。使用其他版本时，应重新核对变量的用途与支持情况。

## 为什么报错一直这么 misleading

回头看，这两个坑的报错信息都不可信：

- 坑一明明是 404，但提示是"模型不存在或无权限"；
- 坑二明明只发了 `Authorization`，但提示是"Missing API key"——网关要的是另一种 key，说"missing"也不能算错，但对用户来说它把方向带偏了。

两条提示分别指向模型和 key，却都省略了定位所需的信息：实际请求路径，以及网关接受哪一种鉴权头。直接检查这两项，比反复换模型更接近问题。

抓真实请求的方式：

```bash
claude -p "hi" --debug 2> debug.log
```

`-p` 是非交互模式，`--debug` 把 SDK 层的请求 URL、状态码、响应体都打出来。一眼就能看到打的是哪条路径、回了什么。这比在"模型不存在"这句话上反复试配置快得多。

## 一点边界

OpenCode Go 不是 Anthropic，模型也不是 Claude。这两套协议只在 `messages` 这一层接口上对齐了形状，能力上并不等价：

- `messages` 请求成功不等于工具调用、长上下文等行为都已兼容，还要按具体模型检查；
- 当时列表中只提供 `chat/completions` 的模型（GLM、Kimi、DeepSeek、MiMo）不能按本文配置直接接入，本文不覆盖协议转换；
- 这是第三方网关，不是 Anthropic 官方，出问题找 OpenCode，不是找 Anthropic。

这次记录确认的是 qwen3.7-max 的会话能够接通。排查时，URL 和鉴权头是两个独立条件，修好一个之后出现新错误，正好说明请求走到了下一步。
