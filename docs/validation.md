# Validation

Checked 2 November 2026.

- Local Linux, Node 22: npm install, npm test (71 assertions), npm run demo, npm run view and npm run docs passed.
- [GitHub verification run 41536542752](https://github.com/Enterprise-DNA-OS/audit-analysis-for-claude-code/actions/runs/41536542752): all five jobs passed. Windows and Linux each passed on Node 20 and 22. PostgreSQL 17 passed the same smoke tests.
- Repeated migrations and seed data were tested. Import controls, rejected imports, repeated imports, ambiguous names, exact decimal totals, reproducible sampling, immutable source records, separate review, drafts, complete backup and escaped HTML were checked.
- The generated review dashboard was opened in headless Chromium and visually inspected.
- Brand lint passed without errors. No author placeholders or prohibited prose remain.
- There are 33 recurring-job command recipes, excluding the commands directory README.

CI is manual, following the shared template. No recurring workflow was enabled. This test evidence covers fictional fixtures, not an audit conclusion or a production migration.
