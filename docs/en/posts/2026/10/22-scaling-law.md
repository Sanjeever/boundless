---
title: On Scaling Laws
date: 2026-10-22
tags:
  - AI
  - Large Language Models
description: From pretraining and long-term serving to test-time compute, here is how scaling laws map the trade-offs between model size, data, and budget.
outline: deep
aside: true
---

# On Scaling Laws

<!-- DESC SEP -->

From pretraining and long-term serving to test-time compute, here is how scaling laws map the trade-offs between model size, data, and budget.

<!-- DESC SEP -->

Suppose you have a fixed compute budget to train a language model. Do you build a larger model and feed it fewer tokens, or build a smaller model and train it on much more data?

Intuition says bigger models are smarter, yet every extra parameter makes each token more expensive to process. Under a fixed budget, model size and dataset size compete for the exact same pool of FLOPs.

Scaling laws map how performance evolves as parameters, data, and compute grow. Instead of flying blind on a multi-million-dollar run, teams can fit empirical curves on small runs first and estimate where a larger investment will land.

## Power Laws Between Scale and Loss

Start with three familiar variables: parameter count $N$, training tokens $D$, and total training compute $C$ (measured in FLOPs).

In 2020, Kaplan et al.’s [*Scaling Laws for Neural Language Models*](https://arxiv.org/html/2001.08361v1) tracked cross-entropy loss on next-token prediction—the higher the probability assigned to the actual next token, the lower the loss.

When no single factor bottlenecks the others, loss follows a remarkably smooth power law:

$$
L(x) \approx L_\infty + A x^{-\alpha}
$$

Here $x$ is the scale variable and $L_\infty$ is the irreducible entropy of the text. Because the exponent $\alpha$ is small, each tenfold jump in scale trims a predictable fraction off the remaining gap above $L_\infty$.

That smoothness is what makes scaling laws practical: small pilot runs can reveal the slope before anyone commits to a massive cluster.

## Splitting a Fixed Budget: From Kaplan to Chinchilla

For a standard dense Transformer, training compute follows a simple [rule-of-thumb approximation](https://arxiv.org/html/2203.15556v1#S3.SS3):

$$
C \approx 6ND
$$

Hold $C$ constant, double the parameter count $N$, and you have to halve the training tokens $D$.

In 2022, DeepMind’s [Chinchilla study](https://arxiv.org/html/2203.15556v1) trained over four hundred models across different $(N, D)$ pairs and revised earlier parameter-heavy allocations (see [Section 2](https://arxiv.org/html/2203.15556v1#S2) for the methodological comparison). Their conclusion was clean: as compute budgets grow, **model parameters $N$ and training tokens $D$ should scale up in roughly equal proportion**.

To test that curve, they spent roughly the same compute budget used for the 280B-parameter Gopher model on a model one-quarter the size trained on more than four times as much data ([Section 1](https://arxiv.org/html/2203.15556v1#S1)):

| Model | Parameters $N$ | Training Tokens $D$ |
| --- | --- | --- |
| Gopher | 280B | 300B |
| Chinchilla | 70B | 1.4T |

At 70B parameters, Chinchilla beat the 280B Gopher across a wide suite of benchmarks—showing that an oversized model starved of tokens leaves capacity on the table.

## Factoring In Inference Tilts Toward Smaller Models

If Chinchilla’s ~20 tokens per parameter is compute-optimal, why do modern open-weight 7B and 8B models routinely train on 10T+ tokens?

Because Chinchilla optimized for **training cost alone**, whereas production models also pay for **inference**.

Training happens once; inference runs millions of times. As [*Beyond Chinchilla-Optimal*](https://arxiv.org/html/2401.00448v3) formalizes, once expected serving volume is high enough, spending extra FLOPs up front to “over-train” a smaller model pays for itself many times over in cheaper, faster responses.

“Optimal” only has meaning once you specify whether you are minimizing the bill for a single training run or the lifetime bill of a deployed service.

## Spending Compute at the Moment of Answering

Even after weights are frozen, there is another axis to scale: spending more compute when answering a hard question (**test-time scaling**).

In a [2024 study](https://arxiv.org/html/2408.03314v1) on the MATH benchmark, Snell et al. compared verifier-guided step search and iterative self-revision against brute-force sampling (noting the separate cost of difficulty estimation in [Section 3.2 and Appendix C](https://arxiv.org/html/2408.03314v1#S3.SS2)).

Pretraining compute is like years of study that raise your baseline on every question; test-time compute is the extra scratch paper you pull out for the hardest problem on the exam.

## Where the Curve Runs Out

Empirical curves have natural boundaries too (as Kaplan et al. noted in [Appendix A.3](https://arxiv.org/html/2001.08361v1#A3)):

- **Average token loss vs. multi-step reliability**: Pretraining loss averages over billions of tokens, while writing working code or citing real sources requires ten steps in a row without a single slip.
- **Shifting recipes and data ceilings**: Change the architecture or exhaust high-quality text, and the old fit has to be re-measured.

Whenever someone asks whether scaling laws have hit a wall, it helps to separate three distinct claims: has pretraining loss stopped following the power law, has lower loss stopped translating into downstream capability, or has the next tick on the curve simply grown too expensive to justify?

What scaling laws really gave the field is a way to turn brute-force optimism into back-of-the-envelope engineering. What lies past the edge of the chart still belongs to the next experiment.
