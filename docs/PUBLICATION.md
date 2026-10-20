# Publication boundary — 2026-10-20

This repository contains a new, single-snapshot Git history, not a push of the private local working folder or its old history.
The original team remote is unchanged. Upstream authorship is acknowledged in RIGHTS.md.

Copied: application source and required configuration, lockfile, ERD source/runtime SQL, current DB/provider tests and scripts.
Replaced: catalog, artwork, hero media, logo, favicon, business/contact footer, environment template and documentation.
Browser storage keys use the demo-v1 namespace to avoid associating the old private catalog’s numeric IDs with new products.
Removed from publication: third-party campaign media and product pictures, raw crawl data and external CDN references,
unused old mock product files, screenshots, old reports, full source backups, local DB, credentials, caches and original Git history.

The public fixture is not a faithful reconstruction of a reference store’s catalog. Both arms of a UI experiment must use the same fixture version.
The local original project and external backup folders are retained separately. Their assets must not be copied into public Git commits.
No blanket team-code license has been assigned. Educational/non-commercial purpose does not guarantee an infringement-free result.
