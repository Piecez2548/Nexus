# RB-011 — IP and licensing evidence baseline (2026-09-13)

This is an engineering inventory baseline for a future legal/IP review. It does not assert ownership, grant distribution rights or replace a signed chain-of-title record.

## Evidence available

- Nexus dependency SBOM: [nexus-npm-sbom.cdx.json](assurance/nexus-npm-sbom.cdx.json).
- The root `package-lock.json` contains 1,032 package entries. Declared licenses are predominantly MIT (840), ISC (76), Apache-2.0 (26), BSD-3-Clause (25), BSD-2-Clause (15), MPL-2.0 (14), BlueOak-1.0.0 (16), with the remaining entries using other declared SPDX expressions. The root private application package itself has no license field.
- Tools and DataLens maintain separate repository SBOM evidence referenced by [RB-022 separate deployables verification](RB_022_SEPARATE_DEPLOYABLES_VERIFICATION_2026-09-13.md).

## Open legal/IP actions

The repositories do not yet contain an approved root `LICENSE`/`NOTICE` or a signed assignment/permission record for source, generated brand assets, fonts, icons, images and sample data. A legal/IP owner must reconcile the SBOM and non-package assets, document attribution obligations and approve the license/distribution scope for each deployable. RB-011 remains **In Progress**.
