-- Local Toss compatibility change. No tables, columns, relations or rows are removed.
ALTER TABLE public.payments ALTER COLUMN provider_payment_id TYPE VARCHAR(200);
