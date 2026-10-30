---
title: 模汇
date: 2026-08-12
tags:
  - 开源
  - AI
  - Go
  - 协议网关
description: 我开源了模汇（Model Confluence），一个面向个人自部署的 AI 协议网关，在三种主流协议之间双向转换并记录每次请求的完整轨迹。
outline: deep
aside: true
---

# 模汇

<!-- DESC SEP -->

我开源了模汇（Model Confluence），一个面向个人自部署的 AI 协议网关，在三种主流协议之间双向转换并记录每次请求的完整轨迹。

<!-- DESC SEP -->

日常在 Codex、Claude Code 和各种脚本之间切换时，协议总是对不上：Codex 走 OpenAI Responses，Claude Code 走 Anthropic Messages，不少老脚本还在调 OpenAI Chat Completions。

上游供应商同样五花八门，几把 API Key 散落在不同客户端的配置里。哪天一把 Key 触发了限流，就得挨个改配置；要是请求报错，也很难一眼看清它到底打到了哪个上游、倒在了哪一步。

为此我写了 **模汇（Model Confluence）**。客户端只需填一个本地地址、一把访问密钥和一个虚拟模型名；供应商、真实模型、协议转换和 Key 池都收进网关里统一打理。

## 它是怎样工作的

模汇面向个人私有部署，对外提供四个入口：

- `/v1/chat/completions`（OpenAI Chat Completions）
- `/v1/responses`（OpenAI Responses）
- `/v1/messages`（Anthropic Messages）
- `/v1/models`（返回已配置的虚拟模型）

整个项目用 Go、React 和 TypeScript 编写，前端管理界面直接打包进单个 Go 可执行文件里，配置与请求记录存在本地 SQLite，不需要额外部署 Node.js 或外部数据库。

## 三种协议，九种组合

三个客户端入口与三种上游协议两两组合，分成两条路径处理：

| 客户端入口 | 上游 Chat Completions | 上游 Responses | 上游 Messages |
| --- | --- | --- | --- |
| `/v1/chat/completions` | 治理式透传 | 双向转换 | 双向转换 |
| `/v1/responses` | 双向转换 | 治理式透传 | 双向转换 |
| `/v1/messages` | 双向转换 | 双向转换 | 治理式透传 |

- **同协议透传**：尽量不动原始请求体和流式事件，只替换鉴权头与模型名，保留上游供应商的扩展字段。
- **跨协议转换**：先解析成内部统一结构，再编码成目标协议，支持文本、多轮对话、工具调用和流式输出；遇到目标协议无法表达的字段则提前报错，绝不静默丢弃内容。

## 虚拟模型与多 Key 轮换

客户端只认虚拟模型名（比如 `coding-main`），背后可以挂载多个有序的上游候选。路由时会先按请求所需的能力（流式、工具调用、推理强度等）筛掉不匹配的候选，再优先挑选同协议入口。

同一个供应商下可以挂多把 API Key：

- 遇到 `401` 或额度耗尽，自动切下一把 Key；
- 遇到 `429`，按冷却时间避让；
- 遇到连接超时或 `5xx`，切往下一个候选上游；
- 流式响应一旦写出首个有效内容，就不再中途切换，避免把两个上游的半截话拼在一起。

## 看得见的请求轨迹

模汇把每次客户端请求（`request`）和每次上游尝试（`attempt`）分开记录。遇到跨协议转换时，后台会同时存下四份报文：客户端原始请求、转换后的上游请求、上游原始响应、转换后的客户端响应。

当 Claude Code 突然报错时，点开后台就能直接看到它用了哪个虚拟模型、试过哪几把 Key、转换成了什么格式，以及上游返回的原始报错。

## 部署与使用

可以直接跑单文件二进制：

```powershell
$env:MODEL_CONFLUENCE_ADMIN_PASSWORD = '请替换为管理员密码'
./model-confluence.exe --listen 127.0.0.1:8080 --data-dir ./data
```

也可以用 Docker 启动：

```bash
docker run -d --name model-confluence \
  -p 127.0.0.1:8080:8080 \
  -v model-confluence-data:/data \
  -e MODEL_CONFLUENCE_ADMIN_PASSWORD='请替换为管理员密码' \
  ghcr.io/sanjeever/model-confluence:latest
```

打开管理后台后，按顺序建好客户端访问密钥、上游供应商和虚拟模型，就能用 `curl` 验证：

```powershell
curl.exe http://127.0.0.1:8080/v1/chat/completions `
  -H 'Authorization: Bearer mc_your_access_key' `
  -H 'Content-Type: application/json' `
  -d '{"model":"your-virtual-model","messages":[{"role":"user","content":"你好"}],"stream":false}'
```

注意 `./data` 目录下的 SQLite 数据库里存有明文密钥与完整的请求载荷，请务必限制好目录读取权限，不要把数据目录提交进 Git。

## 与常见同类项目的侧重点对比

| 项目 | 定位 | 侧重点 |
| --- | --- | --- |
| [模汇](https://github.com/Sanjeever/model-confluence) | 个人自部署协议网关 | 三协议双向转换、虚拟模型路由、每次尝试的原始报文追踪 |
| [new-api](https://github.com/QuantumNous/new-api) / [one-api](https://github.com/songquanpeng/one-api) | 模型聚合与分发平台 | 多渠道分发、多用户额度、计费与团队管理 |
| [sub2api](https://github.com/Wei-Shaw/sub2api) | 订阅接入与中转 | 围绕订阅账号的共享与转换 |
| [cc-switch](https://github.com/farion1231/cc-switch) | 客户端配置管理 | 桌面端快速切换客户端配置与本地代理 |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | CLI 账号代理 | OAuth 账号接入与兼容接口 |
| [GT AI Gateway](https://github.com/alexazhou/gt_ai_gateway) | 轻量协议网关 | 协议转换、缓存与可视化 |

如果你需要的不是多租户分发和计费，而是想在自己的机器上把散乱的协议、供应商和排错日志归拢到一处，欢迎试试模汇：

- **GitHub 仓库**：[Sanjeever/model-confluence](https://github.com/Sanjeever/model-confluence)
- **安装包与镜像**：[GitHub Releases](https://github.com/Sanjeever/model-confluence/releases/latest)
