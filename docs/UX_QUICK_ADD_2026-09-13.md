# Quick Add transaction entry — 2026-09-13

## Change

New transaction forms now focus on Type, item name, amount, category, and account. Date, time, recipient, notes, and recurring settings are available under an explicit “More” disclosure. Existing transactions and imported/template drafts open with their metadata visible for review.

## Preserved behavior

Category suggestions still run while the recipient input is collapsed, so merchant and recipient history can continue to pre-fill a category and account. Transfer validation and all existing fields remain unchanged.

## Validation

- Transactions integration: 16/16 passed.
- Recipient-learning and Transactions integration: 18/18 passed.
- Full Vitest: 451 files / 2,844 tests passed.
- TypeScript, Oxlint, release build and bundle budget passed.
