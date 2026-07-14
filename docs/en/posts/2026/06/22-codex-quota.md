---
title: Codex Quota
date: 2026-06-22
tags:
  - Open Source
  - Codex
  - Tauri
  - Tools
description: I open-sourced Codex Quota, a small local menu bar and system tray app for viewing Codex usage.
outline: deep
aside: true
---

# Codex Quota

<!-- DESC SEP -->

I open-sourced Codex Quota, a small local menu bar and system tray app for viewing Codex usage.

<!-- DESC SEP -->

## Why Build This?

Codex is becoming less like an occasional tool and more like something that stays in the everyday development workflow.

Once a tool enters daily use, quota stops being a number you check once in a while. It becomes a state you want to stay aware of. Especially when you are working through several tasks in a row, the last thing you want is to discover halfway through that the 5-hour quota is nearly gone, or that the weekly quota has already entered the danger zone.

The official page can show this information, of course. But opening the browser, going into settings, waiting for the page to load, and then returning to the editor is too long a path for something this small.

What I wanted was lower friction: something that does not interrupt me, but is visible when I need it.

That is how **Codex Quota** came to life.

## It Is Not About Seeing Data, but Reducing Context Switching

Codex Quota is an unofficial local Tauri desktop app.

On macOS, it appears in the menu bar with a title like:

```text
Codex 5h 96% | Weekly 36%
```

On Windows, it appears as a system tray icon and shows the current state through the tooltip and tray menu.

It focuses on a few direct questions:

- How much is left in the 5-hour window?
- How much weekly quota is left?
- When does it reset?
- Did the last refresh succeed?
- Is the currently displayed data stale?

None of this information is complicated. But if checking it always means opening a web page, it becomes a small repeated source of friction.

Many tools are valuable not because they provide an entirely new capability, but because they compress a frequent action from several steps into one.

That is what Codex Quota does.

## Why Not Use an API Key?

This project intentionally avoids the API key route.

The reason is simple: I do not want a quota-viewing utility to become another tool that asks you to manage secrets, paste tokens, or copy curl commands.

Codex Quota does not ask for an API key. It does not ask you to paste cookies, bearer tokens, or login credentials. It opens a local Tauri WebView, lets you sign in through the normal ChatGPT page, and then requests usage data from that already authenticated page runtime.

In other words, it reuses the ChatGPT session inside your local WebView instead of asking you to hand credentials to the app.

There is an important boundary here: the access token is only used inside the current WebView page runtime for the current request. It is not returned to Rust, not written to local storage, not shown in the Debug window, and not logged. That does not mean a WebView login state is risk-free; before installing or running any local application that can access a logged-in page, inspect its source and release artifact.

I want this tool to be transparent and restrained.

It simply takes information already visible on the web page and presents it in a way that fits desktop usage better.

## Local First, Not an Account Dashboard

Codex Quota has no server.

It does not upload your usage to a backend, sync account data, or try to become a team usage dashboard.

The current version only stores a few local settings:

- Refresh interval
- Launch at login
- Last successful usage snapshot
- Last updated time

These are stored in the Tauri app's own local data directory.

If a refresh fails but a previous successful snapshot exists, the tray still shows the old data and clearly marks it as stale. The goal is not to pretend the data is fresh, but to preserve the last useful reference point when the network fails, the endpoint errors, or the login session expires.

The design is plain: be accurate when possible, and when not possible, clearly say what is inaccurate.

Do not guess. Do not silently pretend.

## Errors Should Be Clear, Not "Looks Normal"

Codex Quota uses an internal ChatGPT web endpoint.

That comes with two obvious limitations: the endpoint may change, and it is not an official or guaranteed way to read usage.

So I did not make the app scrape text from the page when parsing fails, and I did not add a pile of clever-looking fallback logic. If the endpoint returns an error, the JSON schema changes, the login session expires, or the network goes offline, the app enters a clear error state, such as:

- `Auth required`
- `Request timeout`
- `Offline`
- `API error`
- `Parse error`

This is more important than displaying a quota number that might be wrong.

For a tool like this, being wrong is not always the worst thing. Being wrong while pretending everything is fine is worse.

If the internal endpoint changes, the right behavior is to expose the problem and fix the code, not to keep misleading the user with guessed results.

## The Debug Window Exists Only for Troubleshooting

In addition to the tray menu, Codex Quota includes a Debug details window.

This window is mainly for troubleshooting. It shows local runtime state, account information, the two quota windows, reset times, the latest error, and sanitized JSON.

There is a boundary here too: the window can show account information useful for local debugging, but copied JSON is redacted. `user_id` and `account_id` are replaced with `[redacted]`, and email addresses are masked.

When sharing an issue, prefer `Copy summary` or the redacted `Copy JSON`.

Do not paste tokens, cookies, raw request headers, or other credentials into an issue.

It is a small tool, but credential handling still needs discipline.

## Why Move to Tauri?

Codex Quota is now a Tauri v2 app.

This version is not a continuation of old Electron data. It does not read, convert, or delete old Electron sessions, cookies, caches, or settings. The first launch of the Tauri version requires signing in to ChatGPT again.

That may feel slightly inconvenient, but the boundary is clearer.

Old runtime data belongs to the old runtime. New runtime data belongs to the new runtime. Especially when login sessions and local data are involved, I prefer one clear re-login over touching a pile of historical state in the name of seamless migration.

Desktop tools often get this wrong: they make migration look smooth by blurring data boundaries.

I do not want that here.

## Small Tools Still Need Engineering Discipline

Codex Quota is not a large codebase, but I still added tests for the core logic:

- Usage response parsing
- Remaining quota calculation
- Status classification
- Reset time formatting
- Usage change comparison
- Debug JSON redaction
- Shared summaries excluding account identifiers

These tests do not access ChatGPT and do not require a real account.

They cover the places where this project is most likely to fail: data parsing, state classification, time display, and privacy boundaries.

Small tools are easy to write as "good enough if it runs." But the closer a tool sits to your daily workflow, the less room there is for ambiguity. It can have few features, but the key path should be reliable. The UI can be simple, but error states should be explicit. It can depend on an internal endpoint, but it should not pretend everything is fine when that endpoint changes.

## Open Source

The project is open source on GitHub:

- **GitHub Repository**: [Sanjeever/codex-quota](https://github.com/Sanjeever/codex-quota)

It is not an official OpenAI or Codex project, and it does not use official OpenAI or Codex logos. Before using it, consult the repository source, Releases, and project notes, and decide whether you accept the maintenance risk of depending on an internal interface.

If you use Codex frequently and want to put quota state somewhere easier to see, you can give it a try.

For me, Codex Quota has always had a simple goal: turn a state that previously required repeatedly opening a web page into information visible at a glance on the desktop.

Less switching. Fewer interruptions.

That is its entire value.
