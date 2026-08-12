---
title: 模汇
date: 2026-08-12
tags:
  - 开源
  - AI
  - Go
  - 协议网关
description: 模汇（Model Confluence）是一个面向个人私有部署的 AI 协议网关，为 Codex、Claude Code 和 OpenAI 兼容客户端提供统一入口。
outline: deep
aside: true
---

# 模汇

<!-- DESC SEP -->

我开源了模汇（Model Confluence）。它为 Codex、Claude Code 和 OpenAI 兼容客户端提供统一入口，在 Chat Completions、Responses 与 Messages 之间转换协议，并记录每一次请求的上游、Token 用量和延迟。

<!-- DESC SEP -->

我经常在 Codex、Claude Code 和普通脚本之间切换。Codex 使用 OpenAI Responses。Claude Code 使用 Anthropic Messages。很多脚本还在使用 OpenAI Chat Completions。

上游供应商也不统一。有的提供 Chat Completions，有的提供 Responses 或 Messages。多把 API Key 放进不同客户端后，配置很快就会变得零散。Key 被限流后，我要重新改配置。请求失败后，我常常不知道它用了哪个上游。

所以我做了模汇。客户端只保存一个地址、一个访问密钥和一个虚拟模型。供应商、真实模型、协议和 Key 池都在网关里配置。每次请求经过了什么路径，也能在后台查到。

## 模汇是什么？

模汇面向个人私有部署。它提供四个入口：

- `/v1/chat/completions`：OpenAI Chat Completions；
- `/v1/responses`：OpenAI Responses；
- `/v1/messages`：Anthropic Messages；
- `/v1/models`：返回已配置的虚拟模型。

后台把虚拟模型映射到供应商、真实模型和协议入口。客户端不需要知道真实模型名。

项目使用 Go、React 和 TypeScript。管理后台会嵌入 Go 可执行文件。运行时不需要 Node.js，也不需要额外部署数据库。配置和使用记录保存在 SQLite 中。项目提供原生可执行文件和 Docker 镜像。

模汇不提供公共中转、充值、计费和多租户运营。它只处理个人部署中的协议、路由和请求记录。

## 三种协议

三个客户端入口都可以连接三种上游协议，共有九种组合：

| 客户端入口 | 上游 Chat Completions | 上游 Responses | 上游 Messages |
| --- | --- | --- | --- |
| `/v1/chat/completions` | 治理式透传 | 双向转换 | 双向转换 |
| `/v1/responses` | 双向转换 | 治理式透传 | 双向转换 |
| `/v1/messages` | 双向转换 | 双向转换 | 治理式透传 |

同协议请求使用治理式透传。跨协议请求执行双向转换。

### 同协议：尽量原样转发

同协议请求会经过网关。网关只处理必要内容：

- 替换上游鉴权信息；
- 将虚拟模型名替换为真实模型名；
- 合并供应商配置的静态请求头；
- 记录请求、响应、Token 和延迟；
- 将响应中的真实模型名改回虚拟模型名。

请求体、响应和流式事件尽量保持原样。供应商的私有字段也能保留下来。

### 跨协议：双向转换

跨协议请求先解析为内部统一结构，再编码成上游协议。响应和 SSE 事件按相反方向处理。

下面是几个例子：

- Codex 使用 `/v1/responses`，上游只有 Chat Completions；
- Claude Code 使用 `/v1/messages`，上游只有 OpenAI 兼容接口；
- Chat Completions 客户端调用只提供 Messages 的供应商。

转换范围包括三种协议的公共能力。模汇会处理文本、多轮消息、工具调用和流式响应。无法对应的字段会在调用上游前返回错误。网关不会静默丢掉内容。

## 一个虚拟模型，连接多个上游

客户端使用虚拟模型名。供应商使用真实模型名。两者分开配置。

一个虚拟模型可以配置多个有序候选。每个候选包含供应商、真实模型和协议入口。客户端不需要知道真实模型的名字。

候选还可以声明这些能力：

- 是否支持流式响应；
- 是否支持工具调用和并行工具调用；
- 支持哪些推理强度；
- 默认和最大的输出 Token 数；
- 协议入口的后备顺序。

路由时，模汇先过滤能力不匹配的候选，再按候选顺序选择。候选支持客户端协议时，优先使用同协议入口。否则使用配置好的后备协议。

更换供应商、调整真实模型和增加后备路径，都不需要修改客户端配置。

## 多把 API Key

一个供应商可以配置多把上游 API Key。模汇按顺序管理这些 Key，并根据错误类型决定是否切换。

处理规则很简单：

- `401`：当前 Key 鉴权失效，尝试下一把 Key；
- 额度耗尽：标记当前 Key，尝试下一把 Key；
- `429`：按供应商配置和冷却时间处理；
- 连接失败、超时和 `5xx`：尝试下一个候选；
- 普通参数错误：直接返回客户端。

流式请求在首个有效内容写出前可以切换。写出首个有效内容后，网关停止切换。它不会拼接两个上游的响应。

这套规则能减少客户端改配置的次数。请求记录也会保存切换原因。

## 请求记录

模汇把一次客户端请求和每一次上游尝试分开保存。一条 `request` 对应一次入站请求。一条 `attempt` 对应一次供应商和 Key 的尝试。

后台可以查看：

- 请求 ID、状态和时间；
- 入站协议、上游协议和端点；
- 虚拟模型、真实模型、供应商和上游 Key；
- 每次尝试的顺序、错误和完成时间；
- 输入、输出和缓存 Token；
- 总耗时和首内容延迟；
- 流式与非流式的原始载荷。

发生协议转换时，后台会保存四份数据：

1. 客户端原始请求；
2. 转换后的上游请求；
3. 上游原始响应；
4. 转换后的客户端响应。

Claude Code 的请求失败后，可以查到它使用的虚拟模型、尝试过的 Key、实际使用的上游协议和原始错误。

我希望后台能回答三个问题：请求去了哪里，为什么切换，实际返回了什么。

## 运行和配置

管理后台会嵌入 Go 可执行文件。运行时只需要一个文件和一个数据目录：

```powershell
$env:MODEL_CONFLUENCE_ADMIN_PASSWORD = '请替换为管理员密码'
./model-confluence.exe --listen 127.0.0.1:8080 --data-dir ./data
```

也可以使用 Docker：

```bash
docker run -d --name model-confluence \
  -p 127.0.0.1:8080:8080 \
  -v model-confluence-data:/data \
  -e MODEL_CONFLUENCE_ADMIN_PASSWORD='请替换为管理员密码' \
  ghcr.io/sanjeever/model-confluence:latest
```

进入管理后台后，配置分四步：

1. 创建供客户端使用的访问密钥；
2. 添加供应商、协议端点和上游 Key；
3. 创建虚拟模型并配置候选顺序；
4. 让客户端使用统一地址和虚拟模型名发起请求。

配置完成后，可以用 Chat Completions 请求验证入口：

```powershell
curl.exe http://127.0.0.1:8080/v1/chat/completions `
  -H 'Authorization: Bearer mc_your_access_key' `
  -H 'Content-Type: application/json' `
  -d '{"model":"your-virtual-model","messages":[{"role":"user","content":"你好"}],"stream":false}'
```

原生版本和 Docker 镜像见项目的 [GitHub Releases](https://github.com/Sanjeever/model-confluence/releases/latest)。源码在 [Sanjeever/model-confluence](https://github.com/Sanjeever/model-confluence)。

当前版本会在 SQLite 中保存访问密钥、供应商密钥、请求头、请求体和响应体原文。管理员界面也可以查看完整凭据。数据目录需要按高敏感数据保护。只允许受信任的系统用户读取。公网部署时，请放在 HTTPS 反向代理之后。不要把数据库和带真实密钥的导出文件提交到 Git。不要让多个进程共享同一个数据目录。

完整请求记录需要这个取舍。使用前请确认自己能接受。

## 和其他项目的区别

这些项目的定位不同。下面只比较它们主要解决的问题。

| 项目 | 主要用途 | 关注重点 | 模汇的侧重点 |
| --- | --- | --- | --- |
| [模汇](https://github.com/Sanjeever/model-confluence) | 私有部署的 AI 协议网关 | 三种协议、虚拟模型、多供应商、多 Key、请求记录 | 协议路由和请求详情 |
| [new-api](https://github.com/QuantumNous/new-api) | 模型聚合与分发平台 | 多模型、多渠道、组织管理、使用分析和成本管理 | 模汇范围更窄，配置更简单 |
| [one-api](https://github.com/songquanpeng/one-api) | LLM API 管理与二次分发 | 多供应商渠道、Key、用户、额度和分组 | 更偏 API 分发和运营管理 |
| [sub2api](https://github.com/Wei-Shaw/sub2api) | 订阅接入与中转 | Claude、OpenAI、Gemini、Grok 等订阅和共享 | 重点是订阅接入，模汇使用自有供应商和 API Key |
| [cc-switch](https://github.com/farion1231/cc-switch) | AI 编程客户端配置管理 | Claude Code、Codex 等客户端的切换 | 运行在客户端侧，和模汇可以互补 |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | CLI 账号代理服务 | CLI 接入、OAuth、多账号和兼容 API | 重点是账号接入，模汇重点是协议转换和 Key 池 |
| [GT AI Gateway](https://github.com/alexazhou/gt_ai_gateway) | 轻量协议网关 | 协议转换、多上游、请求可视化、缓存和多种部署 | 与模汇最接近，侧重点各有不同 |

new-api 和 one-api 适合管理模型、渠道和 API 分发。sub2api 和 CLIProxyAPI 适合处理订阅或 CLI 账号接入。cc-switch 适合切换本地客户端配置。

GT AI Gateway 和模汇的定位最接近。模汇当前重点是三种协议、虚拟模型、多 Key 路由和请求级记录。客户端走了哪个上游，跨协议请求转换成了什么，失败前尝试过哪些路径，都能在后台查看。

## 写在最后

“模汇”这个名字来自一个简单的想法。模型、供应商、Key 池和协议在一个入口汇合。请求再按配置流向上游。

我做模汇，主要为了解决四件事：协议转换、多 Key 路由、虚拟模型和请求记录。

让协议在边界处汇合，让每一次请求都有迹可循。

项目地址：[Sanjeever/model-confluence](https://github.com/Sanjeever/model-confluence)。欢迎试用、提 Issue，或者直接查看代码。
