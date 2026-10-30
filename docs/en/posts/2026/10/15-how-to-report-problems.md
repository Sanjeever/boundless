---
title: “This Report Stopped Working”
date: 2026-10-15
tags:
  - Software Development
  - Communication
  - Collaboration
description: From a four-word complaint and a blurry screen photo to a stack of voice notes, here is how adding three small details turns a vague bug report into an actionable one.
outline: deep
aside: true
---

# “This Report Stopped Working”

<!-- DESC SEP -->

From a four-word complaint and a blurry screen photo to a stack of voice notes, here is how adding three small details turns a vague bug report into an actionable one.

<!-- DESC SEP -->

## “It Stopped Working”

> This report stopped working.

Which report? Does the page fail to load, or do the numbers not add up?

When a message arrives with four words, debugging cannot start until after three rounds of twenty questions. Two extra sentences change everything:

> In the daily sales report, selecting October 14 and clicking Export downloads an Excel file with column headers only. The table on screen shows 28 rows, and exports earlier this week included them. Attached are the file and a screenshot.

Now I know which page to open, which date to test, and what went wrong.

## A Photo of a Failed Payment

> [A camera photo of a screen reading “Payment failed”]
>
> What happened here?

The photo shows the error banner, but no timestamp, terminal ID, or order number. Staring at tens of thousands of log lines, there is nothing to grep for.

Adding one line of context underneath the photo makes it searchable right away:

> Today at 14:32, terminal D-017, order DEMO-001, CNY 28 via WeChat Pay. The terminal says payment failed, while the customer’s phone shows a deduction. Screenshots from both sides are attached.

## A Screen Recording with Voiceover

> [recording.mp4]
>
> It’s doing this thing again, take a look.

In the video, the cursor darts across three menus, backtracks halfway through a sentence, and clicks again. Two minutes later, I still cannot tell which step was the bug.

Pairing the clip with a one-line breadcrumb points straight to the trouble:

> Inventory → Product list → search “paper cups” → click Next page: the search filter resets. You can see it at `00:23` in the video.

Better yet, text steps can be pasted straight into a coding agent without transcribing a monologue first.

## A Stack of Voice Messages

> [Voice message 48"]
> [Voice message 55"]
> [Voice message 39"]

Everything makes sense while listening. Ten minutes later, when I need the account ID for a database query, I have to put my headphones back on and scrub through three audio clips because you cannot `Ctrl+F` a voice note.

Even after sending audio, a quick text follow-up saves everyone time:

> Membership system: member DEMO-008 had 3 coupons yesterday, sees 0 after logging in today, and has no redemption records. Could we check where those 3 coupons went?

The ID is ready to copy, and the message can be forwarded cleanly to whoever owns that service.

## After a Phone Call

> I already told you on the phone earlier.

True—and five context switches later, half the dates and numbers from that call have evaporated. Dropping a two-line recap in chat after hanging up gives both sides an anchor:

> Following up on our call: the daily sales export is missing detail rows. Sample file attached; let me know once the fix is up and I’ll re-test with October 14 data.

## A Spreadsheet Full of Red Cells

> [issues.xlsx]
>
> Everything’s in the sheet, please check.

Inside, screenshots overlap merged cells and several numbers are highlighted in bright red with no note saying what they *should* be.

Sending the file alongside a pointer makes the review ten times faster:

> On the “Sales Details” tab, cell F18 totals 280, whereas the rows above sum to 260. Also on page 2 of the Word export, the header wraps and pushes the last column onto page 3.

Every bug report ultimately needs to answer three small questions: **where it happened, what was expected, and what actually occurred**. Put those three lines in text, keep the screenshots as evidence, and half the debugging is already done.

::: details Further Reading

- [How to Ask Questions the Smart Way](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way/blob/main/README-zh_CN.md)
- [How to Report Bugs Effectively](https://www.chiark.greenend.org.uk/~sgtatham/bugs-cn.html)
- [The XY Problem](https://xyproblem.info/)
- [Minimal, Reproducible Example](https://stackoverflow.com/help/minimal-reproducible-example)
- [No Hello](https://nohello.net/zh-cn/)
- [Don't Ask to Ask](https://dontasktoask.com/zh-cn/)
- [Stop-Ask-Questions-The-Stupid-Ways](https://github.com/tangx/Stop-Ask-Questions-The-Stupid-Ways)

:::
