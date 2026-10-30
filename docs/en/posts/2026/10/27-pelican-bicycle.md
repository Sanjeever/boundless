---
title: A Pelican on a Bicycle and Drinking Water Upside Down
date: 2026-10-27
tags:
  - AI
  - Large Language Models
  - Evaluation
description: How asking language models to blind-code an SVG of a pelican riding a bicycle went from a clever spatial probe to a rehearsed party trick.
outline: deep
aside: true
---

# A Pelican on a Bicycle and Drinking Water Upside Down

<!-- DESC SEP -->

How asking language models to blind-code an SVG of a pelican riding a bicycle went from a clever spatial probe to a rehearsed party trick.

<!-- DESC SEP -->

Every time a new language model drops, timelines fill up with pelicans on bicycles.

The ritual is always the same: paste in a short prompt asking for raw [SVG vector code](https://developer.mozilla.org/en-US/docs/Web/SVG) of a pelican riding a bicycle—a test popularized by [Simon Willison's blog notes](https://simonwillison.net/tags/pelican-riding-a-bicycle/).

If the bird looks recognizable, replies hail the arrival of general intelligence. If the wheels float above the beak in a tangle of polygons, everyone laughs at how dumb AI still is.

Yet watching this bird serve as a public litmus test of intelligence always makes me think of a different exam: what if college admissions added a test where students had to drink a glass of water while doing a handstand?

Drinking water upside down is genuinely hard. It takes uncommon balance and muscular control. Still, whether someone can swallow water against gravity tells you nothing about how well they can reason, write, or build software.

## Blind geometry in token space

When this prompt first appeared, it was a genuinely clever probe.

A text-only model has no eyes. It cannot glance at a canvas, see that a wheel is lopsided, and nudge the line over. Asked to write an SVG, it has to compute geometry blind—emitting center coordinates, radii, and Bézier control points one token after another.

Drawing a generic cat or a plain bicycle is easy enough; public repositories are full of those icons, so a model can mostly recite memorized shapes.

A pelican riding a bicycle is another story. Almost no human developer sits down to hand-code an SVG of that specific scene.

To pull it off from scratch, the model has to hold three things together in pure text:

- The parts: a long bill, a throat pouch, webbed feet, a frame, two wheels, handlebars, and pedals;
- The layout: bird on top, wheels below, proportions roughly in check;
- The contact points: body perched on the saddle, webbed feet reaching for the pedals, beak facing forward.

Early models mostly produced scattered confetti. So when [Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet) first output a clean, unmistakable pelican balanced on a bike frame, researchers had good reason to be intrigued. It hinted that reading text alone was enough to fold a rough map of two-dimensional space into the model's weights.

## The day after the exam leaks

Economics has a name for what happened next—[Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law): when a measure becomes a target, it stops being a good measure.

The pelican worked as a probe only while it lived out in the wild, far from training data. Once it became the internet's favorite benchmark, teams running [Supervised Fine-Tuning](<https://en.wikipedia.org/wiki/Fine-tuning_(machine_learning)>) and [RLHF](https://en.wikipedia.org/wiki/Reinforcement_learning_from_human_feedback) naturally began sweeping curated SVG illustrations—and synthetic variations of animals riding vehicles—straight into post-training.

When a newly released model draws crisp feathers and spokes today, it tells us very little about a leap in spatial reasoning. More often, it just means the student saw the leaked exam paper before walking into the hall.

## Party tricks and real work

Swallowing water in a handstand forces the esophagus to push liquid uphill while the throat seals the airway and the wrists hold the body steady. It is an impressive stunt, and completely useless once you stand back up.

Asking a language model to blind-write thousands of characters of Bézier curves is much the same.

In real software engineering, image generation belongs to [diffusion models](https://en.wikipedia.org/wiki/Diffusion_model), and charts or interfaces rely on proper rendering engines and component libraries. No sane production system asks an LLM to hand-calculate raw vector paths from memory.

The pelican endures mostly because a funny picture travels fast on social media. Nobody scrolling a feed wants toSquint at confidence intervals or contamination audits, whereas a cartoon bird on a bike lands in half a second.

The trouble is what gets left in the dark while everyone claps for the bird: instruction drift across a hundred thousand tokens, subtle state bugs during multi-file refactors, or how gracefully an agent recovers when a tool call fails.

The pelican on a bicycle was a great ruler once. Now that every model is trained to pose against its markings, it is time to stop grading the unicycle act and see how well the thing actually pulls weight on uneven ground.
