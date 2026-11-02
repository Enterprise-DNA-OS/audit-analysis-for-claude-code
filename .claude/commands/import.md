---
description: "Import an IDEA Text Delimited CSV snapshot with explicit controls."
---

# import

Import an IDEA Text Delimited CSV snapshot with explicit controls.

Run `npm run audit -- import idea --engagement="Harbour Wholesale FY26" --file=examples/idea-transactions.csv --name="Imported example" --actor="Your name" --expected-count=3 --expected-net=2000.50 --dry-run`. Substitute the operator's actual record and dates. Use `--json` when reading results programmatically.

Read the relevant population and controls first. If a name matches more than one record, show the candidates and resolve it before continuing. Never infer a person's approval or use their name to create a review.

For saved test evidence, add `--save --actor="Actual preparer" --purpose="Specific purpose" --due=YYYY-MM-DD` to an analytical test. Read the results before summarising them. Label exceptions as investigation leads, not proof of fraud.

Drafts stay in `drafts/`. Report the result and the created file in chat. Never send, publish, delete or overwrite source records.
