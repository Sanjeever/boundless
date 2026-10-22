---
title: "AI Slop: Don't Let Summaries Decide for You"
date: 2026-10-19
tags:
  - Information Access
  - AI
  - Independent Thinking
description: Tracing DeepSeek's reported cost of under $6 million back to its technical report shows how retellings lose model names, assumptions, and cost boundaries—and how to check a technical claim.
outline: deep
aside: true
---

# AI Slop: Don't Let Summaries Decide for You

<!-- DESC SEP -->

“Under $6 million” sounds precise. Which model it refers to, and which expenses it covers, can become less clear in the retelling. Following DeepSeek coverage back to its technical report shows how omitted conditions change a conclusion.

<!-- DESC SEP -->

“Only 8 MB.” “11,000 stars.” “Blazing performance.”

You finish reading with a project name in mind and a faint sense of falling behind. What problem does it solve? Which features are missing? When does it fail? The article hasn't told you.

When you actually need it, you start over with the documentation.

The introduction that promised to save you time has left you with the work of figuring out whether its claims hold up.

## Louder Claims, Fewer Conditions

A feature may still be experimental. A project may support only some file formats. A performance gain may depend on a particular environment. After a few rounds of retelling, “worth trying” becomes “a complete replacement,” and “an improvement in one area” becomes “crushing the competition.” The conditions disappear as the language grows more certain.

A good explanation supplies context. It shows why a capability is useful and under what conditions it works. After reading, we can make a better decision about using it.

A poor retelling makes the conclusion easier to spread. You can repeat how impressive the tool is without explaining why it fits your task.

“Secondhand” tells us little about quality. Translations, textbooks, and technical explanations all have value. The useful question is what readers gain, and what they lose, through each retelling.

## What Does “Under $6 Million” Cover?

On January 27, 2025, CNN's _First Move_ introduced DeepSeek-R1, then said the company claimed to have spent under $6 million training its models. A guest compared roughly $5.6 million with billions spent by US companies, mentioning Meta's planned spending of about $65 billion that year. The exchange appears near the start of the [program's transcript](https://transcripts.cnn.com/show/fmjc/date/2025-01-27/segment/01).

The discussion can leave the impression that R1 cost about $5.6 million to develop, remarkably little beside large companies' overall spending. Before comparing those amounts, we need to establish what the smaller figure describes.

The [introduction and Table 1 of the initial DeepSeek-V3 report](https://arxiv.org/html/2412.19437v1#S1) give the calculation: 2.788 million H800 GPU-hours for V3's official training, valued at an assumed rental rate of $2 per GPU-hour, producing $5.576 million. The next sentence explicitly excludes earlier research and ablation experiments on architectures, algorithms, and data.

That changes at least three parts of the initial impression.

First, the figure refers to **V3**. Using it in a discussion of R1 requires explaining the relationship, rather than letting readers treat it as R1's cost. Second, it values training compute using a rental assumption. Precision to the nearest thousand dollars does not make an estimate an audited bill. Third, research and experiments sit outside the stated boundary. Using the number to answer “What does it cost to develop a model from scratch?” expands its meaning.

This also explains the problem with comparing it directly to a company's annual spending. One amount has a defined training scope; the other requires checking what the budget includes. Both numbers can have sources without their ratio being a meaningful measure of efficiency.

This check does not establish DeepSeek's total research and development costs or independently verify its compute usage. It establishes what the report says and which conditions the program left unstated. Correcting the use of “$6 million” requires neither inventing a larger total nor treating the omission as evidence that the original report was fraudulent.

The investigation changes the questions worth asking next: which training designs reduced compute requirements, how the results can be verified, and what another team would need to reproduce them. Staying with the contrast between two amounts makes it harder to reach those technical questions.

## AI Slop Can Read Smoothly

[Merriam-Webster's relevant definition of slop](https://www.merriam-webster.com/dictionary/slop) describes low-quality digital content produced with AI, usually in quantity. Poor retellings predate AI; AI makes it easier to rewrite and expand them in bulk.

The CNN example establishes an omission of conditions, with no evidence that the segment was AI-generated. It gives “low quality” something we can inspect, so the judgment need not rest on prose style.

In technical reading, I am especially wary of articles that look complete. The project names are correct. The terminology is familiar. There is a feature list, a set of use cases, and a closing prediction about the future. The prose flows and the structure looks sound, yet there is no account of trying the tool or evidence for the judgments that matter.

Such an article can contain plenty of accurate statements. It can rephrase a README, add generic scenarios, and arrive at a conclusion that goes well beyond the material. An introduction need not test every feature, but a claim of replacement requires an account of what was compared and under which conditions. Without that, readers get something that looks like a review without knowing what the writer verified.

Vague prose and exaggerated claims alone cannot establish that an article was generated by AI. Using AI does not establish poor quality either. Criticism of a particular article needs to identify what is missing: sources, conditions, or an account of testing. Calling something AI slop also requires grounds. It should not become a label we attach on sight.

## Who Does the Checking?

What concerns me is content that appears to have made a judgment for readers while leaving the checking until they actually need to use its conclusion.

Suppose an introduction calls a tool “a complete replacement” without identifying the versions compared or the missing features. A reader starts migrating, encounters an unsupported feature, and has to return to the documentation, search issues, or reconsider the choice. The introduction omits the conditions; the cost may surface later in the reader's work.

That sequence explains a risk. It does not tell us how many people end up redoing work or how much time they lose. Likewise, the earlier case demonstrates information lost in one retelling; it cannot establish the quality of technical content as a whole.

There is also a reading motive worth examining. “Learn it before it's too late” makes a tool awaiting evaluation feel like overdue homework. If fear of falling behind leads a reader to keep bookmarking tools without recording their uses and limits, the next real problem still requires sorting through them from scratch.

FOMO, or Fear of Missing Out, can describe that situation. Establishing that exaggerated content generally causes anxiety would require other evidence. For a reading decision, a narrower question is enough: do I currently have a task this tool needs to solve?

## Use AI to Find the Evidence

There is an obvious question here: if AI can produce poor retellings, why use it to get information?

Putting a question into a chat box does not automatically bring us closer to evidence. If the AI has not accessed the material or checked the version and simply gives us a smooth summary, we still cannot check its answer. Changing who delivers the summary does not solve that problem.

AI can do something more specific. Language, terminology, and sheer length have long made original material difficult to read. We can ask it to translate documentation, explain unfamiliar concepts, locate relevant passages, compare version changes, and put the source text in front of us.

Start with the task at hand:

> Read this project's official documentation, release history, and relevant issues. Assess whether it can handle my task: [specific task]. Identify the relevant versions, prerequisites, and known limits. Distinguish the author's claims, available test results, and unresolved questions. Link to the original material supporting each key conclusion. State clearly when you cannot access a source or find supporting evidence.

For the cost claim above, narrow the task further: find the report version where $5.576 million first appeared, locate the table and adjacent explanation, and identify the model, calculation assumptions, and included and excluded costs. Then compare those with the program's wording. This makes it easier to catch an answer that substitutes R1 for V3 or turns a compute estimate into total development spending.

Then open the sources that affect your decision and check whether they support the conclusions. The presence of a link does not establish that the citation is accurate.

Original material has a perspective too. A project homepage may be promotional. An official demo may choose favorable conditions. Real work also calls for issue reports, independent experience, and sometimes a trial of our own. Labels such as “official,” “open source,” and “highly starred” cannot stand in for evidence.

## What Can You Check After Reading?

I would keep a small note to judge whether a piece has left me with usable information:

> What does it claim? Where is the original evidence? Which conditions must remain attached for me to use the conclusion?

For the cost example, the useful details are V3, GPU-hours, the rental assumption, and the exclusions. For a performance review, they might be the version, hardware, data size, comparison target, and test scripts. Record the conditions that could change your decision; every article need not receive a full audit.

If an introduction offers only an interesting project name, treat it as a lead. When a concrete task arises, check its repository, releases, and relevant issues. When actual behavior matters, run a small trial that matches the task. The introduction alone does not justify jumping to “we should migrate now.”

A useful retelling can explain what “$6 million” covers and spare the next reader this investigation. That is the work I want technical writing to save its readers.
