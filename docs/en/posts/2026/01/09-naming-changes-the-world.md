---
title: Naming
date: 2026-01-09
tags:
  - Essay
  - Programming
  - Philosophy
description: Names help us recognize things, but they also carry assumptions. In code, relationships, and workplace language, trouble begins when a name becomes the whole explanation.
outline: deep
aside: true
---

# Naming

<!-- DESC SEP -->

Names make communication easier, but they also carry assumptions. Once a variable, a relationship, or a layoff has a name, do we keep asking what it actually contains?

<!-- DESC SEP -->

## Only Two Hard Things

There is a famous joke in computer science: there are only two hard things in programming—cache invalidation and naming things.

`a`, `b`, `data`, `temp`—or, if all else fails, `flag1`, `flag2`. Giving a machine distinct identifiers is easy. Helping the next reader understand what each one represents and what it is responsible for is harder.

You are defining its boundary.

`isValid` leads a reader to expect a boolean. If the business also needs “validating” and “partially valid,” changing the name alone will not fix the state model. `UserAuth` suggests authentication duties: sending a verification email may belong there, while sending a marketing campaign would be hard to guess from the name. Names cannot replace design, but they can expose its ambiguities.

If a class handles login, initializes database connections, and cleans logs, calling it `LoginController` sends maintainers looking in the wrong place. The program may still run, but the name has already given its readers a misleading map.

This mismatch also occurs outside code. A name starts as a way into understanding, but we easily mistake knowing what something is called for knowing what it is. Relationships, emotions, and workplace terms are especially prone to giving us that confidence.

## Scripting Relationships

The objects we are most enthusiastic to name are relationships between people.

Two people may feel admiration, dependence, physical attraction, and intellectual affinity, mixed with competition or hesitation. These feelings need not arrive together, or fit neatly under one label.

When someone asks “What is your relationship?”, feelings the two people have yet to discuss may have to fit under a label first.

Are you "friends"? "lovers"? "friends with benefits"? "partners"?

Choosing a name such as “lovers” can express a commitment and make the relationship clear to both people. But it can also bring in a script they never discussed.

Saying good night every day, exchanging holiday gifts, promising exclusivity: all these expectations may follow. Some matter deeply; others are habits, and the two people may understand them differently. “Isn't that what lovers are supposed to do?” can turn a necessary discussion into an obligation that cannot be questioned.

At that point, the way these two people relate may be overwritten by a generic class called “lovers.” The argument shifts from “What do we each need?” to “Are you playing your role properly?”

When a general script replaces a specific agreement, the name easily crowds out individual differences.

What concerns me is whether people can still express needs that do not fit the role of “spouse” or “best friend.” If keeping the label requires hiding those needs, the arrangement deserves another conversation.

## Pathologizing Emotions

Looking inward, our naming of our own feelings is equally concealing.

Modern psychology and psychiatry have given us words for describing emotions and getting help. That is meaningful progress: diagnoses can open access to treatment, support, and reasonable rest. But when these words are overused, they can also become a hasty explanation for every complex experience.

Imagine someone feeling hollow, crying at sunsets, finding work meaningless, and wanting to go far away. Those few details do not tell us what they have experienced, let alone establish a diagnosis.

Now we may quickly call it “depression,” “anxiety,” or “burnout.” A name can be an entry point to professional help and should not be casually dismissed, but it does not automatically explain a person’s whole situation.

When we say “I am anxious,” it is worth asking at the same time: how long has it lasted, is it affecting sleep and daily life, is professional support needed, and are there parts of one’s routines, work environment, or relationships that can change? Medical and situational explanations can both be true; neither replaces the other.

This is another blind spot of naming: it can make us stop asking questions too soon.

The problem is not using diagnostic or psychological vocabulary. It is using it as a universal lid. Treating “social anxiety” or “procrastination” as throwaway labels can hide more specific difficulties too. A good name should help someone see a problem and get help, not excuse everyone else from understanding it.

## Magic Words at Work

At work, some names also change where responsibility appears to lie. If a word makes a decision sound inherently right, questioning its consequences becomes harder.

A familiar example for programmers is "sprint".

The [2020 Scrum Guide](https://scrumguides.org/scrum-guide.html#the-sprint) defines a Sprint as a fixed-length event of one month or less and calls for a sustainable pace of work. In everyday language, however, sprinting means a brief all-out effort followed by rest. When managers borrow that meaning to demand extra effort, then put one “sprint” immediately after another, a temporary acceleration becomes a permanent demand. The problem is using the word to justify exhaustion, rather than iteration itself.

Consider another word: "optimization".

Suppose a company lays people off because of poor decisions and a cash shortage, but announces only an “optimization of the organizational structure.” Both the cause and the cost recede into the background.

"Firing" is brutal; it involves real families, mortgages, and tears. "Optimization" is neutral, mathematical, even positive. It suggests removing redundancy and improving efficiency.

Through naming, brutal reality can become abstract. Decision makers signing documents process “data,” while the people affected must deal with rent, care work, and finding the next job. That distance between two languages is what needs to be seen.

A third effect of naming is that it can soften consequences, making decisions that deserve scrutiny seem self-evidently reasonable.

Calling compulsory overtime “flexible work” or exploitation a “blessing” works in a similar way. To assess these terms, we need to ask who controls working hours and who pays the extra cost. A more pleasant name has answered neither question.

## What a Name Leaves Out

Back to programming. When designing interfaces, we always pursue abstraction. The essence of abstraction is to ignore details and extract commonalities.

A name leaves out details too. Omission is inevitable and need not be harmful. What matters is whether the omitted details would change the decision at hand.

We gain efficiency. When calling `sort()`, we usually need not care which algorithm it uses. But if our task requires a stable sort, we must check whether the interface guarantees it. Labels can similarly help us filter information, provided they preserve the distinctions our decision needs.

Inferring a couple's agreements from “lovers,” or assuming a decision deserves support because it is called “optimization,” treats something the interface never promised as a guarantee.

What agreements does “lovers” actually include? What circumstances lie behind “anxiety”? Who pays the price in an “optimization”? A name provides a quick entry point, but it often leaves out critical constraints. Keeping the name while asking for the specific details it omitted is what makes that name genuinely trustworthy.
