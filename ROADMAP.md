# Kingshot Vikings Planner Roadmap

Repository:

- Main repo: `https://github.com/Daneisra/Kingshot-Vikings-Planner`
- Issues: `https://github.com/Daneisra/Kingshot-Vikings-Planner/issues`

## Current priorities

### Fixes

- Verify the production API after the partner list SQL fix.
- Add server-side request logging around failed API calls to speed up debugging.
- Improve frontend error states so partial API failures are shown more clearly.
- Add a safer empty-state flow after weekly reset.

### UX improvements

- Add lightweight toast notifications instead of a single shared status banner.
- Add inline field validation feedback before submit.
- Add loading states for partner filter refresh and CSV export.
- Add optional dark/light theme tuning if a future visual refresh is needed.

### Admin features

- Add audit metadata for resets and deletions.
- Add optional admin session timeout.
- Add optional protected admin route with a real login instead of a single password header.
- Add import support for bulk player registration updates.

### Data and reporting

- Add weekly archive snapshots instead of destructive reset-only workflow.
- Add extra stats such as available-only totals and per-partner troop totals.
- Add sorting options for the registration list.
- Add richer CSV export formatting and date range selection if archives are introduced.

### Deployment and operations

- Add a production smoke-test step for the frontend homepage after deployment.
- Add optional database backup automation on the VPS.
- Add structured application logs and log rotation guidance.
- Add CI checks for TypeScript build and lint before production deploy.

## Suggested next milestones

### Milestone 1

- Stabilize production behavior.
- Add better diagnostics.
- Validate the GitHub Actions deployment flow end-to-end.

### Milestone 2

- Improve player entry speed and editing UX.
- Add sorting and better filtering.
- Improve admin safety around destructive actions.

### Milestone 3

- Add weekly archives.
- Add richer analytics.
- Add stronger admin authentication.

## How to use this file

- Use GitHub Issues for bugs, ideas, and feature requests.
- Use this roadmap to group future work into batches instead of mixing everything into ad hoc fixes.
- Update this file when a priority changes or when a milestone is completed.
