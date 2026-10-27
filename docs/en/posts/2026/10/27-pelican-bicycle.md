---
title: A Pelican on a Bicycle and Drinking Water Upside Down
date: 2026-10-27
tags:
  - AI
  - Large Language Models
  - Evaluation
description: Whenever a new model drops, people rush to prompt it to draw a pelican riding a bicycle. Originally an interesting spatial reasoning probe, it has since decayed into an irrelevant circus trick.
outline: deep
aside: true
---

# A Pelican on a Bicycle and Drinking Water Upside Down

<!-- DESC SEP -->

Whenever a new model drops, people rush to prompt it to draw a pelican riding a bicycle. Originally an interesting spatial reasoning probe, it has since decayed into an irrelevant circus trick.

<!-- DESC SEP -->

Every time a new large language model comes out, social media falls into a familiar ritual.

People paste in the same prompt: generate raw [SVG vector code](https://developer.mozilla.org/en-US/docs/Web/SVG) for a pelican riding a bicycle. This test dates back to [Simon Willison's blog notes](https://simonwillison.net/tags/pelican-riding-a-bicycle/).

If the model draws something resembling a bird on two wheels, observers cheer for emerging artificial general intelligence. If it spits out a pile of broken colored lines, they laugh at how dumb AI still is. Many treat this as a great litmus test.

It is not.

Using this test to evaluate a model is like adding an upside-down water drinking challenge to a college entrance exam. If a student manages to swallow a glass of water while doing a handstand, what does that prove? It only proves the student practiced drinking water upside down.

## What the probe was originally testing

Let us go back to the beginning. Think about how a pure text model works.

It has no eyes. It cannot see a canvas, and it has no brush to paint stroke by stroke. It only has an output window for text tokens. To generate a vector image, the model has to calculate geometric coordinates blindly in its latent space. Where does the center of a circle go? How large is the radius? Where does a path turn? Everything is pure math and numbers.

Asking a model to draw a cat or a standard bicycle is relatively easy. Public code repositories are full of SVG snippets for cats and bikes. The model can simply recall what it has already seen.

A pelican riding a bicycle is different. Almost no one writes SVG code for that specific scene. To get it right, the model has to think through three distinct steps:

* First, decompose the parts. A long bill, a throat pouch, webbed feet, two wheels, a frame, and pedals.
* Second, plan the layout. The canvas has bounded dimensions. The head must sit near the top, the wheels near the bottom, and proportions cannot collapse.
* Third, bind physical interactions. The webbed feet must touch the pedals, the torso must sit on the saddle, and the beak must point forward.

Early models completely failed at this. Opening their SVG output revealed a chaotic heap of overlapping shapes. Then [Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet) arrived. For the first time, a model produced a recognizable, properly proportioned picture with clear pedals and wings.

Researchers were genuinely excited. It suggested that pretraining on raw text could help a model build a rudimentary internal world model with 2D spatial reasoning.

## When the test becomes public

Economics has a well-known principle called [Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law): when a measure becomes a target, it ceases to be a good measure.

That is exactly what happened here.

When this probe first appeared, it sat on the outer edge of the training distribution. No model had been prepared for it, so it actually probed generalization. Today, the entire internet talks about it.

When post-training teams run [Supervised Fine-Tuning](https://en.wikipedia.org/wiki/Fine-tuning_(machine_learning)) and [RLHF](https://en.wikipedia.org/wiki/Reinforcement_learning_from_human_feedback), they know about this prompt. They inject countless geometric SVG examples into the data mix, and probably include the prompt itself.

If a new model draws a neat pelican today, does that prove deep spatial reasoning?

Not at all. It just proves the model saw the test in its homework.

Imagine a college entrance exam where the final geometry problem is printed on the front page of every newspaper months in advance. Every high schooler memorizes each step. On exam day, everyone gets a perfect score. That does not mean student mathematical thinking suddenly leaped forward. It just means the test leaked.

## Circus tricks versus real capability

Step back for a second. Is drinking water while doing a handstand difficult?

Extremely difficult.

Human swallowing relies on gravity to help food move along. To drink upside down, the esophagus must push water upward against gravity with coordinated muscle contractions, all while the body fights to stay balanced. Without dedicated physical training, ordinary people cannot pull it off.

Should we put it on a college entrance exam?

Never.

College admissions aim to select students with rigorous reasoning, mathematical deduction, reading comprehension, and analytical skills. No matter how hard drinking water upside down is, it remains a circus trick. It does not help solve scientific problems.

Asking a language model to blind-code intricate vector coordinates is the exact same kind of stunt. In real engineering, we generate images with [diffusion models](https://en.wikipedia.org/wiki/Diffusion_model). We build user interfaces with dedicated design tools and charting libraries. No software team asks an LLM to blind-write thousands of raw Bezier curves in production.

What we actually care about in general intelligence is large-scale code refactoring, long-chain causal deduction, formal logic verification, and reliable tool orchestration. Pouring training compute into blind vector rendering is like forcing top math students to spend hours practicing handstand swallowing. It looks impressive on stage, but it leads nowhere.

## When memes obscure real flaws

If the test is so disconnected from real work, why is social media obsessed with it?

Because images are immediate.

Handing someone a complex benchmark report full of metrics and confidence intervals requires technical patience. Handing them a funny screenshot of a bird on a bike takes one second to understand.

If the drawing holds together, people declare artificial general intelligence has arrived. If the lines glitch out, they laugh and call the tech a dead end. Memes turn serious evaluation into pure emotion.

This feedback loop can even warp developer priorities. To maintain social media buzz, model labs face incentives to patch popular viral prompts. If a new release reliably renders the bike, it wins easy retweets.

That superficial polish hides the problems that actually matter: instruction drift in long conversations, recall degradation over large contexts, and subtle logic bugs in complex codebases. All of these critical failure modes get swept under the rug by a colorful cartoon bird.

## Returning to real problems

Leave a thermometer in a fire long enough, and it stops measuring body temperature.

The pelican on a bicycle was once a clever diagnostic probe. It showed us that text-only models could develop surprising spatial intuitions. But that chapter is closed.

Today, the question has been thoroughly spoiled. Continuing to judge frontier models with it is like setting up a circus tent at the entrance exam to see who drinks water best upside down.

We should move past the meme. Evaluating general intelligence has to come back to real, rigorous, and often unglamorous engineering work.
