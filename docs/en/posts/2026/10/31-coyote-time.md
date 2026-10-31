---
title: Six Frames at the Cliff Edge and the First Shot That Misses
date: 2026-10-31
tags:
  - Game Design
  - Interaction
  - Essay
description: From Celeste's 0.1-second ledge grace period to BioShock's intentionally missed opening shot, a look at how games quietly bend rules to catch human intuition.
outline: deep
aside: true
---

# Six Frames at the Cliff Edge and the First Shot That Misses

<!-- DESC SEP -->

From Celeste's 0.1-second ledge grace period to BioShock's intentionally missed opening shot, a look at how games quietly bend rules to catch human intuition.

<!-- DESC SEP -->

Old Warner Bros. cartoons ran on an unwritten law of physics: when Wile E. Coyote sprinted off a cliff after the Road Runner, gravity held its breath so long as he never looked down. He could take two or three full strides in midair before glancing at the canyon floor and dropping like a stone.

Decades later, that gag was written straight into the movement code of countless platformers, keeping the cartoon's name intact as [Coyote Time](https://en.wikipedia.org/wiki/Coyote_time).

## Six frames and half a brick

By strict physical logic, the instant a character's feet leave a ledge, there is nothing left to push against. Pressing jump a millisecond later should do nothing at all.

Code a game that strictly, though, and players will constantly plummet off ledges they swore they cleared. When your eyes are already tracking the landing spot across a gap, your thumb almost always hits the button a fraction of a second after your character's heels leave the stone. It feels as if the controller swallowed your input.

Maddy Thorson, co-creator of _Celeste_, once laid out the game's feel tricks in a short piece titled [Celeste & Forgiveness](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/index.html), and later put the full character controller [`Player.cs`](https://github.com/NoelFB/Celeste/blob/master/Source/Player/Player.cs) on GitHub. Near the top of that file sits a single constant:

```csharp
private const float JumpGraceTime = 0.1f;
```

One tenth of a second. At 60 frames per second, that comes out to six frames.

When Madeline runs off a ledge into thin air, that 0.1-second clock starts ticking. Hit jump anywhere inside those six frames, and the game still lets her kick off the empty air.

![Slow-motion demonstration of Coyote Time in Celeste: Madeline walks completely off the ledge before the jump button is pressed, yet still leaps from midair](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/images/1.gif)

If Coyote Time catches a thumb that arrives too late, what happens when it arrives too early?

During rapid consecutive jumps, players often press the button a moment before their character's boots actually touch the floor. If the engine simply checked `onGround == false` while in the air and threw the input away, Madeline would land like a sack of flour and stand still.

_Celeste_ pairs Coyote Time with **Jump Buffering**. An early jump press is tucked into a brief buffer timer; on the exact frame Madeline's soles touch the ground pixels, the stored jump fires automatically.

![Slow-motion demonstration of Jump Buffering in Celeste: pressing and holding jump shortly before landing triggers a jump on the exact frame Madeline touches the ground](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/images/2.gif)

One window forgives being late, the other forgives being early. Together they stretch a razor-thin single-frame requirement into a generous corridor of time.

Once Madeline is airborne, the quiet adjustments move from time to space and gravity.

Jump straight up and clip the corner of an overhead block with the edge of her head, and a rigid physics engine would bonk her straight back down into the spikes. In _Celeste_, so long as she is off by no more than four pixels (`UpwardCornerCorrection = 4`), the game quietly nudges her sideways around the corner so the jump continues uninterrupted. Dash horizontally and clip the lip of a platform (`DashCornerCorrection = 4`), and it pops her up onto the ledge.

_Celeste_ renders on a native $320 \times 180$ pixel canvas, where a single terrain tile is $8 \times 8$ pixels. Four pixels of corner forgiveness means the game yields half a brick of leeway in your favor.

![Slow-motion demonstration of Jump Corner Correction in Celeste: Madeline's head clips the corner of an overhead block while jumping, and the game shifts her sideways around the obstacle](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/images/4.gif)

Even gravity refuses to stay constant.

As Madeline nears the apex of a jump—where her vertical speed drops inside the threshold `HalfGravThreshold = 40f`—holding the jump button cuts gravity in half:

```csharp
float mult = (Math.Abs(Speed.Y) < HalfGravThreshold && (Input.Jump.Check || AutoJump)) ? .5f : 1f;
Speed.Y = Calc.Approach(Speed.Y, max, Gravity * mult * Engine.DeltaTime);
```

She hangs at the top of her arc for a beat longer than physics would allow. Nobody playing the game consciously calculates acceleration; the air at the peak simply feels a touch thicker, giving your eyes just enough time to spot the spikes below and nudge the stick back half an inch.

Wall climbing hides an even gentler piece of accounting. Jumping straight up while grabbing a wall burns a heavy chunk of stamina, whereas jumping away from the wall costs zero stamina. The inputs for the two moves are nearly identical. If you panic, trigger a costly vertical climb-jump first, and press away from the wall a few frames later, _Celeste_ retroactively converts the move into a normal wall jump and refunds the stamina you just spent (Stamina Refunds).

![Slow-motion demonstration of Stamina Refunds in Celeste: pressing away from the wall shortly after a vertical climb-jump refunds the spent stamina and applies horizontal wall-jump force](https://www.maddymakesgames.com/articles/celeste_and_forgiveness/images/10.gif)

None of these interventions announce themselves. You clear the screen, exhale, and walk away convinced your reflexes were unusually sharp today.

## Curved bullets and frozen frames

Step out of two-dimensional tile grids into three-dimensional firefights and melee combat, and the hidden dials shift to projectile paths, frame pacing, and enemy aim.

Ask players why gunplay in _Destiny 2_ feels so crisp, and most will point to animations or sound design. Bungie's weapons team, though, splits aim assistance into two distinct mechanisms.

The first is **Reticle Friction**, built specifically for controller thumbsticks. Sweep your crosshair across an enemy, and camera movement slows down slightly—like dragging a pen across a patch of sandpaper—helping your thumb stop on the target instead of overshooting.

The second is **Bullet Magnetism**, which works on both controllers and mouse-and-keyboard. So long as a target sits inside a weapon's invisible aim-assist cone, a round that would have grazed past their ear bends in midair to land squarely between the eyes.

Melee action games play a similar trick on the clock itself.

Swing the Leviathan Axe into an enemy in _God of War_, and both Kratos and the monster freeze in place for a few frames—a technique known as **[Hitstop](https://en.wikipedia.org/wiki/Glossary_of_video_game_terms#hitstop)**.

In the real world, steel biting into flesh slows down; it does not pause the universe. Yet if you strip those frozen frames out of an animation, even the heaviest two-handed warhammer feels like a hollow plastic tube waving through air. Those brief stalls act as visual punctuation for the retina while slipping your fingers a few extra milliseconds to queue up the next combo input.

## Stagehands in the dark

Pull the camera back further, and the enemies and health bars are in on the act too.

In 2017, game designer Jennifer Scheurle started a [developer thread](https://www.gamedeveloper.com/design/tricks-of-the-trade-devs-reveal-how-their-games-fool-players) asking colleagues to share the hidden lies they coded into games to make players feel heroic. Dozens of backstage rules came tumbling out.

In _BioShock_, when an enemy ambushes you from outside your field of view, their **opening shot is programmed to miss**. The bullet whistles past your cheek and chips the plaster on the wall ahead. That first round was never meant to deal damage; it is an audio cue tapping you on the shoulder so you can spin around and fight back.

The health bar in the corner of the screen is rarely an honest ruler either.

In titles like _Assassin's Creed_ and _DOOM_, health segments are weighted unevenly. The final sliver of flashing red health holds significantly more actual hit points than an equal width of the bar when you are full. Players spend minutes with their pulse pounding, convinced they survived by a hair's breadth, unaware that the last millimeter of the gauge was reinforced steel.

Surrounded by a crowd of enemies, the stage choreography gets even stricter.

In _God of War_ or _Hellblade_, seven or eight foes may circle you at once, yet only one or two actually swing their weapons. Behind the scenes, the combat system hands out a small pool of **Attack Tokens**. Only an enemy holding a token is allowed to step forward and strike, while the rest pace around the perimeter and shout; enemies standing outside the camera frustum have their aggression throttled even further.

What looks like a desperate brawl against a pack of wolves is, under the hood, an orderly queue waiting for its number to be called.

## An invisible thermostat

While stagehands manage individual skirmishes, Dynamic Difficulty Adjustment (DDA) watches over the temperature of the entire journey.

The 2005 original _Resident Evil 4_ tracks a hidden scale from 1 to 10 on normal difficulty, known among modders and speedrunners as [GameRank](https://residentevil.fandom.com/wiki/Difficulty#Resident_Evil_4). Land headshots and dodge attacks cleanly, and the dial creeps upward—villagers sprint harder, flinch less, and hit for more damage. Die repeatedly in the same cabin or run dry on ammunition, and the dial slides back down: enemies hesitate at a distance, and certain crossbowmen perched on rooftops are quietly deleted from the room before you respawn.

Supply drops follow the same invisible ledger. In both _Resident Evil 4_ and _BioShock_, running low on health or a specific caliber nudges crates and corpses to drop healing herbs and matching rounds; hoard a full briefcase, and the faucet tightens.

For _Left 4 Dead_, Valve's [Michael Booth](https://cdn.fastly.steamstatic.com/apps/valve/2009/ai_systems_of_l4d_mike_booth.pdf) gave this backstage conductor an explicit title: the **AI Director**.

Instead of placing zombies at fixed coordinates, the Director monitors the four survivors' health, skill, and recent trauma, cycling the match through four distinct states:

```mermaid
flowchart LR
    A["Build Up<br/>Rising tension"] --> B["Sustain<br/>Peak combat"]
    B --> C["Fade<br/>Threat recedes"]
    C --> D["Relax<br/>Brief breather"]
    D --> A
```

When a squad limps out of a brutal horde with black-and-white vision, the Director shifts into `Fade` and `Relax`, turning down the spawning valves to grant thirty seconds of quiet bandage-wrapping. Once heart rates settle and the team rounds the next corner, the distant wail of a special infected signals the return of `Build Up`.

## Kindness left in plain sight

Most of the machinery above stays hidden beneath the floorboards because spotting it in the moment would puncture the illusion of mastery.

Another class of forgiveness, though, works best when left right out in the open.

Right at the start of _Halo: Combat Evolved_ (2001), as Master Chief steps out of his cryo tube aboard the _Pillar of Autumn_, a technician runs a quick diagnostic and asks you to look up at the flashing red lights on the ceiling. Push the thumbstick forward to look up, and the game keeps standard controls. Pull the stick back toward your stomach—like pulling back on a flight yoke—and the technician notes your instinct and configures **inverted Y-axis** on the spot. No digging through three layers of options menus to decipher technical labels; a single natural glance calibrates the camera.

_Uncharted 4_ brought that same consideration into its settings menu. After accessibility advocate Josh Straub told Naughty Dog he had been physically unable to finish _Uncharted 2_ because of a grueling button-mashing QTE near the ending, the studio added a suite of [accessibility toggles](https://gameaccessibilityguidelines.com/avoid-or-provide-alternatives-to-requiring-buttons-to-be-held-down/) that soon became an industry standard: players could swap rapid button taps for a single continuous hold, and turn hold-to-aim into a simple press-to-toggle.

Hammering the Square button forty times to pry open a stone door adds thumb strain, not tactical depth. Stripping away the physical friction leaves the adventure intact.

Look around everyday games with that lens, and these quiet courtesies fall into three clear layers:

| Layer                | Common techniques                                                                                    | Friction removed                                                                                           |
| -------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Input forgiveness    | Coyote Time, Jump Buffering, Corner Correction, Bullet Magnetism, ledge snapping                     | Accepts early, late, or slightly off-center inputs, translating clumsy hardware presses into player intent |
| Rule regulation      | Deliberately missed opening shots, non-linear low health, Attack Tokens, dynamic difficulty and loot | Blocks blind-spot cheap shots and unwinnable dogpiles, keeping combat inside human reaction windows        |
| Comfort & ergonomics | Hold-instead-of-tap QTEs, diegetic axis calibration, auto-loot, camera follow, generous hitboxes     | Cuts out repetitive clicking and pixel-hunting, easing hand fatigue and motion sickness                    |

## The gap between intent and thumb

Why would a famously punishing game like _Celeste_—where a single playthrough routinely racks up thousands of deaths—pack its source code with so much mercy?

Because human intent is continuous, whereas microswitches under a thumb, 60 discrete frames per second, and a $320 \times 180$ pixel grid are rigid and quantized.

When a run ends because your thumb was 0.05 seconds late or Madeline's hair grazed two pixels of stone, you rarely walk away admiring the level design. You walk away feeling the scrape of flesh against machinery: _I meant to jump, and the controller ignored me._

Meaningful difficulty lives in deciding when to leap and which line to dash through—not in losing an argument with a collision box over two pixels.

Whether it is six borrowed frames beyond a cliff edge, a first bullet aimed at the wall beside your ear, or a quiet button hold in place of frantic mashing, every one of these mechanisms slips a soft lining between human intuition and cold arithmetic.

At the end of _Celeste & Forgiveness_, Maddy Thorson summed up the whole craft in a single sentence: that is why _Celeste_ can feel kind even when it is brutally hard—because it wants you to succeed.
