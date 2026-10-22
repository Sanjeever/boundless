---
title: On Scaling Laws
date: 2026-10-22
tags:
  - AI
  - Large Language Models
description: How scaling laws estimate the relationship between scale and performance, and how budgets and usage change the optimal choice from pretraining to inference.
outline: deep
aside: true
---

# On Scaling Laws

<!-- DESC SEP -->

How much improvement can larger models and more training data buy? Scaling laws estimate this relationship through empirical curves. Across pretraining, long-term serving, and inference, how to spend compute depends on the objective and the conditions.

<!-- DESC SEP -->

Suppose you have a budget to train a language model. Would you build a larger model and train it on less data, or a smaller model and train it on more?

“Larger models are better” is intuitive. But more parameters make each token more expensive to process. With a fixed budget, increasing model size leaves less compute for training tokens. The final result depends on both.

Scaling laws study the relationship between scale and performance. They let us run smaller experiments before estimating what a larger investment might achieve.

## How scale affects performance

Start with three variables. Parameter count is $N$, the number of training tokens is $D$, and training compute is $C$.

Labels such as 7B and 70B usually mean seven billion and seventy billion parameters. A tokenizer divides text into tokens, which may be characters, words, or word fragments. The training token count measures the total processed, including repeated passes over the same text. Compute is often measured in FLOPs, or floating-point operations.

What counts as better performance?

Kaplan and colleagues published [Scaling Laws for Neural Language Models](https://arxiv.org/html/2001.08361v1) in 2020, studying how cross-entropy loss changes in next-token prediction. A model assigns probabilities to candidate tokens. The higher the probability assigned to the actual next token, the lower the loss for that prediction. These losses are then averaged over many predictions.

For example, if model A assigns the actual next token a probability of 20% and model B assigns it 40%, B has the lower loss on that prediction.

The experiments found relatively smooth power-law relationships between scale and loss when other factors were not bottlenecks. A simplified expression helps illustrate the idea.

$$
L(x) \approx L_\infty + A x^{-\alpha}
$$

Here, $x$ represents one scale variable, $L_\infty$ is the asymptotic floor in the fitted expression, and $A$ and $\alpha$ must be estimated experimentally. Different studies use different equations. Parameters, data, and compute cannot simply be substituted into the same expression with unchanged coefficients.

Suppose $\alpha=0.1$. Increasing scale tenfold leaves about 79% of the original gap between the loss and its floor. This is an illustration, not an experimental result. Continued investment can yield improvements, but those improvements may be modest.

That predictability has practical value. Large training runs are expensive. Estimating their results in advance gives us a better basis for choosing a scale and budget.

## Allocating a fixed budget

For a typical dense Transformer, a common [approximation of training compute](https://arxiv.org/html/2203.15556v1#S3.SS3) is

$$
C \approx 6ND
$$

This omits some computation but captures the budget constraint. At fixed compute, doubling the parameter count roughly halves the number of training tokens. Model size and training data compete for the same resources.

In 2022, DeepMind revisited this allocation in its Chinchilla study. The researchers trained more than four hundred models with different parameter counts and training token budgets. They estimated that parameters and training tokens should grow in roughly equal proportions as compute increases. This differed substantially from the earlier estimate by Kaplan and colleagues, which favored allocating more of the increase to parameters. [Chinchilla paper](https://arxiv.org/html/2203.15556v1)

The studies also differed in experimental coverage and training schedules. For example, an intermediate loss from a run with a learning-rate schedule designed for long training may not represent what a run optimized for a shorter budget could achieve. Measurement choices affect the fit and, in turn, allocation recommendations. [Methodological differences](https://arxiv.org/html/2203.15556v1#S2)

The researchers then trained Chinchilla to test their prediction.

| Model      | Parameters | Training tokens |
| ---------- | ---------- | --------------- |
| Gopher     | 280B       | 300B            |
| Chinchilla | 70B        | 1.4T            |

B means billion and T means trillion. With similar training compute budgets, Chinchilla had fewer parameters yet outperformed Gopher across a broad range of downstream evaluations. The table uses the figures in the [paper](https://arxiv.org/html/2203.15556v1#S1).

More parameters require sufficient training. If the budget runs out too soon, some of the larger model's potential remains unrealized. The models also differed in details such as the optimizer, so the entire improvement cannot be attributed to the two numbers in the table. The broader series of experiments matters to the allocation argument as well.

What I value here is the research process. Estimate a relationship at smaller scales, then test the prediction at a larger scale. New results can revise both the curve and the judgment behind it.

## Optimal depends on the objective

If there is a suitable ratio, why keep training a small model on more data?

So far, the objective has been to achieve better performance within a fixed training compute budget. Once a model enters long-term service, its subsequent costs also matter.

Suppose two models reach similar performance. One has more parameters and requires less training compute. The other has fewer parameters and needs more training compute, but may use less compute per request. With enough requests, those savings can repay the extra training investment.

[Beyond Chinchilla-Optimal](https://arxiv.org/html/2401.00448v3) includes inference demand in the analysis. Under conditions such as substantial expected inference demand, training a smaller model for longer can be more economical.

The familiar Chinchilla rule of thumb of roughly twenty training tokens per parameter needs its original objective attached. It sets no upper limit on training. More tokens may still improve performance; whether they are worth the cost requires another calculation.

Maximizing training efficiency and minimizing lifetime cost can lead to different choices.

## Spending more compute on an answer

After training, a model can also use more compute on an individual question.

Consider a math problem. The model could produce one answer, generate several solutions and use a verifier to select one, revise an earlier attempt, or search through intermediate steps and evaluate different paths.

The question becomes how much accuracy an extra inference budget buys. Should that compute fund more attempts, or further refinement of an existing path? These are questions in test-time scaling.

In a [2024 study](https://arxiv.org/html/2408.03314v1), Snell and colleagues examined verifier-guided search and revisions enabled by dedicated fine-tuning on the MATH benchmark. The experiments showed that the appropriate strategy depended on how difficult a question was for the base model. Adjusting compute allocation by difficulty was more effective than uniformly increasing the number of candidates.

Extra compute needs a mechanism that can put it to use. Once more candidates exist, how do we identify the better answer? If revisions are allowed, how do we avoid changing a correct answer into an incorrect one? These steps affect the return.

A longer response alone therefore does not establish more effective reasoning. We need to measure the task, the procedure, the compute spent, and the resulting improvement. Results on math problems also cannot be assumed to hold across all tasks.

Training and inference investments differ in how often their benefits can be reused. Training can affect many subsequent requests; additional inference compute is spent on the current question. Allocating between them requires considering task difficulty, request volume, and latency requirements.

## How far the curves can predict

If progress is predictable, how far can we extend the curve?

First, consider the gap between metrics. Pretraining loss averages performance across many token predictions. A particular task may require several consecutive steps to be correct. Whether code runs, citations are real, or a long task reaches completion calls for separate evaluation. Task-level evidence must establish which capabilities improve as average loss falls, and by how much.

Next, consider the experimental conditions. When the data distribution, architecture, or training method changes, the accuracy of an existing fit needs to be checked again. Kaplan and colleagues explicitly discussed limits to theoretical understanding and extrapolation in their [appendix](https://arxiv.org/html/2001.08361v1#A3). How far an empirical curve can predict is itself a research question.

Finally, performance and value require separate judgments. Even if more compute still helps, we need to determine whether it reduces errors on actual tasks, saves human time, and justifies its cost. A pretraining loss curve cannot supply those answers directly.

When someone says scaling laws have stopped working, I would first ask which relationship they mean. Loss may depart from predictions under the same training method. A particular task may stop improving. Additional compute may remain effective but become too expensive. These situations require different evidence and lead to different decisions.

Returning to that training budget, I would start with smaller experiments to estimate the allocation between parameters and data, then account for target tasks and expected serving demand. As investment grows, I would keep checking actual results against predictions.

Scaling laws give expensive experiments testable expectations. What lies farther along the curve still needs another set of experiments.
