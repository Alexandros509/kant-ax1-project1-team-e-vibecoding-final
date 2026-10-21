import type { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
// Inspect the existing column instead of introducing an ERD-external migration table.
export async function migrateTossPaymentKey(
    db: Pick<PGlite, 'query' | 'exec'>,
) {
    const row = (
        await db.query<{ data_type: string; character_maximum_length: number }>(
            "SELECT data_type,character_maximum_length FROM information_schema.columns WHERE table_schema='public' AND table_name='payments' AND column_name='provider_payment_id'",
        )
    ).rows[0];
    if (
        row?.data_type !== 'character varying' ||
        ![100, 200].includes(row.character_maximum_length)
    )
        throw new Error(
            'Unexpected payments.provider_payment_id definition. Back up and inspect the local database.',
        );
    if (row.character_maximum_length === 200) return false;
    await db.exec(
        await readFile(
            path.join(
                process.cwd(),
                'db/migrations/202610210001_toss_payment_key.sql',
            ),
            'utf8',
        ),
    );
    return true;
}
