# Local backups only
Actual databases, snapshots, archives, secrets and old source/media backups must not be committed here.
Keep them outside this repository. Only this guide is tracked.

Stop the local Next.js process before copying `.local/onepiece-db`; copy the entire directory, not individual files.
Use a timestamped external folder, retain the current `db/schema.sql` and fixture version with the copy,
and record its checksums locally. Backups may contain personal data and unlicensed reference media;
do not upload them to GitHub, Releases, Issues, Actions artifacts or Git LFS.

To restore, stop the server, preserve the current DB in another external folder, then restore the whole directory.
Restore only from a trusted backup matching this schema and fixture. Restarting does not restore in-memory login sessions.
The private crawl-backed local DB is incompatible with this synthetic publication fixture: do not swap them.
