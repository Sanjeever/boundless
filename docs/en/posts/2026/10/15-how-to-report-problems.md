---
title: “This Report Stopped Working”
date: 2026-10-15
tags:
  - Software Development
  - Communication
  - Collaboration
description: A vague complaint, a photo of a failed payment, several voice messages. Some familiar problem reports from project work, and what a few extra words can change.
outline: deep
aside: true
---

# “This Report Stopped Working”

<!-- DESC SEP -->

I work on several projects and often receive a vague complaint, a photo, or several voice messages. The problem has been reported, but starting an investigation still takes a few rounds of questions. Here are some examples.

<!-- DESC SEP -->

## “It Stopped Working”

> This report stopped working.

Which report? Does it fail to open, or are the numbers wrong? When did it start? One sentence turns into a back-and-forth before I can look into anything.

A couple more sentences give me something concrete:

> In the daily sales report, I select October 14 and click Export. The Excel file has only column headings. The page shows 28 records, and earlier exports included the details. I've attached the file and a screenshot of the page.

Now I know which page to open, which filter to use, and what kind of failure to look for.

## A Photo of a Failed Payment

> [A photo of a screen showing “Payment failed”]
>
> What's going on?

The photo shows the error but no time, device ID, or order number. I could check the logs, but I don't know which transaction to start with.

A short message next to the photo changes that. These identifiers are just examples:

> Today at 14:32, checkout device D-017, order DEMO-001, CNY 28, WeChat Pay. The device says the payment failed, but the customer's phone shows a charge. Here are screenshots from both sides. Could you check this transaction?

## A Video with Spoken Commentary

> [recording.mp4]
>
> That's roughly what happens. Have a look.

The recording moves through several pages, and halfway through the explanation the person goes back and tries again. After watching, I'm still unsure which step went wrong. Sometimes I can't even tell what “this bit is wrong” refers to.

A few lines make the same video much easier to use:

> Inventory → Product list → search for “paper cups” → click Next page. The search filter gets cleared. I expected the next page to still show only paper cups. You can see it at 00:23 in the video.

I can also pass those steps straight to a Coding Agent without first turning all the commentary into notes.

## Several Long Voice Messages

> [Voice message]
>
> [Voice message]
>
> [Voice message]

It makes sense while I'm listening. Later, when I need the order number, I have to listen again. Other topics may be mixed in, and I can't skim the messages the way I can skim text.

Even after sending the audio, a short written follow-up helps:

> The voice messages were about the membership system. Member DEMO-008 had 3 coupons yesterday, but sees 0 after logging in today. There are no redemptions in the history either. I'd like to find out what happened to those 3 coupons.

The identifier is easy to copy, and the message can go straight to whoever handles that project.

## A Phone Call

> I told you about it on the phone.

They did. But after working across several projects in a day, I can't reliably remember every detail of a call. Handing it over to someone else means reconstructing the conversation from memory.

A message afterward gives both people something to return to:

> As we confirmed on the call, the daily sales export is missing the detail rows. I've attached the file here. You'll investigate and let me know when it's fixed; I'll try again with the October 14 data.

## A Word Document or Excel Workbook

> [problem-report.xlsx]
>
> Have a look. All the issues are in there.

Inside, screenshots, notes, and merged cells are crowded together. Some cells are red, with no explanation. I have to reorganize the file before I can work through it.

The file is easier to read when the message points to the relevant places:

> In the Excel workbook, cell F18 on “Sales details” totals 280, but adding the rows above gives 260. I've marked the relevant cells. There's another issue on page 2 of the Word document: after export, the column headings wrap and the last column moves onto the next page.

When the problem involves formatting or formulas, the original file is useful. If it contains a dozen issues, numbering them also makes it easier to reply with “Issue 3 is fixed.”

When these reports arrive, I usually need to find three things first: which event, what went wrong, and what help is needed. A few lines in the message, with attachments for the details, save a lot of follow-up questions.

::: details Related reading

- [How to Ask Questions the Smart Way](https://github.com/ryanhanwu/How-To-Ask-Questions-The-Smart-Way/blob/main/README-zh_CN.md)
- [How to Report Bugs Effectively](https://www.chiark.greenend.org.uk/~sgtatham/bugs-cn.html)
- [The XY Problem](https://xyproblem.info/)
- [Minimal, Reproducible Example](https://stackoverflow.com/help/minimal-reproducible-example)
- [No Hello](https://nohello.net/zh-cn/)
- [Don't Ask to Ask](https://dontasktoask.com/zh-cn/)
- [Stop-Ask-Questions-The-Stupid-Ways](https://github.com/tangx/Stop-Ask-Questions-The-Stupid-Ways)

:::
