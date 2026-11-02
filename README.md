# Audit Analysis for Claude Code

Own your transaction tests and the evidence behind them. A database and coding agent for audit practitioners who want a focused alternative to Caseware IDEA.

Built by **Enterprise DNA**. Free under MIT. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free. Install the database and commands below. | Your fields, tests, documents and IDEA exports mapped across. | Installed, connected and operated through Omni by Enterprise DNA. Setup fee, then a retainer. |
| [Quick start](#quick-start) | [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=caseware-idea) | [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=caseware-idea) |

## What this covers

Import a transaction population, reconcile it to source controls, run reproducible tests, investigate exceptions and record review. Each saved run keeps its exact results, source fingerprint, parameters, purpose, preparer and due date. Every source row is preserved. Correct an error by adding a new snapshot.

The annual-bill research found five-figure institutional IDEA contracts, including a historical Australian maintenance reference. Current ANZ small-firm pricing is unverified and the vendor requests a sales conversation. [Research and scores](docs/research.md) distinguish procurement leads from verified prices. Nothing here implies a particular firm's savings.

IDEA has extensive analytics already. This is a smaller, inspectable base you own and extend. It does not convert IDEAScript or reproduce every IDEA function. [Scope and front-end limits](docs/why-no-front-end.md).

## Quick start

Requires Node 20 or newer. No database service required.

```bash
git clone https://github.com/Enterprise-DNA-OS/audit-analysis-for-claude-code.git
cd audit-analysis-for-claude-code
npm install
npm run demo
npm run audit -- duplicates --population="October payables"
npm run audit -- journals --population="October journals"
npm run view
npm run docs
```

The demo businesses and people are fictional. Start with `/attention`. The embedded PGlite database is stored in .data/db. For shared Postgres, set DATABASE_URL in your environment or local .env and run npm run migrate. Use a trusted server connection. No public access policies are created.

## Save a procedure and review it

```bash
npm run audit -- duplicates --population="October payables" --save --actor="Alex" --purpose="Check repeated invoices" --due=2026-12-01
npm run audit -- runs
npm run audit -- run <run-id>
npm run audit -- review <run-id> --actor="Chris" --conclusion="Supplier confirmation required" --evidence="workpapers/confirmation-1"
npm run audit -- draft-evidence <run-id>
```

Use the actual person's name. The second-person rule is firm policy, not a substitute for authentication. Reviews are append-only, so a correction adds a new dated review. Analytical runs are not audit opinions.

## The commands

| Command | What it does |
|---|---|
| `/engagements` | List engagement owners, currencies, due dates and pending reviews |
| `/populations` | List imported populations, independent totals and source fingerprints |
| `/profile` | Check dates, amounts and row counts before testing |
| `/duplicates` | Find repeated vendor, invoice and amount combinations |
| `/gaps` | Show missing intervals in numeric record identifiers |
| `/journals` | Find journal groups whose signed amounts do not balance |
| `/weekend` | List entries dated Saturday or Sunday |
| `/round-amounts` | List exact multiples at or above a chosen amount |
| `/high-value` | List entries whose absolute amount meets a threshold |
| `/missing-fields` | Find blank vendor, invoice, account or operator fields |
| `/period-check` | Find entries outside the engagement dates |
| `/sample` | Select a repeatable sample using a recorded seed |
| `/vendor-summary` | Compare gross and net amounts by supplier |
| `/account-summary` | Compare line counts and amounts by account |
| `/controls` | Reconcile imported counts and totals to independent controls |
| `/run-suite` | Save eight checks with their purpose, parameters and preparer |
| `/runs` | List saved procedures and their due dates |
| `/run` | Read a saved procedure, exact results and review history |
| `/review` | Record a review conclusion and evidence reference |
| `/reviews` | Read all recorded reviews |
| `/compliance` | Check independent controls and overdue documentation review |
| `/attention` | Find unreviewed procedures, oldest due first |
| `/weekly-review` | Draft the Monday review from engagements, attention and compliance |
| `/draft-evidence` | Draft a procedure record with results and review history |
| `/add` | Add an engagement with its currency and reporting dates |
| `/log` | Record a dated discussion or source-data note |
| `/history` | Read engagement discussion notes |
| `/import` | Import an IDEA Text Delimited CSV snapshot with explicit controls |
| `/export` | Write a complete JSON backup without overwriting another file |
| `/customise` | Change a field, test rule or house policy with a tested migration |
| `/new-view` | Add a read-only branded report from existing records |
| `/documents` | Render population reconciliations and test evidence packs |
| `/views` | Render the week and overdue review dashboard |

Every CLI read supports --json. Names match without case and identifiers match by prefix. Ambiguous matches list candidates and exit 1. Amounts use signed decimal units without separators. No currencies are combined. Export writes all records to a new JSON file and refuses overwrites.

## Ten questions to ask

IDEA can be configured for these tests too. Each question below is answered by this base today.

1. Which supplier invoice references repeat with the same amount? `duplicates`
2. Which record numbers are missing between the first and last entry? `gaps`
3. Which journal groups have a non-zero balance? `journals`
4. Which entries were posted on a weekend? `weekend`
5. Which entries are exact multiples of our chosen threshold? `round-amounts`
6. Which entries exceed the amount we want to investigate? `high-value`
7. Which entries have no supplier, invoice, account or operator? `missing-fields`
8. Which entries fall outside the engagement period? `period-check`
9. Can we select the same sample again from the same source? `sample`
10. Which saved procedures are overdue for review and lack independent controls? `attention + compliance`

## Your first hour: ten things to ask for

1. Put our business name and logo in brand.json.
2. Add our engagement dates, owner and currency.
3. Map our IDEA export fields using examples/mapping.json.
4. Test the import against independently obtained counts and totals.
5. Compare a known duplicate test with its saved IDEA result.
6. Check missing identifiers and out-of-period dates.
7. Select a repeatable sample and save its seed.
8. Draft the evidence pack for a reviewer.
9. Add our own threshold rule through /customise.
10. Draft the weekly review and export a backup.

## Switch a population in one command

```bash
npm run audit -- import idea --engagement="Harbour Wholesale FY26" --file=examples/idea-transactions.csv --name="Imported example" --actor="Your name" --map=examples/mapping.json --expected-count=3 --expected-net=2000.50
```

Use --dry-run first with real data. This imports CSV transaction values, preserves raw columns and rejects a mismatched count or total. [The replacement guide](docs/replace-caseware-idea.md) covers IDEA's export, field mapping and what needs separate migration.

## Documents and views

npm run docs renders population reconciliation sheets and saved-test evidence packs under docs-out/. npm run view renders views/week.html with engagements, review queues and control totals. Both use brand.json and escape record values. Reports are local and read-only. `/new-view` adds another question without building a front end.

## Test definitions and limits

Duplicate keys are trimmed, case-insensitive supplier and invoice plus exact signed amount. This flags candidates, not duplicate payments. Gaps report numeric intervals between observed endpoints, not missing records outside the range. Journal imbalance needs the complete debit and credit population. Weekend dates follow ISO Saturday and Sunday. Round amounts are exact multiples of a positive threshold. High value uses absolute signed amounts. Missing fields checks vendor, invoice, account and operator. Period checks use inclusive engagement boundaries. Samples rank SHA-256 of seed, source fingerprint and row number, without replacement; no statistical confidence is calculated.

A population fingerprint identifies the source bytes. The result fingerprint uses canonical JSON with sorted object keys. It detects accidental differences, not privileged database tampering. Raw files should be retained separately. No tax decisions, accounting changes, payments or messages are made.

## Compliance and validation

[Documentation controls](docs/compliance.md) cite NZ and Australian audit documentation standards and distinguish firm policy from legal requirements. The tool tracks evidence and review, not professional judgment.

npm test creates a temporary database, applies migrations twice, seeds twice and checks expected exception records, sampling, immutable history, review identity, atomic import rejection, controls, idempotency, ambiguous matches, draft output and HTML escaping. The workflow runs Node 20/22 on Windows and Linux, plus PostgreSQL 17. Test results from this build are recorded separately in docs/validation.md.

## Architecture

Plain Postgres schema under supabase/migrations. One database adapter, one CLI under scripts/audit.mjs, one recipe per recurring job under .claude/commands. No application server and no public endpoints. Local agent access is trusted. A shared deployment needs access and backup policies.

MIT, copyright 2026 Enterprise DNA. Built and run for businesses through [Omni by Enterprise DNA](https://enterprisedna.co/omni/instead-of/caseware-idea).
