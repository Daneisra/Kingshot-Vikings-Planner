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
- [ ] Add a production smoke test after deployment

## Next

### UX

- [x] Replace the shared status banner with lightweight toast notifications
- [x] Add list sorting options
- [x] Refine mobile editing flow for faster updates

### Admin

- [ ] Add audit metadata for destructive actions
- [x] Add optional admin session timeout
- [x] Improve confirmation flow around resets and deletions

### Data / Reporting

- [ ] Separate troop tiers from troop types in the data model and UI
- [ ] Add available-only totals in stats
- [ ] Add per-partner troop totals
- [ ] Improve CSV export formatting

## Later

### Admin

- [ ] Replace the single password header with a stronger admin authentication flow
- [ ] Add bulk import support for registrations

### Data / Reporting

- [ ] Add weekly archive snapshots instead of reset-only workflow
- [ ] Add archive browsing and date-based exports
- [ ] Add richer analytics across past weeks

### Ops / Deployment

- [ ] Add automated PostgreSQL backup guidance or scripts
- [ ] Add structured logging and log rotation guidance
- [ ] Add CI checks for linting and type validation before deploy

## Notes

- Use GitHub Issues for bugs, feature requests, and implementation discussion.
- Keep the roadmap focused on the current product and deployment model.
- Prefer small reliability and UX wins before expanding scope.
