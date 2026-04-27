# Roadmap

Repository: `https://github.com/Daneisra/Kingshot-Vikings-Planner`

Issues: `https://github.com/Daneisra/Kingshot-Vikings-Planner/issues`

## Status

- `[x]` done
- `[ ]` planned

## Now

### Stability

- [x] Fix the partner list query regression
- [ ] Verify production behavior after the partner list fix
- [x] Improve API error diagnostics for failed frontend requests
- [x] Make partial API failures clearer in the UI
- [x] Review weekly reset behavior and empty-state safety

### UX

- [x] Prevent troop level selection below 7
- [x] Add helper copy near troop inputs:
  `Only count your strongest 2 troop tiers.`
- [x] Improve inline validation before submit
- [x] Add better loading states for partner refresh and CSV export

### Ops / Deployment

- [x] Ship SSH-based GitHub Actions deployment flow
- [x] Improve deploy-time diagnostics and failure visibility
- [x] Validate the deployment flow end to end in production
- [x] Expose the current deployed version in the UI and health check
- [x] Add a production smoke test after deployment
- [x] Add CI build and type validation before deploy

## Next

### UX

- [x] Replace the shared status banner with lightweight toast notifications
- [x] Add list sorting options
- [x] Refine mobile editing flow for faster updates
- [x] Add animated warning banners to remind players to empty troops from their city before the event
- [x] Split the app into multiple pages to reduce the density of the main screen
- [x] Keep the main sign-up page focused on casual users with registrations, filters, and core stats only
- [x] Create a dedicated Auto Groups page instead of keeping group suggestions inside the admin workspace
- [x] Create a dedicated Guide page for event rules, reminders, and Viking Vengeance references

### Admin

- [x] Add audit metadata for destructive actions
- [x] Add optional admin session timeout
- [x] Improve confirmation flow around resets and deletions
- [x] Replace the single password header with a stronger admin authentication flow
- [x] Support an optional secondary admin password
- [x] Create a dedicated admin page for archives, score trends, analytics, manual metrics, and admin-only tools
- [x] Add clearer navigation between the main planner page and the admin workspace

### Data / Reporting

- [x] Separate troop tiers from troop types in the data model and UI
- [x] Add available-only totals in stats
- [x] Add per-partner troop totals
- [x] Improve CSV export formatting

### Event Planning

- [x] Allow selecting multiple regular partners for Viking Vengeance coordination
- [x] Generate optimized reinforcement groups automatically
- [x] Expose an in-app guide for the Viking Vengeance event

## Later

### Admin

- [x] Add bulk import support for registrations

### Data / Reporting

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

### Ops / Deployment

- [x] Add automated PostgreSQL backup guidance or scripts
- [x] Add structured logging and log rotation guidance
- [ ] Add linting to CI before deploy

## Notes

- Use GitHub Issues for bugs, feature requests, and implementation discussion.
- Keep the roadmap focused on the current product and deployment model.
- Prefer small reliability and UX wins before expanding scope.
