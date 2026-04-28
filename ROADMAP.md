# Roadmap

Repository: `https://github.com/Daneisra/Kingshot-Vikings-Planner`

Issues: `https://github.com/Daneisra/Kingshot-Vikings-Planner/issues`

## Product Direction

Kingshot Vikings Planner should first become a polished, reliable Viking Vengeance coordination tool.

Once the Viking Planner is stable and comfortable for casual players, the project can grow into a lightweight alliance hub with dedicated pages for guides, planning, analytics, and other Kingshot events.

## Status

- `[x]` done
- `[ ]` planned

## Now

Focus: finish the Viking Vengeance planner without overloading the casual player experience.

### Stability

- [x] Fix the partner list query regression
- [ ] Verify production behavior after the partner list fix
- [x] Improve API error diagnostics for failed frontend requests
- [x] Make partial API failures clearer in the UI
- [x] Review weekly reset behavior and empty-state safety

### Viking Planner UX

- [x] Prevent troop level selection below 7
- [x] Add helper copy near troop inputs:
  `Only count your strongest 2 troop tiers.`
- [x] Improve inline validation before submit
- [x] Add better loading states for partner refresh and CSV export
- [x] Replace the shared status banner with lightweight toast notifications
- [x] Add list sorting options
- [x] Refine mobile editing flow for faster updates
- [x] Add animated warning banners to remind players to empty troops from their city before the event
- [x] Split the app into multiple pages to reduce the density of the main screen
- [x] Keep the main sign-up page focused on casual users with registrations, filters, and core stats only
- [x] Add a configurable admin warning banner for urgent event messages
- [x] Add a pre-event checklist for players:
  empty city troops, keep best heroes ready, check availability, join before event start
- [x] Add a Viking wave timeline with important waves highlighted
- [ ] Add a post-event result screen for score, difficulty, notes, and lessons learned

### Viking Groups

- [x] Allow selecting multiple regular partners for Viking Vengeance coordination
- [x] Generate optimized reinforcement groups automatically
- [x] Create a dedicated Auto Groups page instead of keeping group suggestions inside the admin workspace
- [ ] Improve Auto Groups with stronger balancing rules:
  partner preference, troop strength, personal score, availability, and fair distribution
- [ ] Add an HQ defense planner for wave 10 and wave 20 coordination
- [ ] Add role hints for each suggested group:
  rally lead, support, HQ helper, backup

### Viking Guide

- [x] Expose an in-app guide for the Viking Vengeance event
- [x] Create a dedicated Guide page for event rules, reminders, and Viking Vengeance references
- [ ] Expand the in-app guide with a short wave-by-wave strategy section
- [ ] Add a quick "common mistakes" section for casual players
- [ ] Add admin-editable guide notes for alliance-specific rules

## Next

Focus: strengthen admin tools, history, and reporting around Viking Vengeance.

### Admin

- [x] Add audit metadata for destructive actions
- [x] Add optional admin session timeout
- [x] Improve confirmation flow around resets and deletions
- [x] Replace the single password header with a stronger admin authentication flow
- [x] Support an optional secondary admin password
- [x] Create a dedicated admin page for archives, score trends, analytics, manual metrics, and admin-only tools
- [x] Add clearer navigation between the main planner page and the admin workspace
- [x] Add bulk import support for registrations
- [ ] Add admin settings for event configuration:
  event name, active season/week, difficulty level, alliance notes, warning banner text
- [ ] Add safer admin previews before weekly reset and archive creation

### Data / Reporting

- [x] Separate troop tiers from troop types in the data model and UI
- [x] Add available-only totals in stats
- [x] Add per-partner troop totals
- [x] Improve CSV export formatting
- [x] Add weekly archive snapshots instead of reset-only workflow
- [x] Add archive browsing and date-based exports
- [x] Add richer analytics across past weeks
- [x] Store weekly alliance score with each archive
- [x] Allow players to enter their personal Viking Vengeance score
- [x] Compare personal score changes between weeks
- [x] Track Viking Vengeance difficulty level per week
- [x] Compare score changes between weeks
- [x] Track notes about difficulty changes, for example moved up one level or level 11
- [x] Add a simple weekly event log for leadership decisions and context
- [x] Show historical score trend and average score gain per difficulty level
- [x] Add manual stat fields for extra alliance metrics that are not captured by sign-ups
- [ ] Add individual player profile summaries:
  latest score, best score, average score, participation history
- [ ] Add alliance score trend charts by difficulty level
- [ ] Add participation trend charts by week
- [ ] Add export options for archives, personal scores, and event notes

### Ops / Deployment

- [x] Ship SSH-based GitHub Actions deployment flow
- [x] Improve deploy-time diagnostics and failure visibility
- [x] Validate the deployment flow end to end in production
- [x] Expose the current deployed version in the UI and health check
- [x] Add a production smoke test after deployment
- [x] Add CI build and type validation before deploy
- [x] Add automated PostgreSQL backup guidance or scripts
- [x] Add structured logging and log rotation guidance
- [x] Add linting to CI before deploy
- [ ] Add a lightweight admin health panel:
  app version, API status, database status, latest deploy timestamp

## Later

Focus: evolve from a Viking-only planner into a broader alliance coordination hub.

### Alliance Hub

- [ ] Add an alliance home page with:
  announcements, event shortcuts, Discord link, GitHub issues link, and quick status cards
- [ ] Add a global event navigation model:
  Home, Viking Vengeance, Auto Groups, Guide, Admin, future events
- [ ] Add a simple alliance calendar for planned event times
- [ ] Add admin-managed alliance announcements
- [ ] Add a public guides page for alliance rules and event references
- [ ] Add a small "Support the project" section or button with PayPal and Ko-fi links

### Future Kingshot Events

- [ ] Add an Alliance Championship planning page:
  lanes, participants, preferred roles, strength, and notes
- [ ] Add a Castle Battle planning page:
  availability, rally leads, defenders, tower/castle roles, and rotation notes
- [ ] Add a Pitfall or Bear Hunt planning page:
  rally leaders, attendance, timing, and performance notes
- [ ] Add an Alliance Mobilization tracking page:
  participation, objectives, reminders, and weekly completion
- [ ] Add a PvP event planning page for team assignments and attendance

### Cross-Event Analytics

- [ ] Add player reliability metrics across events
- [ ] Add participation summaries by player and event type
- [ ] Add alliance-wide progress dashboards
- [ ] Add historical comparisons across Viking Vengeance and future events
- [ ] Add CSV exports per event module

## Notes

- Finish Viking Vengeance polish before expanding heavily into other events.
- Keep the main planner page fast and simple for casual users.
- Move advanced tools into dedicated pages so the app stays easy to understand.
- Use GitHub Issues for bugs, feature requests, and implementation discussion.
