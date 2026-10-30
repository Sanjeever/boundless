---
title: "AI Slop: Don't Let Summaries Decide for You"
date: 2026-10-19
tags:
  - Information Access
  - AI
  - Independent Thinking
description: Tracing the “under $6 million” DeepSeek headline back to the original technical report shows how retellings strip away critical conditions—and how to use AI to recover primary evidence.
outline: deep
aside: true
---

# AI Slop: Don't Let Summaries Decide for You

<!-- DESC SEP -->

Tracing the “under $6 million” DeepSeek headline back to the original technical report shows how retellings strip away critical conditions—and how to use AI to recover primary evidence.

<!-- DESC SEP -->

“Only 8 MB.” “11,000 GitHub stars.” “Crushes the competition.”

You finish skimming the post, remember the project name, and feel a faint twinge of falling behind. Yet what problem it actually solves, which formats it cannot handle, and where it breaks are nowhere to be found.

When you finally sit down to use the tool, you still have to read the docs from scratch. The summary that promised to save you time skipped the very details needed to make a decision.

## Louder Conclusions, Fewer Conditions

A feature might still be experimental; a benchmark win might depend on a specific workload. After three rounds of retelling, however, “worth trying” turns into “a drop-in replacement,” and “faster on this workload” becomes “destroys the incumbent.” As the qualifiers fall away, the tone only grows more certain.

Good secondary writing builds a bridge by explaining *why* something works and *where* its boundaries lie. Bad retellings polish the conclusion for maximum shareability and throw away the map.

## What “Under $6 Million” Actually Counted

On January 27, 2025, CNN’s *First Move* introduced DeepSeek-R1 and noted that the company claimed to have spent under $6 million training its model, while a guest contrasted roughly $5.6 million with the tens of billions spent by US tech giants (see the [broadcast transcript](https://transcripts.cnn.com/show/fmjc/date/2025-01-27/segment/01)).

It was easy to walk away thinking that building R1 from scratch cost $5.6 million.

Opening the [introduction and Table 1 of the DeepSeek-V3 technical report](https://arxiv.org/html/2412.19437v1#S1) clears the air in two minutes: official training for DeepSeek-V3 consumed 2.788 million H800 GPU-hours, which at an assumed rental price of $2 per GPU-hour comes to $5.576 million. Right after that sentence, the authors explicitly note that the figure **excludes** the costs of prior research and ablation experiments on architectures, algorithms, and data.

Checking the primary source changes the picture in three places:

1. The figure belongs to the base model **V3**, not the reasoning model **R1**.
2. It is an imputed rental figure for the **final training run**, not an audited total of company expenditures.
3. Prior research and ablations sit outside that number, making a direct division against a hyperscaler’s annual capex budget apples-to-oranges.

Once those boundaries are back in place, the real engineering questions can begin: which architectural choices kept the final training run so lean, and what does it take to reproduce them? Staying stuck on the headline contrast hides the actual work.

## Well-Dressed AI Slop

[Merriam-Webster](https://www.merriam-webster.com/dictionary/slop) defines `slop` as low-quality digital content produced in quantity by AI.

In technical reading, the biggest time sink is rarely obvious gibberish—it is the suspiciously tidy overview: project names spelled right, buzzwords in place, a bulleted feature list, and a warm closing paragraph about the future of the ecosystem. The sentences glide right along, yet there is zero trace of anyone running a command or hitting a real edge case.

Rephrasing a README at three times its original length and crowning it “the new standard” takes seconds. Reading it feels like chewing styrofoam: smooth going down, nothing left in your stomach. If you take “drop-in replacement” at face value and start a migration, every minute saved on reading is paid back with interest when you hit the first undocumented limitation.

And when a headline warns “Learn X before it’s too late,” one question is usually enough to break the spell: *Do I have a real problem on my desk today that needs this?*

## Use AI to Fetch the Evidence, Not the Verdict

If AI makes it cheap to flood the web with blurry retellings, how should we use it as readers?

Asking a chatbot for a generic summary without sources just trades one secondhand account for another. A much better use of AI is sending it to do the legwork—translating primary docs, diffing release notes, and pulling exact passages out of long specifications.

When evaluating a tool for a real task, I ask it to work like a research assistant:

> Read this project’s official documentation, release notes, and open issues to see whether it can handle my task: [specific task]. List the relevant versions, prerequisites, and known limitations, and attach a direct link to the source for each claim. If something isn’t covered in the docs, say so plainly.

Then I click the two or three links that actually affect my decision.

Whenever you finish a technical article or paper, being able to answer three short questions means your time was well spent: **What is the exact claim? Where is the primary source? And which conditions have to stay attached for that claim to hold?**
