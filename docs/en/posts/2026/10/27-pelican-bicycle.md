---
title: A Pelican on a Bicycle and Drinking Water Upside Down
date: 2026-10-27
tags:
  - AI
  - Large Language Models
  - Evaluation
description: Prompting models to draw a pelican riding a bicycle originally probed spatial reasoning. As the prompt became public and trained on, it turned into a showcase disconnected from engineering realities.
outline: deep
aside: true
---

# A Pelican on a Bicycle and Drinking Water Upside Down

<!-- DESC SEP -->

Prompting models to draw a pelican riding a bicycle originally probed spatial reasoning. As the prompt became public and trained on, it turned into a showcase disconnected from engineering realities.

<!-- DESC SEP -->

Whenever a new model is released, social platforms frequently see the same informal benchmark.

Observers paste in a single prompt asking the model for raw [SVG vector code](https://developer.mozilla.org/en-US/docs/Web/SVG) depicting a pelican riding a bicycle. The test traces back to [Simon Willison's blog notes](https://simonwillison.net/tags/pelican-riding-a-bicycle/). If the model draws a well-proportioned bird, cheers for artificial general intelligence often follow; if it outputs a mess of broken lines, it is mocked as evidence of AI stupidity. Many treat it as an intuitive litmus test of intelligence.

Using such a prompt as a core measure of capability is akin to adding an upside-down water drinking challenge to a college entrance exam. Drinking water while doing a handstand requires specialized muscular coordination and balance, but mastering that physical feat says nothing about a student's capacity for analytical thinking or logical deduction.

## What the Probe Originally Measured

To understand where this test originated, consider how text-only models operate.

A text model has no visual sensors and cannot observe a canvas to adjust brushstrokes in real time. Given an instruction to produce vector graphics, it must calculate geometric coordinates purely within its token stream. Center coordinates, radii, and Bézier control points are placed strictly by numerical sequence.

Asking a model to draw a cat or a standard bicycle is relatively straightforward. Public code repositories contain countless vector snippets of cats and bicycles, allowing a model to recall familiar patterns from memory.

A pelican riding a bicycle is different. Almost no one writes SVG code for that specific combination. For a model to render it accurately, it must work through several relational requirements in text:

- Deconstruct the anatomy and mechanical parts, including the long bill, throat pouch, webbed feet, frame, wheels, and pedals;
- Plan canvas coordinates and scale, ensuring the bird sits above the wheels and proportions remain balanced;
- Establish physical interactions between them, placing webbed feet on the pedals, the body on the saddle, and pointing the beak toward the direction of travel.

Early models typically produced overlapping, illegible blobs. When [Claude 3.5 Sonnet](https://www.anthropic.com/news/claude-3-5-sonnet) first produced a structured, cohesive vector image, researchers were genuinely encouraged. It demonstrated that text-only pretraining could allow a model to develop rudimentary two-dimensional spatial and physical intuitions in its representation space.

## When the Test Becomes Public

[Goodhart's law](https://en.wikipedia.org/wiki/Goodhart%27s_law) in economics states that when a measure becomes a target, it ceases to be a good measure.

The pelican on a bicycle followed that trajectory.

Originally, this prompt sat on the outer edge of training distributions, testing unanticipated generalization because models had not encountered it before. Once the test spread across the internet, post-training teams running [Supervised Fine-Tuning](<https://en.wikipedia.org/wiki/Fine-tuning_(machine_learning)>) and [RLHF](https://en.wikipedia.org/wiki/Reinforcement_learning_from_human_feedback) naturally incorporated abundant SVG samples, and often the exact prompt itself, into their datasets.

A new model rendering a neat pelican today hardly proves an advance in spatial reasoning; it more likely indicates exposure to similar exercises during post-training. Just as a geometry exam problem leaked and drilled in advance tells us little about students' broader mathematical abilities, memorizing this scene proves little beyond having seen the question beforehand.

## Stunts and Practical Engineering

Swallowing water upside down requires the esophagus to push liquid against gravity while coordinating airway closure and physical balance. It is difficult for an untrained person, yet mastering that skill contributes nothing toward solving complex engineering calculations or formal proofs.

Expecting language models to blind-write thousands of lines of vector code without visual feedback is a similar spectacle. In practical software engineering, image synthesis is handled by [diffusion models](https://en.wikipedia.org/wiki/Diffusion_model), while interfaces and data visualizations rely on mature rendering engines and component libraries. Production systems rarely, if ever, depend on an LLM manually assembling Bézier curves.

What genuinely matters in software development is long-chain causal reasoning, large-scale code refactoring, formal verification, and multi-step tool orchestration. Concentrating training resources on blind vector generation yields visual novelties rather than practical utility.

## Intuitive Feedback and Overlooked Weaknesses

This benchmark persists largely because visual results are immediately shareable.

Compared to evaluation reports detailing metrics, sample distributions, and confidence intervals, an image of a bird on a bicycle requires no background knowledge to grasp. A clean drawing prompts praise, while broken geometry generates amusement; visual novelties readily drive social media engagement.

This incentive structure can encourage model labs to tune for viral prompts to maintain visibility around launch windows. However, critical issues that govern production reliability—such as instruction drift across long conversations, hidden bugs in complex business logic, and error recovery in tool execution—risk being overshadowed by a colorful vector illustration.

As an early diagnostic, the pelican on a bicycle provided valuable evidence of latent spatial alignment in pure text models. Once a probe becomes a public optimization target, however, it loses its diagnostic value. Evaluating progress in frontier models requires returning to substantive engineering challenges, including complex multi-step reasoning, tool coordination, and building real-world projects.
