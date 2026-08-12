---
title: Model Confluence
date: 2026-08-12
tags:
  - Open Source
  - AI
  - Go
  - Protocol Gateway
description: Model Confluence is a self-hosted AI protocol gateway that gives Codex, Claude Code, and OpenAI-compatible clients one common entry point.
outline: deep
aside: true
---

# Model Confluence

<!-- DESC SEP -->

I open-sourced Model Confluence, an AI protocol gateway for Codex, Claude Code, and OpenAI-compatible clients. It converts between Chat Completions, Responses, and Messages, while recording the upstream route, token usage, and latency for every request.

<!-- DESC SEP -->

I often switch between Codex, Claude Code, and ordinary scripts. Codex uses OpenAI Responses. Claude Code uses Anthropic Messages. Many scripts still use OpenAI Chat Completions.

Upstream providers differ too. Some expose Chat Completions. Others expose Responses or Messages. Once several API keys live in different client configurations, the setup becomes scattered. When a key is rate-limited, I have to edit the clients again. When a request fails, I often cannot tell which upstream handled it.

So I built Model Confluence. A client only needs one endpoint, one access key, and one virtual model. The gateway holds the providers, real models, protocols, and key pools. The admin console records the path taken by each request.

## What Is Model Confluence?

Model Confluence is designed for personal self-hosting. It provides four endpoints:

- `/v1/chat/completions`: OpenAI Chat Completions;
- `/v1/responses`: OpenAI Responses;
- `/v1/messages`: Anthropic Messages;
- `/v1/models`: returns configured virtual models.

The admin console maps a virtual model to providers, real models, and protocol endpoints. Clients do not need to know the real model name.

The project uses Go, React, and TypeScript. The admin UI is embedded into the Go executable. Running it does not require Node.js or a separate database. SQLite stores the configuration and usage records. The project provides native binaries and a Docker image.

Model Confluence does not provide public relay, billing, top-ups, or multi-tenant operations. It focuses on protocols, routing, and request records for personal deployments.

## Three Protocols

The three client endpoints can connect to the three upstream protocols. That makes nine combinations:

| Client endpoint | Upstream Chat Completions | Upstream Responses | Upstream Messages |
| --- | --- | --- | --- |
| `/v1/chat/completions` | Managed passthrough | Bidirectional conversion | Bidirectional conversion |
| `/v1/responses` | Bidirectional conversion | Managed passthrough | Bidirectional conversion |
| `/v1/messages` | Bidirectional conversion | Bidirectional conversion | Managed passthrough |

Same-protocol requests use managed passthrough. Cross-protocol requests use bidirectional conversion.

### Same Protocol: Pass Through as Much as Possible

Same-protocol requests still go through the gateway. The gateway handles only what it needs to handle:

- Replace upstream authentication;
- replace the virtual model name with the real model name;
- merge the provider's static headers;
- record the request, response, token usage, and latency;
- replace the real model name with the virtual model name in the client response.

Request bodies, responses, and streaming events stay as close to the upstream format as possible. Provider-specific fields can remain intact.

### Cross Protocol: Bidirectional Conversion

The gateway first decodes a cross-protocol request into an internal common structure. It then encodes that structure for the upstream protocol. Responses and SSE events follow the reverse path.

For example:

- Codex uses `/v1/responses`, while the upstream only provides Chat Completions;
- Claude Code uses `/v1/messages`, while the upstream only provides an OpenAI-compatible API;
- a Chat Completions client calls a provider that only offers Messages.

The conversion covers the shared capabilities of the three protocols. Model Confluence handles text, multi-turn messages, tool calls, and streaming responses. Unsupported fields return an error before the upstream call. The gateway does not silently drop content.

## One Virtual Model, Multiple Upstreams

Clients use a virtual model name. Providers use real model names. The two are configured separately.

A virtual model can have multiple ordered candidates. Each candidate contains a provider, a real model, and one or more protocol endpoints. Clients do not need to know the real model name.

A candidate can also declare:

- whether it supports streaming;
- whether it supports tool calls and parallel tool calls;
- which reasoning levels it supports;
- the default and maximum output token limits;
- the fallback order for protocol endpoints.

The router first filters out candidates that cannot satisfy the request. It then follows the candidate order. When a candidate supports the client's protocol, the router prefers that endpoint. Otherwise, it uses the configured fallback protocol.

Changing a provider, replacing a real model, or adding a fallback route does not require a client configuration change.

## Multiple API Keys

A provider can have multiple upstream API keys. Model Confluence manages them in order and decides whether to switch based on the error type.

The rules are straightforward:

- `401`: the current key has failed authentication; try the next key;
- quota exhaustion: mark the current key and try the next key;
- `429`: follow the provider configuration and cooldown;
- connection failures, timeouts, and `5xx`: try the next candidate;
- ordinary parameter errors: return the error to the client.

A streaming request can switch before the first valid content is written. After the first valid content is written, the gateway stops switching. It never joins two upstream responses together.

This reduces the number of client configuration changes. The request record also keeps the reason for each switch.

## Request Records

Model Confluence stores one inbound request separately from each upstream attempt. One `request` represents one client request. One `attempt` represents one provider and key attempt.

The admin console shows:

- request ID, status, and time;
- inbound protocol, upstream protocol, and endpoint;
- virtual model, real model, provider, and upstream key;
- the order, error, and completion time of each attempt;
- input, output, and cached tokens;
- total latency and time to first content;
- raw streaming and non-streaming payloads.

For a converted request, the console keeps four payloads:

1. The original client request;
2. the converted upstream request;
3. the original upstream response;
4. the converted client response.

After a Claude Code request fails, I can see the virtual model it used, the keys it tried, the upstream protocol it selected, and the original error.

I want the console to answer three questions: where did the request go, why did it switch, and what did it return?

## Running and Configuring It

The admin UI is embedded into the Go executable. Running it takes one file and one data directory:

```powershell
$env:MODEL_CONFLUENCE_ADMIN_PASSWORD = 'replace-with-admin-password'
./model-confluence.exe --listen 127.0.0.1:8080 --data-dir ./data
```

You can also use Docker:

```bash
docker run -d --name model-confluence \
  -p 127.0.0.1:8080:8080 \
  -v model-confluence-data:/data \
  -e MODEL_CONFLUENCE_ADMIN_PASSWORD='replace-with-admin-password' \
  ghcr.io/sanjeever/model-confluence:latest
```

After opening the admin console, the setup takes four steps:

1. Create an access key for clients;
2. add a provider, protocol endpoint, and upstream key;
3. create a virtual model and order its candidates;
4. point the client to the common endpoint and virtual model.

After configuration, use a Chat Completions request to verify the gateway:

```powershell
curl.exe http://127.0.0.1:8080/v1/chat/completions `
  -H 'Authorization: Bearer mc_your_access_key' `
  -H 'Content-Type: application/json' `
  -d '{"model":"your-virtual-model","messages":[{"role":"user","content":"Hello"}],"stream":false}'
```

Native releases and the Docker image are available from the project's [GitHub Releases](https://github.com/Sanjeever/model-confluence/releases/latest). The source code is at [Sanjeever/model-confluence](https://github.com/Sanjeever/model-confluence).

The current version stores access keys, provider keys, request headers, request bodies, and response bodies in SQLite as-is. The admin console can also show the full credentials. Protect the data directory as sensitive data. Allow access only for trusted system users. Put a public deployment behind an HTTPS reverse proxy. Do not commit the database or exports with real keys to Git. Do not let multiple processes share the same data directory.

Full request records require this trade-off. Make sure it fits your deployment.

## How It Differs from Other Projects

These projects have different focuses. The table below compares the main problem each one addresses.

| Project | Primary use | Main focus | Model Confluence's focus |
| --- | --- | --- | --- |
| [Model Confluence](https://github.com/Sanjeever/model-confluence) | Self-hosted AI protocol gateway | Three protocols, virtual models, multiple providers, key pools, request records | Protocol routing and request details |
| [new-api](https://github.com/QuantumNous/new-api) | Model aggregation and distribution platform | Multiple models and channels, organization management, usage and cost analysis | Narrower scope and simpler configuration |
| [one-api](https://github.com/songquanpeng/one-api) | LLM API management and redistribution | Provider channels, keys, users, quotas, and groups | More focused on API distribution and operations |
| [sub2api](https://github.com/Wei-Shaw/sub2api) | Subscription access and relay | Claude, OpenAI, Gemini, and Grok subscriptions and sharing | Focuses on subscriptions; Model Confluence uses self-managed providers and API keys |
| [CC Switch](https://github.com/farion1231/cc-switch) | AI coding client configuration manager | Switching Claude Code, Codex, and other client configurations | Runs on the client side and can complement Model Confluence |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | CLI account proxy | CLI access, OAuth, multiple accounts, and compatible APIs | Focuses on protocol conversion and key pools |
| [GT AI Gateway](https://github.com/alexazhou/gt_ai_gateway) | Lightweight protocol gateway | Protocol conversion, multiple upstreams, request visualization, caching, and deployment options | The closest in positioning, with a different emphasis |

new-api and one-api are suited to model, channel, and API distribution management. sub2api and CLIProxyAPI focus on subscription or CLI account access. CC Switch focuses on switching local client configurations.

GT AI Gateway is the closest match in positioning. Model Confluence currently focuses on three protocols, virtual models, key-pool routing, and request-level records. The console shows which upstream handled a request, what a cross-protocol request became, and which routes were tried before failure.

## Closing

The name “Model Confluence” comes from a simple idea. Models, providers, key pools, and protocols meet at one entry point. Requests then follow the configured route upstream.

I built Model Confluence to solve four problems: protocol conversion, multiple-key routing, virtual models, and request records.

Let protocols converge at the boundary. Make every request traceable.

Project repository: [Sanjeever/model-confluence](https://github.com/Sanjeever/model-confluence). Issues and pull requests are welcome.
