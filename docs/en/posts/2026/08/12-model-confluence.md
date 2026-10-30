---
title: Model Confluence
date: 2026-08-12
tags:
  - Open Source
  - AI
  - Go
  - Protocol Gateway
description: I open-sourced Model Confluence, a self-hosted AI protocol gateway that converts between Chat Completions, Responses, and Messages while logging every upstream attempt.
outline: deep
aside: true
---

# Model Confluence

<!-- DESC SEP -->

I open-sourced Model Confluence, a self-hosted AI protocol gateway that converts between Chat Completions, Responses, and Messages while logging every upstream attempt.

<!-- DESC SEP -->

Switching between Codex, Claude Code, and everyday scripts means juggling three different wire protocols: Codex speaks OpenAI Responses, Claude Code speaks Anthropic Messages, and most scripts still speak OpenAI Chat Completions.

Upstream providers are just as fragmented. Once a handful of API keys are scattered across half a dozen client config files, hitting a rate limit means editing configs by hand, and a failed request leaves you guessing which upstream actually answered.

So I built **Model Confluence**. Every client points to one local endpoint, one access key, and one virtual model name, while providers, real model IDs, protocol conversions, and key pools live inside the gateway.

## How It Works

Designed for personal self-hosting, Model Confluence exposes four endpoints:

- `/v1/chat/completions` (OpenAI Chat Completions)
- `/v1/responses` (OpenAI Responses)
- `/v1/messages` (Anthropic Messages)
- `/v1/models` (configured virtual models)

Built with Go, React, and TypeScript, the web console is embedded directly into a single Go binary and backed by SQLite—no Node.js runtime or external database required.

## Three Protocols, Nine Combinations

Any of the three client endpoints can route to any of the three upstream protocols:

| Client Endpoint | Upstream Chat Completions | Upstream Responses | Upstream Messages |
| --- | --- | --- | --- |
| `/v1/chat/completions` | Managed passthrough | Bidirectional conversion | Bidirectional conversion |
| `/v1/responses` | Bidirectional conversion | Managed passthrough | Bidirectional conversion |
| `/v1/messages` | Bidirectional conversion | Bidirectional conversion | Managed passthrough |

- **Same-protocol passthrough**: Preserves the original request body, provider-specific extensions, and SSE stream as closely as possible, swapping only auth headers and model names.
- **Cross-protocol conversion**: Normalizes requests into an internal representation and re-encodes them for the target protocol—covering text, multi-turn history, tool calls, and streaming—while rejecting unsupported fields upfront instead of silently dropping them.

## Virtual Models and Key Rotation

Clients reference a virtual model name, which maps to an ordered list of upstream candidates. At request time, the router filters out candidates that lack required capabilities (streaming, tool use, reasoning effort) and prefers native protocol matches before falling back to conversion.

Each provider can hold a pool of API keys:

- `401` or exhausted quota rotates immediately to the next key;
- `429` respects the provider cooldown window;
- timeouts and `5xx` errors fail over to the next candidate;
- once a streaming response has emitted its first content chunk, failover locks so two partial answers are never stitched together.

## Full Request Tracing

Model Confluence records each inbound `request` separately from each upstream `attempt`. When protocol conversion happens, it stores all four payloads: the raw client request, the converted upstream request, the raw upstream response, and the converted client response.

When a Claude Code turn fails, opening the console shows the exact virtual model, every key and candidate tried along the way, and the raw upstream error payload.

## Running It

Run the single binary directly:

```powershell
$env:MODEL_CONFLUENCE_ADMIN_PASSWORD = 'replace-with-admin-password'
./model-confluence.exe --listen 127.0.0.1:8080 --data-dir ./data
```

Or start it with Docker:

```bash
docker run -d --name model-confluence \
  -p 127.0.0.1:8080:8080 \
  -v model-confluence-data:/data \
  -e MODEL_CONFLUENCE_ADMIN_PASSWORD='replace-with-admin-password' \
  ghcr.io/sanjeever/model-confluence:latest
```

After setting up an access key, a provider, and a virtual model in the web UI, test the endpoint with `curl`:

```powershell
curl.exe http://127.0.0.1:8080/v1/chat/completions `
  -H 'Authorization: Bearer mc_your_access_key' `
  -H 'Content-Type: application/json' `
  -d '{"model":"your-virtual-model","messages":[{"role":"user","content":"Hello"}],"stream":false}'
```

Because SQLite stores API keys and full request/response payloads for debugging, keep `./data` restricted to trusted local users and out of version control.

## How It Compares to Related Projects

| Project | Focus | Strengths |
| --- | --- | --- |
| [Model Confluence](https://github.com/Sanjeever/model-confluence) | Personal self-hosted protocol gateway | 3-protocol conversion, virtual model routing, 4-way payload inspection per attempt |
| [new-api](https://github.com/QuantumNous/new-api) / [one-api](https://github.com/songquanpeng/one-api) | API aggregation & distribution | Multi-user quotas, billing, and channel management |
| [sub2api](https://github.com/Wei-Shaw/sub2api) | Subscription relay | Sharing and proxying subscription accounts |
| [CC Switch](https://github.com/farion1231/cc-switch) | Client config manager | Desktop switching for coding-agent configs and local proxying |
| [CLIProxyAPI](https://github.com/router-for-me/CLIProxyAPI) | CLI account proxy | OAuth CLI sessions exposed as compatible APIs |
| [GT AI Gateway](https://github.com/alexazhou/gt_ai_gateway) | Lightweight gateway | Protocol conversion, caching, and request visualization |

If you want a single self-hosted binary to unify protocols and see exactly what goes over the wire:

- **GitHub Repository**: [Sanjeever/model-confluence](https://github.com/Sanjeever/model-confluence)
- **Binaries & Docker Image**: [GitHub Releases](https://github.com/Sanjeever/model-confluence/releases/latest)
