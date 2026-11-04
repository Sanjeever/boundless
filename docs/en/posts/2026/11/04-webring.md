---
title: Webrings and the Little Door in the Footer
date: 2026-11-04
tags:
  - Essay
  - Information Access
  - Webring
description: From hand-linked pages in 1994 to independent rings today, how webrings join personal sites into a circle and why a small door to Geekring now sits in this blog's footer.
outline: deep
aside: true
---

# Webrings and the Little Door in the Footer

<!-- DESC SEP -->

From hand-linked pages in 1994 to independent rings today, how webrings join personal sites into a circle and why a small door to Geekring now sits in this blog's footer.

<!-- DESC SEP -->

Finding something online today usually starts with typing a few words into a search box or waiting for an algorithm to deal another card onto the screen. Personal blogs sit across the ocean like isolated islands. A visitor drifts in through a search link, reads one post, closes the tab, and is gone.

Recently I came across [webrings](https://en.wikipedia.org/wiki/Webring).

The idea behind a webring is disarmingly simple. A few dozen or a few hundred personal websites with shared sensibilities join hands in a circle. Each site tucks a small navigation bar into a corner of the page, usually offering just three links, `Previous`, `Random`, and `Next`.

Finish reading an article in one house, click `Next`, and you step straight into the neighbor's yard. Keep walking in the same direction long enough, and the circle brings you right back to the page where you started.

## From hand-edited chains to a central script

[Webring World](https://www.webringworld.org), launched in November 2002 and tended by veteran ringmasters, keeps a thorough [history of webrings](https://www.webringworld.org/history-of-webrings/) that traces how the mechanism took shape.

In December 1994, Denis Howe at Imperial College London started an experiment called EUROPa (Expanding Unidirectional Ring Of Pages). He wanted to see how far a single chain of hyperlinks could stretch across the World Wide Web.

At first, the whole circle ran on manual upkeep. Every site placed a link pointing directly to the next site in line. Whenever a new member joined or an old one dropped out, neighboring webmasters emailed one another, opened their HTML files, and edited the addresses by hand.

The ring behaved like a hand-wired singly linked list. If one server lost power or one webmaster went on vacation and forgot to update a link, the circle snapped on the spot.

In 1995, seventeen-year-old Sage Weil wrote a Perl [CGI](https://en.wikipedia.org/wiki/Common_Gateway_Interface) script and founded WebRing. He moved the roster onto a central server so the script could keep track of the lineup and handle redirects automatically.

Individual webmasters only had to paste a small, unchanging snippet of HTML into their pages without worrying about who stood to their left or right. When a visitor clicked `Next` or `Random`, the request went to the central script, which looked up the member number and forwarded the browser to the right destination, even offering a `Skip` option to hop over a site that had gone offline.

Within a few years, WebRing had grown to more than seventy thousand rings across every imaginable topic, linking one and a half million websites.

Then came the late-nineties acquisition wave. WebRing was sold to Starseed, absorbed into GeoCities, and finally swallowed by Yahoo!. Eager to monetize the traffic, the portal forced ads into member rings and tore down the custom directories that ringmasters had carefully designed, replacing them with uniform Yahoo! hub pages.

In the summer of 2000, Gunnar Hjalmarsson, who ran The Quotation Ring, decided to build a way out. He barely considered himself a programmer and had only ever tweaked a guestbook script. Taking advantage of a rainy summer, he spent his vacation learning Perl as he went and released the open-source Ringlink program at the end of July. From then on, anyone could host a small ring on a personal server without answering to a web portal.

## Nowhere near page one on the search engines

As search engines and social feeds took over the front door of the internet, webrings receded into quiet corners, yet they never died out. In recent years, independent creators tired of algorithmic feeds have started stringing these small circles back together.

[Geekring](https://geekring.net/) is one of those gathering places, built for personal websites, tinkerers, and lovers of geek culture.

Open the Geekring homepage and you are greeted by the raw texture of 1993 hand-written HTML, with a blunt manifesto right at the top.

> This is the old web, in 2024! For all those funny, quirky, interesting, personal, strange, offbeat websites that's not page 1 on the search engines.

Its creator, DusteD, tells [the story behind Geekring](https://geekring.net/why.html) on a separate page. At thirteen, he talked his local youth club into letting him tuck a 100 MHz Pentium with 32 MB of RAM, running Windows 95 and Apache, inside their networking closet, borrowing the club's cable connection to put his first web server online.

One workday in 2019, he got a phone call telling him his father had been diagnosed with cancer. Unable to stay at the office, he drove home early. Sitting behind the wheel, he felt two opposite pulls at once, wanting room to be alone while still longing for quiet connection with other human beings. He wanted a small, slow thing online that he could tend like a garden, something that would never need to scale.

When he got home, with the logic already worked out in his head, he sat down, wrote the program, hooked it into Nginx, and has barely touched the code since.

The ring has a clear temperament. Commercial sites built to sell products are turned away at the door, while personal homepages, hobbyist notes, and free or open-source software projects are warmly welcomed.

The entire membership roster lives in a plain-text file, [`/list.txt`](https://geekring.net/list.txt), maintained by hand. Each site receives a number and connects to its neighbors through `previous`, `random`, and `next` endpoints. Even the random redirect has a gentle tilt, giving pages with fewer visits a slightly higher chance of being picked next.

Because some geeks still browse the web on vintage machines whose hardware or old operating systems cannot handle modern TLS ciphers, Geekring serves plain HTTP alongside HTTPS by default. There are no cookies, no client-side scripts, and no server request logs.

Membership review moves at the unhurried pace of the old web too. DusteD notes that he checks pending submissions at a fixed interval, whenever he feels like it, sometimes in a day or two and sometimes after a few weeks, depending on his mood that day.

## The little door in the footer

Search engines ask you to arrive with a clear question already in mind before handing back a ranked answer.

A webring leaves room for wandering. You might finish reading a troubleshooting note, click `Random` or `Next` at the bottom of the page, and find yourself in a stranger's workshop watching them restore a vintage synthesizer or flip through a hand-drawn pixel art gallery.

No search rankings prod the writer, and no recommendation feed tries to guess your appetite. Websites recognize one another simply through a shared temperament among the people who tend them.

A couple of days ago, I added a [Geekring](https://geekring.net/) link to the Chinese and English footers of Boundless and sent in an application form.

Right now that request is sitting quietly in the queue, waiting for the ringmaster to be in the mood to check the inbox. Once the site gets its number in the circle, the footer will gain three small doors for `Previous`, `Random`, and `Next`. Anyone who finishes reading a page and feels like strolling further can push open the door and drop in on the neighbor next door.
