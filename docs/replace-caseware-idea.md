# Move transaction analysis from Caseware IDEA

1. In IDEA, open the population to carry across and use its Text Delimited export. Include field names, use comma separators and UTF-8, and export the full population. Keep the original IDEA file and scripts as an archive. [Caseware's release notes](https://webcontent.casewareafrica.com/CaseWare_Community/Product_Updates/CaseWare%20IDEA/CaseWare%20IDEA%20Release%20Notes%20Feb%202022.pdf) document that Text Delimited exports use CSV. The [IDEA 11.2 notes](https://www.caseware.net/fileadmin/audicon/media/dokumente/produkt-neuerungen/Neuerungen_IDEA_Version_11.2.pdf) document field names in text exports.
2. Record the independent population count and signed net total in one currency. Add an engagement with its reporting dates. Do not import a file mixing currencies. Map date fields to ISO YYYY-MM-DD and amounts to signed decimals with no grouping separator. Two decimal places are supported.
3. IDEA fields are user-defined. Inspect the headers. The example mapping is illustrative, not a universal IDEA layout. Map each canonical field to the exact exported header in a JSON file. Required fields are record_id, entry_date and amount. Optional fields are journal, invoice, vendor, account, entered_by and description. Missing optional values remain blank and appear in the missing-fields check.
4. Import once as a test, then run the same command without --dry-run:

```bash
npm run audit -- import idea --engagement="Harbour Wholesale FY26" --file=examples/idea-transactions.csv --name="Imported example" --actor="Your name" --map=examples/mapping.json --expected-count=3 --expected-net=2000.50 --dry-run
```

The import is atomic. A malformed row or wrong control total rejects the whole file. Identical reimports with the same name, mapping and controls do nothing. A changed file needs a new snapshot name. Duplicate transaction identifiers are preserved because duplicate detection needs to see them. Every imported row retains its original columns and source row number.

5. Run profile and controls. Reproduce one known IDEA test and compare every exception. Run the suite, record the review, render the evidence pack, and export a backup. A well-formed population moves in one command. Validating custom fields, historical routines and the team's decisions still takes work.

## What carries over

Transaction values, source row order, supplied identifiers and every raw CSV column. Common uppercase aliases are accepted. CSV supports quoted commas, escaped quotes, embedded newlines, BOM and CRLF. No external account or connection is needed after export.

## What needs separate work

IMD/IDM files, IDEAScript programs, SmartAnalyzer packs, formulas, virtual fields not included in the export, historical IDEA test logs, PDFs, attachments, access permissions and scheduled jobs are not converted. No accounting ledger is changed. No payment is made. Keep IDEA records for anything that has not been independently reconciled. Build equivalent routines with /customise before retiring an incumbent routine. This free base does not implement monetary-unit sampling, statistical confidence estimates, or IDEA's full function library.
