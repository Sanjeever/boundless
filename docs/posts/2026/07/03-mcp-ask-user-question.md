---
title: mcp-ask-user-question：让 Codex 也拥有 AskUserQuestion 体验
date: 2026-07-03
tags:
  - 开源
  - MCP
  - Codex
  - Claude Code
  - 工具
description: 因为受够了在 Codex 里只能打字回答 Agent 的提问，我做了一个兼容 AskUserQuestion 的便携 MCP 服务器。
outline: deep
aside: true
---

# mcp-ask-user-question：让 Codex 也拥有 AskUserQuestion 体验

<!-- DESC SEP -->

因为受够了在 Codex 里只能打字回答 Agent 的提问，我做了一个兼容 AskUserQuestion 的便携 MCP 服务器。

<!-- DESC SEP -->

## 先说清楚动机

最近一段时间，我越来越喜欢用 **grill-me / grilling** 这条路子来开发。

它原本叫 `grill-me`，现在已经迁移到 [grilling](https://github.com/mattpocock/skills/blob/main/skills/productivity/grilling/SKILL.md) (`grill-me` 只剩一个指向 `/grilling` 的壳)。它的核心思想我非常认可：在真正动手实现之前，Agent 应该一件事一件事地逼问我，把我脑子里的“大概是这样”逼成“确定就是这样”。

它的 SKILL.md 写得很克制，但几点要求正好戳中我：

- 逐个提问，每次只问一个，等我回答完再继续。一次性抛一堆问题，只会让人懵。
- 每个问题都给出它推荐的答案，而不是把决策成本全甩给我。
- 能通过看代码回答的，就先去看代码，别问我。
- 在我确认“我们达成共识”之前，不许开始实施。

这套流程的价值在于：它在错误发生之前就把分歧消掉。Agent 不再是“凭理解直接写”，而是“先把理解拿出来对一遍”。这比写完再返工，便宜得多。

## 但 Codex 没有 AskUserQuestion

这套体验在不同工具里，落差其实很大。

在 **Claude Code** 和 **OpenCode** 里，Agent 有内置的 `AskUserQuestion` 工具。它可以直接弹出一个结构化的问题——带标题、带选项、带推荐项——我点一下就回去了。来回很快，几乎不打断思路。

而在 **Codex** 里，没有这个工具。

 Agent 想问我的时候，只能在对话里把问题打印成一坨文本，我再自己打字回答。对 grilling 这种“一项一项追问”的工作流来说，这体验是断裂的：

- 选项没法被点击，我只能照着打字，还容易打错。
- 推荐项、header、multiSelect 这些结构化信号，到了文本里就糊成一团。
- 一问一答的组合拳，退化成了“读问题—想答案—敲键盘”的拉锯。

所以我就想：能不能给 Codex 也补上同一个工具，让两边的行为对齐？

于是有了 **mcp-ask-user-question**。

## 它解决的不是“能不能问”，而是“问得顺不顺”

理论上 Codex 当然能问，问题早就在文本里了。

差的不是能不能问，而是问与答之间的摩擦。AskUserQuestion 真正的好处，在于它把“向用户求证”这件事变成了一次轻量的、结构化的交互：选项摆好、推荐标好、点一下就走。这种摩擦差异，在 grilling 这种高频追问的工作流里会被放到很大——一次问答没感觉，二十次下来就是舒服和难受的区别。

mcp-ask-user-question 做的就是把这个工具以 MCP 服务器的方式补回去。

- **GitHub 仓库**: [Sanjeever/mcp-ask-user-question](https://github.com/Sanjeever/mcp-ask-user-question)

## 设计原则：先靠原生交互，兜底要显式

这个项目我在“默认行为”上很较真。

服务器默认的 provider 是 `auto`，而 `auto` **只使用 MCP 原生的 elicitation**（即客户端本机就能弹出的输入/确认 UI）。它不会偷偷去开终端、开浏览器、弹桌面对话框。

兜底路径是有的，但我要求它们必须是显式开启的：

| Provider | 状态 | 行为 |
|---|---|---|
| auto | stable | 客户端支持时走 MCP 表单 elicitation。 |
| elicitation | stable | 强制走 MCP 表单 elicitation。 |
| terminal | experimental | 从挂在进程上的 TTY 读输入，写在 stdout 之外，不污染 MCP 的 stdio。 |
| desktop | planned | 预留。 |
| web | planned | 预留。 |

为什么这么分？因为向用户提问这种动作，天然涉及“用什么界面打扰人”。我不希望一个“便携服务器”在用户不知情的情况下，替他决定弹出哪种对话框。`auto` 只走原生，兜底只能你显式点名——这是边界，不是默认。

## 工具形状：和 Claude Code 对齐

服务器只暴露一个工具：`AskUserQuestion`。

输入和 Claude Code 那个 `AskUserQuestion` 是兼容的形状：

```json
{
  "questions": [
    {
      "question": "状态管理用哪个库？",
      "header": "状态管理",
      "options": [
        {
          "label": "Zustand (Recommended)",
          "description": "轻量、样板少、和 TypeScript 配合好"
        },
        {
          "label": "Redux Toolkit",
          "description": "功能全、生态大、样板多"
        }
      ],
      "multiSelect": false
    }
  ]
}
```

几个约束：

- `questions`：1 到 4 个。
- `options`：2 到 4 个。
- `header`：最多 12 个字符。
- 不要自带 `Other`，服务器会自动补一个。
- `preview` 可以放，但原生客户端渲染方式不保证一致。

返回值是结构化的，而不是一坨文本：

- `answered`：带 `answers`，记录每个问题选了哪个选项。
- `cancelled`：用户中途取消。
- `declined`：用户拒绝提这个问。

多问题时是“全有或全无”——后面的问题如果被取消或拒绝，前面已答的也不会返回。这一点是刻意保持明确的：不要让 Agent 在残留数据上猜。

## 在 Codex 里用起来

直接 `npx` 就行：

```bash
npx -y mcp-ask-user-question
```

加到 Codex：

```bash
codex mcp add ask-user-question -- npx -y mcp-ask-user-question
```

或者改 `~/.codex/config.toml`：

```toml
[mcp_servers.ask-user-question]
command = "npx"
args = ["-y", "mcp-ask-user-question"]

[mcp_servers.ask-user-question.env]
ASK_USER_PROVIDER = "auto"
```

有一个坑必须说清楚：**Codex 需要显式放行 MCP elicitation**，否则工具调用会直接拿到 `declined`，根本不弹窗。在 `approval_policy` 的 granular 里把 `mcp_elicitations` 打开：

```toml
approval_policy = { granular = {
  sandbox_approval = true,
  rules = true,
  mcp_elicitations = true,
  request_permissions = true,
  skill_approval = true
} }
```

临时测一次：

```bash
codex -c 'approval_policy={granular={sandbox_approval=true,rules=true,mcp_elicitations=true,request_permissions=true,skill_approval=true}}'
```

还有一句更要命的：**别在需要提问的场景里用 `codex --yolo`**。`--yolo` 会绕过审批和沙箱，而 Codex 把 MCP elicitation 当成需要用户确认的提示——在 yolo 模式下，这种提示可能在你看到表单之前就被自动拒绝了。

如果你要的是“文件/命令随便跑，但用户提问还是要弹窗”，那应该只放沙盒、保留 elicitation：

```bash
codex --sandbox danger-full-access -c 'approval_policy={granular={sandbox_approval=true,rules=true,mcp_elicitations=true,request_permissions=true,skill_approval=true}}'
```

## 一点边界说明

我没有为了“看上去更顺”去做静默兜底：

- 客户端不支持 elicitation 时，`auto` 不会偷偷换成终端模式。要不要换，由你在配置里点名。
- 服务器不去自动拉起任何 GUI。desktop / web 的 provider 是规划中的，不是现在偷偷能用的。
- 失败状态是分开的：`cancelled` 是用户主动撤的，`declined` 是用户拒了这个问。Agent 可以据此区分“不想答”和“不让我问”。

这和 Codex Quota 那篇里我坚持的取向是一致的：错了就明确说哪里错了，不要装作自己没错。

## 为什么值得单独发一篇

它真的很小，小到几行配置就跑起来了。

但它正好卡在我最近最在意的一个点上：**Agent 在动手前，是不是先来问我**。grilling 解决的是“问的内容和节奏”，AskUserQuestion 解决的是“问的形式和摩擦”，mcp-ask-user-question 解决的则是“在 Codex 这个客户端里，把这套能力补回来”。

这三件事拼在一起，开发体感才连续：Agent 会主动追问、追问有结构、而且不论我用哪个 CLI，都能用同一种方式被问到、用同一个动作回答。

对我自己来说，这是把 grilling 这条路子，从“只能在 Claude Code / OpenCode 用”扩到了“Codex 上也照样用”。

- **GitHub 仓库**: [Sanjeever/mcp-ask-user-question](https://github.com/Sanjeever/mcp-ask-user-question)

如果你也经常用 Codex 做开发，又想让 Agent 学会“先问、再写”，可以试试看。