---
title: opengauss-mcp
date: 2026-03-31
tags:
  - 开源
  - openGauss
  - MCP
  - Spring AI
  - 数据库
description: 我开源了 opengauss-mcp，一个基于 Spring AI MCP Server 的 openGauss 数据库工具服务。
outline: deep
aside: true
---

# opengauss-mcp

<!-- DESC SEP -->

我开源了 opengauss-mcp，一个基于 Spring AI MCP Server 的 openGauss 数据库工具服务。

<!-- DESC SEP -->

## 为什么做这个项目

折腾 MCP 工具链时，我发现如果只给模型一个“直接拼 SQL 并执行”的入口，很容易把两件事搅在一起：模型到底看懂库表结构没有，以及当前账号该不该执行这条语句。

把 openGauss 的常用操作拆成独立的 MCP 工具后，查看表结构、读取统计信息和执行 SQL 就有了各自的入口。模型先查了什么、后跑了什么，在调用记录里一目了然。

这便是 **opengauss-mcp** 的来历。

## 它能做什么

opengauss-mcp 基于 **Spring AI MCP Server** 构建，通过 `stdio` 接入本地开发工具或桌面端 MCP 客户端：

- **查看表结构**：读取表字段与类型，先看清结构再写查询。
- **查询统计信息**：获取数据库统计数据，辅助排查与调优。
- **执行 SQL**：跑具体的查询与验证语句。

接入时建议给它配一个最小权限的数据库账号，别把生产环境的写权限直接交到 Agent 手里。

## 开源地址

代码已经放在 GitHub 上，欢迎试用或提 Issue：

- **GitHub 仓库**：[Sanjeever/opengauss-mcp](https://github.com/Sanjeever/opengauss-mcp)
