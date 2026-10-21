# Local backups only
Actual databases, snapshots, archives, secrets and old source/media backups must not be committed here.
Keep them outside this repository. Only this guide is tracked.

The current default is `.local/onepiece-erd13-media-v3`; an explicit LOCAL_DB_PATH can select another directory.
Stop the corresponding local Next.js process before copying that complete directory, not individual files.
Earlier 26-table databases are preserved separately; do not overwrite them with the ERD13 database.
Use a timestamped external folder, retain the current `db/schema.sql` and fixture version with the copy,
and record its checksums locally. Backups may contain personal data and unlicensed reference media;
do not upload them to GitHub, Releases, Issues, Actions artifacts or Git LFS.

To restore, stop the server, preserve the current DB in another external folder, then restore the whole directory.
Restore only from a trusted backup matching this schema and fixture. Restarting does not restore in-memory login sessions.
The private crawl-backed DB and older public 26-table DBs are incompatible with this ERD13/local-media fixture: do not swap them.
