---
title: openGauss MCP 工具服务发布
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

# openGauss MCP 工具服务发布

<!-- DESC SEP -->

我开源了 opengauss-mcp，一个基于 Spring AI MCP Server 的 openGauss 数据库工具服务。

<!-- DESC SEP -->

## 为什么做这个项目？

最近在折腾 MCP 生态时，我发现很多模型调用数据库时都还停留在“直接执行 SQL”的粗放模式。  
这类模式虽然能跑起来，但在真实场景里常常不够稳健：要么信息不足，要么操作不可控。

我希望把 openGauss 的常见能力，封装成结构化、可组合、可审计的 MCP 工具，让模型在做数据库任务时更加可靠。

于是有了 **opengauss-mcp**。

## 它能做什么？

opengauss-mcp 是一个基于 **Spring AI MCP Server** 的工具服务，主要面向 openGauss 数据库场景。  
通过 MCP 客户端以 stdio 方式接入后，可以直接调用数据库相关工具完成常见操作。

目前核心能力包括：

- **表结构查看**：快速读取表字段、类型等结构信息，先看清再下手。
- **统计信息查询**：获取数据库统计数据，为分析和优化提供依据。
- **SQL 执行**：在受控上下文中执行 SQL，便于联调、验证和自动化流程整合。

## 技术方案

项目核心目标不是“再包一层 JDBC”，而是把数据库交互能力变成清晰的 MCP 工具接口：

- 用 Spring AI MCP Server 管理工具注册与调用链路。
- 用 stdio 作为 MCP 连接方式，方便本地开发与桌面客户端集成。
- 保持工具边界清晰，让“查看结构”“查询统计”“执行 SQL”各自独立，便于组合。

这种设计方式的好处是：后续无论接入其他客户端，还是扩展更多数据库工具，整体成本都比较可控。

## 开源与计划

仓库已经开源，欢迎试用、提建议、提 Issue 或 PR。

- **GitHub 仓库**: [Sanjeever/opengauss-mcp](https://github.com/Sanjeever/opengauss-mcp)

接下来我会继续完善工具能力和使用体验，包括更丰富的元数据查询能力，以及更清晰的错误反馈。
