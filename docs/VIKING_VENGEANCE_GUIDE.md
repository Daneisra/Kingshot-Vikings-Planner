# Viking Vengeance Guide

This document summarizes the most consistent strategies currently shared by the Kingshot community for the `Viking Vengeance` event and translates them into product implications for Kingshot Vikings Planner.

It is meant to serve two goals:

- help alliance leadership run the event more cleanly
- guide future planner features with event-specific logic

## Scope

This is not an official game manual. It is a synthesis of current wiki and community guide material, with product-oriented recommendations layered on top.

Where a point is based directly on published sources, it is stated as such.
Where a point is a tactical recommendation, it should be treated as an informed operational guideline rather than a guaranteed game rule.

## Core Event Mechanics

Across the available sources, the event works like this:

- there are `20` total waves
- waves `7`, `14`, and `17` target `online players only`
- waves `10` and `20` target the `alliance HQ`
- if a city fails twice, Vikings stop attacking that city
- the event lasts roughly `40 minutes`
- scoring is driven by kills in your own city and by kills made while reinforcing allies

The strongest alignment between sources is on one critical point:

- the best alliance score comes from letting other players defend your city while you defend theirs

## What High-Scoring Alliances Actually Optimize

### 1. Empty-city reinforcement play

The central strategy repeated by every serious guide is:

- send most or all of your troops out before the event starts
- avoid leaving kill-stealing troops in your city
- let reinforcements collect the kills in your city
- earn your own points by reinforcing others

This works because your city score is not reduced when allies defend your city, while reinforcers gain their own kill-based points.

## 2. Pairing or grouping by similar strength

Strong coordination usually comes from pairing players with roughly similar:

- troop tiers
- troop counts
- hero strength
- march capacity

This reduces situations where one player over-defends while another gets burned twice too early.

For larger alliances, this can evolve from simple pairs into fixed micro-groups with:

- 1 primary partner
- 1 backup partner
- 1 HQ fallback assignment

## 3. Prioritizing online players on online-only waves

Waves `7`, `14`, and `17` only hit online members.

Operational consequence:

- players who are online should be prioritized for reinforcement coverage
- offline targets are less valuable for these specific waves
- attendance status matters for planning, not just for visibility

## 4. HQ wave preparation matters

Waves `10` and `20` hit HQ only.

Operational consequence:

- alliances should pre-assign a subset of stronger players to HQ defense
- those players should not recall too early from normal reinforcement cycles
- there should be a clean transition plan after wave `9` and wave `19`

The official-style wiki guidance also notes that if both HQs exist, the higher-level `Plains HQ` is the target.

## 5. Do not heal during the event unless leadership intentionally calls for it

Multiple guides warn against healing during the event, because healed troops can return home and start stealing kills from reinforcers.

Operational consequence:

- the default alliance rule should be `do not heal during Viking Vengeance`
- if exceptions exist, they should be explicit and role-based

## 6. Keep only essential home defense leadership

Community guidance repeatedly points to keeping your strongest defensive setup at home and sending the rest out.

This is roster-dependent, so the planner should not hardcode hero names as a rule.
What is stable enough to retain is:

- players usually keep only their best defensive setup at home
- the rest of their value should be used in reinforcement play

## Recommended Alliance Playbook

### Before the event

- ask players to be online `10 to 15 minutes` early
- confirm online status for waves `7`, `14`, and `17`
- assign each player:
  - a primary reinforcement partner
  - a secondary or fallback partner
  - an HQ role if relevant
- remind players to:
  - recall gathering marches
  - stop nonessential external troop usage
  - empty their city as much as possible
  - avoid healing during the event

### During standard city waves

- reinforce assigned partners first
- prefer near-distance support when possible for faster adjustments
- monitor players close to a second failure
- re-route extra support to weak cities before they get removed from the event

### During HQ waves

- recall only the marches needed for HQ defense
- avoid recalling too early from the previous city wave
- send pre-assigned strong players first
- once HQ is stabilized, return surplus troops to normal reinforcement coverage

### If a player is offline

- do not plan around them for online-only waves
- if they will miss the event entirely, their best value is usually defensive availability at home rather than dynamic coordination

## Practical Rules Worth Productizing

These are the highest-value behavioral rules to surface in the app:

### Rule A: Empty your city

Short version:

- move your troops out before the event starts

Why:

- your own troops at home reduce the value of allied reinforcements

### Rule B: Reinforce others to score

Short version:

- your personal score scales best when you defend other players

### Rule C: Stay online for waves 7, 14, and 17

Short version:

- these are online-only waves, so availability directly changes planning

### Rule D: Be ready for HQ on waves 10 and 20

Short version:

- HQ needs assigned defenders, not ad-hoc recall chaos

### Rule E: Do not heal during the event

Short version:

- healing can bring kill-stealing troops back into your city

## Product Implications For Kingshot Vikings Planner

The event logic supports the following roadmap items very strongly:

### Multiple partners

The current single-partner model is too narrow for Viking Vengeance.

More realistic coordination needs:

- primary partner
- fallback partner
- optional HQ assignment or micro-group membership

### Automatic optimized groups

This is one of the highest-value future features.

Reason:

- the event rewards balanced exchanges between players of similar strength
- the app already stores useful inputs:
  - troop counts
  - strongest tiers
  - availability

A future grouping engine can likely optimize around:

- availability
- total troop count
- highest troop tier
- partner preferences
- HQ defender pool

### Animated warning banners

This is justified by the event’s most repeated failure mode:

- players forget to empty troops from their city

The warning should be impossible to miss near event time, with messaging such as:

- `Empty your city before Viking Vengeance starts.`
- `Do not leave troops at home unless leadership assigned you to HQ defense.`
- `Do not heal during the event unless told otherwise.`

### In-app event guide

This is also justified.

The most useful version would be:

- short rules first
- wave pattern second
- alliance role checklist third
- deeper explanation behind an expandable section

## Suggested Future UI Blocks

If this guide gets integrated into the app later, the most useful blocks would be:

### Quick Rules

- Empty your city
- Reinforce others
- Stay online for 7 / 14 / 17
- Prepare HQ for 10 / 20
- Do not heal mid-event

### Wave Timeline

- 1-6: All members
- 7: Online only
- 8-9: All members
- 10: HQ
- 11-13: All members
- 14: Online only
- 15-16: All members
- 17: Online only
- 18-19: All members
- 20: HQ

### Group Assignment

- Primary partner
- Backup partner
- HQ role
- Attendance status

## Confidence Notes

High-confidence mechanics:

- 20 waves
- online-only waves 7, 14, 17
- HQ waves 10 and 20
- fail twice and that city stops getting targeted
- scoring value of reinforcement play

Medium-confidence tactical recommendations:

- exact ideal troop composition for every roster
- exact hero combinations by generation
- exact HQ troop ratios, since alliances adjust these to account level and roster depth

## Sources

- Kingshot Wiki | Fandom, `Viking Vengeance`
  - https://kingshot.fandom.com/wiki/Viking_Vengeance
- Kingshot Wiki, `Viking Vengeance`
  - https://kingshotwiki.com/events/viking-vengeance/
- Kingshot Guides, `Viking Vengeance Expert Guide`
  - https://kingshotguides.com/guide/viking-vengeance-expert-guide-beginner-to-advanced/

## Recommended Next Product Step

If this guide is used for the next implementation phase, the most logical order is:

1. support multiple partners / fallback partners
2. add event guide surfacing in the app
3. add animated event warnings
4. build automatic reinforcement group generation
