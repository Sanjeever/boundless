---
title: Self-Sufficient Frontend UI Design Draft (Claude AI Version)
date: 2025-03-03
tags:
  - AI
  - Claude
  - UI/UX
  - Design
  - Tailwind
  - HTML
  - Artifacts
  - GPT-4o
  - DeepSeek
---
# Self-Sufficient Frontend UI Design Draft (Claude AI Version)

> ✨Article Summary (AI Generated)

<!-- DESC SEP -->

Recently, I explored how to leverage AI, particularly Claude, to assist frontend developers in completing UI design tasks. Through practice, I found that Claude performs excellently in this area, capable of quickly generating interface designs that align with modern design trends.

In this article, I use a health app as an example to demonstrate how to guide AI in completing design tasks through simple prompts. The entire process is divided into several core modules: **Home Overview**, **Exercise Plan**, **Diet Management**, and **Community Features**. By designing in modules, not only can we avoid the output limitations of AI models, but also make the design more focused and refined.

To improve efficiency and usability, I emphasized the following points in the prompts:
- Use Tailwind CSS (via CDN) for styling
- Use Lucide Static CDN for handling icons
- Integrate related pages into a single HTML file

Through comparative testing, Claude (especially version 3.5) currently performs the most stably in this scenario. Other models like GPT-4o and DeepSeek still have some gaps when completing similar tasks.

<!-- DESC SEP -->

## Let's See the Results

### Health App

Input: Health App

> AI begins to think and design features, as well as unify the design style; then calls visualization plugins for HTML preview (these steps can also be completed in editors like Cursor, and then directly preview the HTML)

The results are as follows:

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303145429.png)

> Then, AI continues to ask me whether to proceed and which module to continue with.

Input: Continue with [Exercise Plan Module]

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303145552.png)

Similarly, input: Continue with [Diet Management Module]

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303145940.png)

Finally, input: Continue with [Community Features]

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303150626.png)

### Podcast App

> Enter a Podcast-related app, and then just keep going, as shown below:

![](https://oss.justin3go.com/blogs/20250304155943507.png)

![](https://oss.justin3go.com/blogs/20250304160130247.png)

![](https://oss.justin3go.com/blogs/20250304160202306.png)

![](https://oss.justin3go.com/blogs/20250304160231953.png)

![](https://oss.justin3go.com/blogs/20250304160254854.png)

![](https://oss.justin3go.com/blogs/20250304160309438.png)

### Twitter-like App

> Enter a Twitter-like app, and then just keep going, as shown below:

![](https://oss.justin3go.com/blogs/20250304160402030.png)

![](https://oss.justin3go.com/blogs/20250304160418750.png)

![](https://oss.justin3go.com/blogs/20250304160436182.png)

![](https://oss.justin3go.com/blogs/20250304160451704.png)

![](https://oss.justin3go.com/blogs/20250304160513726.png)

## Prompts as Follows

> The article is translated from Chinese, and the prompts may need some tweaking to be usable.

```
## Who You Are

You are a seasoned full-stack engineer and design engineer with extensive experience in full-stack development and a high aesthetic taste, specializing in modern design styles and mobile design and development.

## What You Need to Do

1. The user will propose an [APP Requirement]
2. design this [APP Requirement], simulate the product manager's requirement and information architecture, and conceive the functional requirements and interface yourself

> For each small function (which may have multiple pages based on functional division), output an HTML, and after outputting, prompt the user whether to continue. If the user inputs continue, continue to output the UI/UX reference diagram for the next function according to the steps below.

3. Then use HTML + Tailwind CSS to design the UI/UX reference diagram
4. Call the [Artifacts] plugin to visually preview the UI/UX diagram (visualize the HTML code you wrote)

## Requirements

- Must be high-end and textured (using glassmorphism and other visual effects), adhere to design specifications, and pay attention to UI details
- Please use Tailwind CSS CDN to complete, rather than writing style styles, use images from Unsplash, and ensure no scrollbars appear on the interface
- Use Lucide Static CDN to introduce icons, such as `https://unpkg.com/lucide-static@latest/icons/XXX.svg`, instead of manually outputting icon SVG paths
- Write all pages of a function into one HTML (create a simple mockup border preview for each page, arranged horizontally), each page is independent within its own mockup border and does not affect each other
- The thought process should only consider functional requirements, overall design style, etc., and not write code during the thought process, only output code in the final result
```

Basic Idea:

Generate the corresponding code through HTML + Tailwind and then run it. Use CDN to introduce Tailwind for easy direct preview without the lengthy `npm install`.

Some Tips:

- Use Lucide Icon CDN to avoid AI consuming a large number of tokens to draw SVG paths
- Use a modular approach to avoid truncation issues (currently, Claude 3.7 has severe truncation issues, so Claude 3.5 is temporarily used as a substitute, and the effect is also good)
- Think about the functions and overall design style in advance to facilitate reference when designing pages by function

## What About Other Models

As of 2025-03-03, other models mostly do not work well. Claude 3.7 performs okay but is often truncated and not stable enough, so it can be observed further.

Only two non-inference models have been tried, and others can try on their own.

### GPT-4o

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303150737.png)

### DeepSeek

![](https://oss.justin3go.com/blogs/Pasted%20image%2020250303150817.png)

## References

Inspired by the thought-sharing of the following two bloggers:

- [Cursor Makes It Easy for Ordinary People to Design a Beautiful APP UI 2.0 Version](https://x.com/huangzh65903362/status/1895991413881651504)
- [Hello, I Am "Another Day of Being Replaced" Service, This Is the UI/UX Design I Made in 300 Seconds (I Am Claude 3.7 Thinking btw)](https://x.com/fengbuyou/status/1894801574716940616)
