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

## 为什么做这个项目？

最近在折腾 MCP 生态时，我发现“让模型直接拼 SQL 并执行”很容易把两件事混在一起：模型是否理解了库表，和账号是否真的被允许执行该操作。能跑不等于边界清楚。

我希望把 openGauss 的常见操作拆成结构化的 MCP 工具，让查看表结构、查询统计信息和执行 SQL 各有明确入口。这样可以检查模型有没有先取得必要信息，再单独判断执行操作是否得到授权。

于是有了 **opengauss-mcp**。

## 它能做什么？

opengauss-mcp 是一个基于 **Spring AI MCP Server** 的工具服务，主要面向 openGauss 数据库场景。  
通过 MCP 客户端以 stdio 方式接入后，可以调用数据库相关工具完成常见操作。接入前应为它配置权限最小化的数据库账号；不要把拥有生产写权限的连接直接交给任何 Agent。

目前核心能力包括：

- **表结构查看**：快速读取表字段、类型等结构信息，先看清再下手。
- **统计信息查询**：获取数据库统计数据，为分析和优化提供依据。
- **SQL 执行**：执行 SQL，便于联调、验证和自动化流程整合；调用方仍应自行限制账号权限、目标环境和允许的操作范围。

## 技术方案

这些操作通过 MCP 暴露给客户端，具体分工如下：

- 用 Spring AI MCP Server 管理工具注册与调用链路。
- 用 stdio 作为 MCP 连接方式，方便本地开发与桌面客户端集成。
- 保持工具边界清晰，让“查看结构”“查询统计”“执行 SQL”各自独立，便于组合。

这种设计把“先查看什么”“再执行什么”拆成可审查的调用步骤。它不自动保证安全或审计：日志留存、账号授权、事务策略、是否允许 DDL/DML，仍应由部署者明确决定。

## 开源与计划

仓库已经开源，欢迎试用、提建议、提 Issue 或 PR。

- **GitHub 仓库**: [Sanjeever/opengauss-mcp](https://github.com/Sanjeever/opengauss-mcp)

接下来计划补充元数据查询、改进错误反馈，并完善配置与调用示例，让接入者能逐步检查连接、工具发现和实际查询是否正常。
